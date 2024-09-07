use crate::chat::twitch::auth::ImplicitGrantFlow;
use crate::chat::twitch::helpers::auth_helpers::{construct_emote_url, get_chat_badges, parse_twitch_message, parse_twitch_tags};
use crate::chat::twitch::websocket_client::UserInformationState;
use crate::chat::websocket::ws_server::WebSocketServer;
use rand::distributions::Alphanumeric;
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use tauri::State;
use tokio_tungstenite::tungstenite::Message;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct RawTwitchResponse {
    pub(crate) raw_message: String,
    pub(crate) raw_emotes: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct TwitchResponse {
    pub(crate) id: String,
    pub(crate) timestamp: i64,
    pub(crate) display_name: String,
    pub(crate) user_color: String,
    pub(crate) user_badges: Vec<String>,
    pub(crate) message: String,
    pub(crate) emotes: Vec<(String, String)>,
    pub(crate) raw_data: RawTwitchResponse,
    pub(crate) tags: Vec<(String, String)>,
}

pub(crate) async fn message_processor(
    msg: String,
    ws_server: &WebSocketServer,
    auth_state: State<'_, ImplicitGrantFlow>,
    user_information: UserInformationState,
) {
    let msg = msg.to_string();
    let id: String = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(16)
        .map(char::from)
        .collect();

    if let Some((tags, username, content)) = parse_twitch_message(&*msg) {
        let parsed_tags = parse_twitch_tags(&tags);
        // Get badges from tags, can be none
        let ws_badges = parsed_tags
            .iter()
            .find(|(name, _)| *name == "badges")
            .map(|(_, value)| value);
        // Get color from tags, can be none
        let color = parsed_tags
            .iter()
            .find(|(name, _)| *name == "color")
            .map(|(_, value)| value);
        // Get display-name from tags, can be none
        let display_name = parsed_tags
            .iter()
            .find(|(name, _)| *name == "display-name")
            .map(|(_, value)| value);
        // Get emotes from tags, can be none
        let emotes = parsed_tags
            .iter()
            .find(|(name, _)| *name == "emotes")
            .map(|(_, value)| value)
            .unwrap();

        let mut msg = content.clone();
        let mut parsed_emotes: Vec<(String, String)> = Vec::new();
        if !emotes.is_empty() {
            // Calculate the emote position by using the :Number-Number on the emote tag
            let emotes_vec: Vec<&str> = emotes.split('/').collect();

            let mut emote_positions: Vec<(usize, usize, String)> = Vec::new();
            for emote in &emotes_vec {
                let emote_parts: Vec<&str> = emote.split(':').collect();
                let emote_positions_str = emote_parts[1];
                let emote_positions_vec: Vec<&str> =
                    emote_positions_str.split(',').collect();
                let start_end: Vec<usize> = emote_positions_vec[0]
                    .split('-')
                    .map(|x| x.parse().unwrap())
                    .collect();
                let emote_id = emote_parts[0];
                emote_positions.push((start_end[0], start_end[1], emote_id.to_string()));
            }

            // Get the equivalent emote name on the content
            let mut emote_image = String::new();
            for (start, end, emote_id) in emote_positions {
                // Name, not id
                let emote_name = &content[start..end + 1];
                let emote_url = construct_emote_url(&emote_id);
                parsed_emotes.push((emote_name.to_string(), emote_url.clone()));
                emote_image = format!(
                    "<img id=\"{}\" src=\"{}\" alt=\"{}\" />",
                    emote_name, emote_url, emote_name
                );
                msg = msg.replace(emote_name, &emote_image);
            }
        }

        match &user_information {
            UserInformationState::Regular(user_info) => {
                let badges = get_chat_badges(auth_state.clone(), user_info).await;

                let mut user_badges: Vec<String> = Vec::new();
                for badge_set in badges.data {
                    // From ws_badges we get: Some("broadcaster/1,subscriber/18,glitchcon2020/1") etc.
                    // We need to split the badges by comma and then by slash to get the badge name and version
                    let ws_badges_vec: Vec<&str> = ws_badges.unwrap().split(',').collect();

                    if ws_badges_vec.is_empty() {
                        continue;
                    }

                    for ws_badge in ws_badges_vec {
                        let ws_badge_parts: Vec<&str> = ws_badge.split('/').collect();
                        let ws_badge_name = ws_badge_parts[0];
                        let ws_badge_id = ws_badge_parts[1];

                        let get_matching_badge = badge_set.set_id == ws_badge_name;

                        if get_matching_badge {
                            let badge_version = badge_set
                                .versions
                                .iter()
                                .find(|version| version.id == ws_badge_id);

                            if let Some(badge_version) = badge_version {
                                user_badges.push(badge_version.image_url_4x.clone());
                            }
                        }
                    }
                }

                let response = TwitchResponse {
                    id,
                    timestamp: chrono::Local::now().timestamp_millis(),
                    display_name: display_name.unwrap_or(&username).to_string(),
                    user_color: color.unwrap_or(&"".into()).to_string(),
                    user_badges,
                    message: msg,
                    emotes: parsed_emotes,
                    raw_data: RawTwitchResponse {
                        raw_message: content,
                        raw_emotes: emotes.to_string(),
                    },
                    tags: parsed_tags,
                };

                // Add "platform" to the websocket response
                let ws_response = json!({
                            "platform": "twitch",
                            "data": response
                        });

                ws_server
                    .broadcast(Message::Text(serde_json::to_string(&ws_response).unwrap()))
                    .await;
            }
            UserInformationState::Skipped(_) => {
                let response = TwitchResponse {
                    id,
                    timestamp: chrono::Local::now().timestamp_millis(),
                    display_name: display_name.unwrap_or(&username).to_string(),
                    user_color: color.unwrap_or(&"".into()).to_string(),
                    user_badges: Vec::new(),
                    message: msg,
                    emotes: parsed_emotes,
                    raw_data: RawTwitchResponse {
                        raw_message: content,
                        raw_emotes: emotes.to_string(),
                    },
                    tags: parsed_tags,
                };

                let ws_response = json!({
                            "platform": "twitch",
                            "data": response
                        });

                ws_server
                    .broadcast(Message::Text(serde_json::to_string(&ws_response).unwrap()))
                    .await;
            }
        }
    }
}

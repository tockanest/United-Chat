use crate::chat::twitch::auth::{ImplicitGrantFlow, UserInformation};
use crate::chat::twitch::helpers::auth_helpers::{construct_emote_url, get_chat_badges, parse_twitch_message, parse_twitch_tags};
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;
use tokio_tungstenite::connect_async;

#[derive(Serialize, Deserialize, Clone, Debug)]
struct RawTwitchResponse {
    raw_message: String,
    raw_emotes: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct TwitchResponse {
    timestamp: String,
    display_name: String,
    user_color: String,
    user_badges: Vec<String>,
    message: String,
    emotes: Vec<(String, String)>,
    raw_data: RawTwitchResponse,
    tags: Vec<(String, String)>,
}

#[derive(Default)]
pub(crate) struct TwitchWebsocketChat {
    pub(crate) ws_stream_initialized: Arc<Mutex<bool>>,
}

#[tauri::command]
pub(crate) async fn connect_twitch_websocket(app: AppHandle) {
    let websocket_connection = Arc::clone(&app.state::<TwitchWebsocketChat>().ws_stream_initialized);

    {
        let mut ws_initialized = websocket_connection.lock().await;
        if *ws_initialized {
            return;
        }

        *ws_initialized = true;
    }

    let (mut ws_stream, _) = connect_async("wss://irc-ws.chat.twitch.tv:443")
        .await
        .unwrap_or_else(|e| panic!("Error during handshake: {}", e));

    ws_stream
        .send("NICK justinfan1234".into())
        .await.unwrap();

    while let Some(msg) = ws_stream.next().await {
        let msg = msg.unwrap();

        if msg.to_string().contains("PING") {
            ws_stream.send("PONG :tmi.twitch.tv".into()).await.unwrap();
        } else if msg.to_string().contains("Welcome, GLHF!") {
            ws_stream.send("CAP REQ :twitch.tv/tags".into()).await.unwrap();
            ws_stream.send("JOIN #nixyyi".into()).await.unwrap();
        } else if msg.to_string().contains("PRIVMSG") {
            let msg = msg.to_string();
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

                let state = app.state::<ImplicitGrantFlow>();

                // Check if the setup was skipped by checking the "skipped" flag on the state: skipped: Option<bool>
                if let Some(skipped) = state.skipped {
                    if !skipped {
                        let user_information = app.state::<UserInformation>();
                        let badges = get_chat_badges(state.clone(), user_information.clone()).await;

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
                            timestamp: chrono::Utc::now().to_rfc3339(),
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

                        app.emit_to("main", "chat-data::twitch", response).unwrap();
                    }
                }
            }
        }
    }
}
use crate::chat::twitch::auth::{ImplicitGrantFlow, UserInformation};
use futures::{SinkExt, StreamExt};
use regex::Regex;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};
use tokio_tungstenite::connect_async;

fn parse_twitch_message(message: &str) -> Option<(String, String, String)> {
    let re = Regex::new(r"@(?P<tags>[^ ]*) (?P<username>[^!]+)!.* PRIVMSG #[^ ]* :(?P<message>.*)")
        .unwrap();
    if let Some(caps) = re.captures(message) {
        let tags = &caps["tags"];
        let username = &caps["username"];
        let message = &caps["message"];

        return Some((tags.to_string(), username.to_string(), message.to_string()));
    }
    None
}

fn parse_twitch_tags(tags_str: &str) -> Vec<(&str, &str)> {
    let tags_vec: Vec<&str> = tags_str.split(';').collect();
    let mut tags: Vec<(&str, &str)> = Vec::new();
    for tag in tags_vec {
        let mut tag_parts = tag.splitn(2, '=');
        let name = tag_parts.next().unwrap_or("");
        let value = tag_parts.next().unwrap_or("");
        // Return a vector of tuples with the tag name and value
        tags.push((name, value));
    }

    tags
}

fn construct_emote_url(emote_id: &str) -> String {
    format!(
        "https://static-cdn.jtvnw.net/emoticons/v2/{}/default/dark/1.0",
        emote_id
    )
}

#[derive(Serialize, Deserialize, Debug)]
struct TwitchBadgeVersion {
    id: String,
    image_url_1x: String,
    image_url_2x: String,
    image_url_4x: String,
    title: String,
    description: String,
    click_action: String,
    click_url: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct TwitchBadgeSet {
    set_id: String,
    versions: Vec<TwitchBadgeVersion>,
}

#[derive(Serialize, Deserialize, Debug)]
struct TwitchBadgesResponse {
    data: Vec<TwitchBadgeSet>,
}

async fn get_chat_badges(auth_state: State<'_, ImplicitGrantFlow>, user_state: State<'_, UserInformation>) {
    let client = reqwest::Client::new();
    println!("{}", user_state.clone().user_id);
    let req = client
        .get(format!("https://api.twitch.tv/helix/chat/badges?broadcaster_id={}", "228386227"))
        .header("Client-ID", "h3yvglc6y3kmtrzyq7it20z7vi5sa2")
        .header("Authorization", format!("Bearer {}", auth_state.access_token))
        .send()
        .await
        .unwrap();

    println!("{:?}", req.text().await.unwrap());
    // let badges: TwitchBadgesResponse = req.json().await.unwrap();
    //
    // badges
}

struct TwitchResponse {
    timestamp: String,
    display_name: String,
    user_color: String,
    user_badges: Vec<String>,
    message: String,
    tags: Vec<(String, String)>,
}

#[tauri::command]
pub(crate) async fn connect_twitch_websocket(app: AppHandle) {
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
                let badges = parsed_tags
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
                    for (start, end, emote_id) in emote_positions {
                        // Name, not id
                        let emote_name = &content[start..end + 1];
                        let emote_url = construct_emote_url(&emote_id);
                        let emote_image = format!(
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
                        // println!("{:?}", badges);
                    }
                }
            }
        }
    }
}

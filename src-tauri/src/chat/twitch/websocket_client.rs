use futures::{SinkExt, StreamExt};
use rand::prelude::IteratorRandom;
use regex::Regex;
use tauri::AppHandle;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Result;

struct TwitchState {
    access_token: String,
    expires_in: u64,
    refresh_token: String,
    scope: Vec<String>,
    token_type: String,
}

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

struct TwitchResponse {
    timestamp: String,
    display_name: String,
    user_color: String,
    user_badges: Vec<String>,
    message: String,
    tags: Vec<(String, String)>,
}

#[tauri::command]
pub(crate) async fn connect(app: AppHandle) -> Result<()> {
    let (mut ws_stream, _) = connect_async("wss://irc-ws.chat.twitch.tv:443")
        .await
        .unwrap_or_else(|e| panic!("Error during handshake: {}", e));

    let usernames = vec![
        "EliteMild",
        "AfflictLung",
        "BeetrootGenuine",
        "SundressImpressive",
        "ThymeNext",
        "BlairStick",
        "MainsheetGrave",
        "HeadlineEagle",
        "TruthWaist",
    ];

    let username = usernames.iter().choose(&mut rand::thread_rng()).unwrap();

    ws_stream
        .send(format!("NICK {:?}", username).into())
        .await?;

    while let Some(msg) = ws_stream.next().await {
        let msg = msg?;

        if msg.to_string().contains("PING") {
            ws_stream.send("PONG :tmi.twitch.tv".into()).await?;
        } else if msg.to_string().contains("Welcome, GLHF!") {
            ws_stream.send("CAP REQ :twitch.tv/tags".into()).await?;
            ws_stream.send("JOIN #nixyyi".into()).await?;
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

                let app_clone = app.clone();
            }
        }
    }
    Ok(())
}

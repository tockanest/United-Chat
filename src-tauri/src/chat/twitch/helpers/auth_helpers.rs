use crate::chat::twitch::auth::{ImplicitGrantFlow, UserInformation};
use regex::Regex;
use serde::{Deserialize, Serialize};
use tauri::State;

pub(crate) fn parse_twitch_message(message: &str) -> Option<(String, String, String)> {
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

pub(crate) fn parse_twitch_tags(tags_str: &str) -> Vec<(String, String)> {
    let tags_vec: Vec<&str> = tags_str.split(';').collect();
    let mut tags: Vec<(String, String)> = Vec::new();
    for tag in tags_vec {
        let mut tag_parts = tag.splitn(2, '=');
        let name = tag_parts.next().unwrap_or("").to_string();
        let value = tag_parts.next().unwrap_or("").to_string();
        // Return a vector of tuples with the tag name and value
        tags.push((name, value));
    }

    tags
}

pub(crate) fn construct_emote_url(emote_id: &str) -> String {
    format!(
        "https://static-cdn.jtvnw.net/emoticons/v2/{}/default/dark/1.0",
        emote_id
    )
}

#[derive(Serialize, Deserialize, Debug)]
pub(crate) struct TwitchBadgeVersion {
    pub(crate) id: String,
    pub(crate) image_url_1x: String,
    pub(crate) image_url_2x: String,
    pub(crate) image_url_4x: String,
    pub(crate) title: String,
    pub(crate) description: String,
    pub(crate) click_action: String,
    pub(crate) click_url: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub(crate) struct TwitchBadgeSet {
    pub(crate) set_id: String,
    pub(crate) versions: Vec<TwitchBadgeVersion>,
}

#[derive(Serialize, Deserialize, Debug)]
pub(crate) struct TwitchBadgesResponse {
    pub(crate) data: Vec<TwitchBadgeSet>,
}

pub(crate) async fn get_chat_badges(
    auth_state: State<'_, ImplicitGrantFlow>,
    user_state: State<'_, UserInformation>,
) -> TwitchBadgesResponse {
    let client = reqwest::Client::new();

    let req = client
        .get(format!(
            "https://api.twitch.tv/helix/chat/badges?broadcaster_id={}",
            user_state.user_id
        ))
        .header("Client-ID", "h3yvglc6y3kmtrzyq7it20z7vi5sa2")
        .header(
            "Authorization",
            format!("Bearer {}", auth_state.access_token),
        )
        .send()
        .await
        .unwrap();

    let badges: TwitchBadgesResponse = req.json().await.unwrap();

    badges
}

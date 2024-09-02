use crate::chat::youtube::structs::message_renderer_structs::{Action, AuthorBadge, ChatItem, MessageRendererBase, MessageRun, Renderer};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Thumbnail {
    url: String,
    width: u32,
    height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Channel {
    id: Option<String>,
    name: Option<String>,
    thumbnails: Option<Thumbnail>,
    subscriber_count: Option<u32>,

}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct BaseVideoProperties {
    id: Option<String>,
    title: Option<String>,
    thumbnails: Option<Thumbnail>,
    description: Option<String>,
    channel: Option<Channel>,
    upload_date: Option<String>,
    view_count: Option<u32>,
    like_count: Option<u32>,
    is_live_content: Option<bool>,
    tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct VideoInfo {
    is_replay: Option<bool>,
    api_key: Option<String>,
    stream_type: Option<String>,
    continuation: Option<String>,
    scheduled_start_time: Option<String>,
    client_version: Option<String>,
    video_id: Option<String>,
}

impl BaseVideoProperties {
    fn retrieve_video_info(html: &str) -> Result<VideoInfo, String> {
        let mut video_info = VideoInfo {
            is_replay: None,
            api_key: None,
            stream_type: None,
            continuation: None,
            scheduled_start_time: None,
            client_version: None,
            video_id: None,
        };

        let re = regex::Regex::new(r#""isReplay"\s*:\s*(true)"#).unwrap();
        if let Some(replay) = re.captures(html).and_then(|caps| caps.get(1).map(|m| m.as_str().to_string())) {
            if replay == "true" {
                return Err("The video is a replay and cannot be set as a live video".to_string());
            }
            video_info.is_replay = Some(true);
        }

        let re = regex::Regex::new(r#""INNERTUBE_API_KEY"\s*:\s*"([^"]+)""#).unwrap();
        video_info.api_key = re.captures(html).and_then(|caps| caps.get(1).map(|m| m.as_str().to_string()));

        if video_info.api_key.is_none() {
            return Err("Cannot find the API key".to_string());
        }

        let re = regex::Regex::new(r#""continuation"\s*:\s*"([^"]+)""#).unwrap();
        video_info.continuation = re.captures(html).and_then(|caps| caps.get(1).map(|m| m.as_str().to_string()));

        if let Some(continuation) = &video_info.continuation {
            video_info.stream_type = Some("live".to_string());
        } else {
            let re = regex::Regex::new(r#""scheduledStartTime"\s*:\s*"([^"]+)""#).unwrap();
            video_info.scheduled_start_time = re.captures(html).and_then(|caps| caps.get(1).map(|m| m.as_str().to_string()));

            if video_info.scheduled_start_time.is_some() {
                video_info.stream_type = Some("scheduled".to_string());
            } else {
                return Err("Cannot find the continuation".to_string());
            }
        }

        let re = regex::Regex::new(r#""clientVersion"\s*:\s*"([\d.]+)""#).unwrap();
        video_info.client_version = re.captures(html).and_then(|caps| caps.get(1).map(|m| m.as_str().to_string()));

        if video_info.client_version.is_none() {
            return Err("Cannot find the client version".to_string());
        }

        let re = regex::Regex::new(r#"<link\s+rel="canonical"\s+href="https://www\.youtube\.com/watch\?v=([^"]+)""#).unwrap();
        video_info.video_id = re.captures(html).and_then(|caps| caps.get(1).map(|m| m.as_str().to_string()));

        if video_info.video_id.is_none() {
            return Err("Cannot find the video ID".to_string());
        }

        Ok(video_info)
    }

    async fn get_video(id: &str) -> VideoInfo {
        let request_url = format!("https://www.youtube.com/watch?v={}", id);
        let response = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; rv:78.0) Gecko/20100101 Firefox/78.0")
            .build()
            .unwrap()
            .get(&request_url)
            .send()
            .await
            .unwrap();

        // Get the raw data
        let response = response.text().await.unwrap();
        let raw_data = Self::retrieve_video_info(&response).unwrap();
        raw_data
    }

    pub fn renderer_from_action(
        action: Action,
    ) -> Option<Renderer> {
        action.add_chat_item_action.and_then(|add_chat_item_action| {
            let item = add_chat_item_action.item;
            match item {
                ChatItem {
                    live_chat_text_message_renderer: Some(renderer),
                    ..
                } => Some(Renderer::LiveChatTextMessageRenderer(renderer)),
                ChatItem {
                    live_chat_paid_message_renderer: Some(renderer),
                    ..
                } => Some(Renderer::LiveChatPaidMessageRenderer(renderer)),
                ChatItem {
                    live_chat_paid_sticker_renderer: Some(renderer),
                    ..
                } => Some(Renderer::LiveChatPaidStickerRenderer(renderer)),
                ChatItem {
                    live_chat_membership_item_renderer: Some(renderer),
                    ..
                } => Some(Renderer::LiveChatMembershipItemRenderer(renderer)),
                _ => None,
            }
        })
    }

    fn get_author_name(base: &MessageRendererBase) -> Option<String> {
        base.author_name.as_ref().map(|name| name.simple_text.clone())
    }

    fn get_author_badges(base: &MessageRendererBase) -> Vec<AuthorBadge> {
        base.author_badges.as_ref().map(|badges| badges.clone()).unwrap_or_else(|| Vec::new())
    }

    fn parse_message_action(data: Action) {
        let renderer = Self::renderer_from_action(data.clone());

        if renderer.is_none() {
            return;
        }

        let renderer = renderer.unwrap();

        let mut message: Vec<MessageRun> = Vec::new();
        let renderer_clone = renderer.clone();
        match renderer_clone {
            Renderer::LiveChatTextMessageRenderer(renderer) => {
                let message_text = renderer.message.runs;
                for run in message_text {
                    match run {
                        MessageRun::MessageText(text) => {
                            message.push(MessageRun::MessageText(text));
                        }
                        MessageRun::MessageEmoji(emoji) => {
                            message.push(MessageRun::MessageEmoji(emoji));
                        }
                    }
                }
            }
            Renderer::LiveChatMembershipItemRenderer(renderer) => {
                let message_text = renderer.header_subtext.runs;
                for run in message_text {
                    match run {
                        MessageRun::MessageText(text) => {
                            message.push(MessageRun::MessageText(text));
                        }
                        MessageRun::MessageEmoji(emoji) => {
                            message.push(MessageRun::MessageEmoji(emoji));
                        }
                    }
                }
            }
            _ => {}
        }

        let author_name_text = match renderer.clone() {
            Renderer::LiveChatTextMessageRenderer(renderer) => Self::get_author_name(&renderer.base),
            Renderer::LiveChatPaidMessageRenderer(renderer) => Self::get_author_name(&renderer.base),
            Renderer::LiveChatPaidStickerRenderer(renderer) => Self::get_author_name(&renderer.base),
            Renderer::LiveChatMembershipItemRenderer(renderer) => Self::get_author_name(&renderer.base),
        }.unwrap_or_else(|| "".to_string());

        let author_badges = match renderer.clone() {
            Renderer::LiveChatTextMessageRenderer(renderer) => Self::get_author_badges(&renderer.base),
            Renderer::LiveChatPaidMessageRenderer(renderer) => Self::get_author_badges(&renderer.base),
            Renderer::LiveChatPaidStickerRenderer(renderer) => Self::get_author_badges(&renderer.base),
            Renderer::LiveChatMembershipItemRenderer(renderer) => Self::get_author_badges(&renderer.base),
        };

        // LEFT OFF HERE
    }

    async fn get_live_chat(data: VideoInfo) -> Result<(), String> {
        // let mut chat = Vec::new();
        let continuation = data.continuation.unwrap();
        let api_key = data.api_key.unwrap();
        let client_version = data.client_version.unwrap();

        let url = format!("https://www.youtube.com/youtubei/v1/live_chat/get_live_chat?key={}", api_key);

        let request = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; rv:78.0) Gecko/20100101 Firefox/78.0")
            .build()
            .unwrap()
            .post(&url)
            .json(&json!({
                "context": {
                    "client": {
                        "clientName": "WEB",
                        "clientVersion": client_version,
                    }
                },
                "continuation": continuation,
            }))
            .send()
            .await
            .unwrap();

        let response = request.text().await.unwrap();
        let response: serde_json::Value = serde_json::from_str(&response).unwrap();
        let response = response["response"]["continuationContents"]["liveChatContinuation"]["actions"].as_array().unwrap();

        if response.is_empty() {
            return Err("Cannot find the chat".to_string());
        }


        Ok(())
    }
}

impl From<Item> for Option<ChatRenderer> {
    fn from(item: Item) -> Self {
        match item {
            Item { live_chat_text_message_renderer: Some(renderer), .. } => Some(ChatRenderer::LiveChatTextMessageRenderer(renderer)),
            Item { live_chat_paid_message_renderer: Some(renderer), .. } => Some(ChatRenderer::LiveChatPaidMessageRenderer(renderer)),
            Item { live_chat_paid_sticker_renderer: Some(renderer), .. } => Some(ChatRenderer::LiveChatPaidStickerRenderer(renderer)),
            Item { live_chat_membership_item_renderer: Some(renderer), .. } => Some(ChatRenderer::LiveChatMembershipItemRenderer(renderer)),
            _ => None,
        }
    }
}

mod test {
    use super::*;

    #[tokio::test]
    async fn test_get_video() {
        let video = BaseVideoProperties::get_video("8OlZQTSq63I").await;
        println!("{:?}", video);
    }

    #[tokio::test]
    async fn test_get_live_chat() {
        let video = BaseVideoProperties::get_video("zvRzUKSua90").await;
        BaseVideoProperties::get_live_chat(video).await;
    }
}


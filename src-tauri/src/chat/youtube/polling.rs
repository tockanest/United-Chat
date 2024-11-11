use crate::chat::websocket::ws_server::WebSocketServer;
use crate::chat::youtube::structs::youtube_response::YoutubeResponse;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use crate::chat::youtube::video_functions::{get_video, HTTP_CLIENT};
use tokio_tungstenite::tungstenite::Message;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct VideoInfo {
    pub(crate) is_replay: Option<bool>,
    pub(crate) api_key: Option<String>,
    pub(crate) stream_type: Option<String>,
    pub(crate) continuation: Option<String>,
    pub(crate) scheduled_start_time: Option<String>,
    pub(crate) client_version: Option<String>,
    pub(crate) video_id: Option<String>,
    pub(crate) video_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct VideoError {
    pub(crate) video_id: String,
    pub(crate) error: String,
}

// Additional structs and improvements for message handling
#[derive(Debug, Clone)]
struct MessageCache {
    messages: VecDeque<String>,
    capacity: usize,
}

impl MessageCache {
    fn new(capacity: usize) -> Self {
        Self {
            messages: VecDeque::with_capacity(capacity),
            capacity,
        }
    }

    fn add_message(&mut self, id: String) -> bool {
        if self.messages.contains(&id) {
            return false;
        }

        if self.messages.len() >= self.capacity {
            self.messages.pop_front();
        }

        self.messages.push_back(id);
        true
    }
}

async fn get_live_chat(data: VideoInfo) -> Result<(Vec<YoutubeResponse>, String), String> {
    let continuation = data.continuation.clone().ok_or("No continuation found")?;
    let api_key = data.api_key.clone().ok_or("No API key found")?;
    let client_version = data
        .client_version
        .clone()
        .ok_or("No client version found")?;

    let url = format!(
        "https://www.youtube.com/youtubei/v1/live_chat/get_live_chat?key={}",
        api_key
    );

    let response = HTTP_CLIENT
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
        .map_err(|e| format!("Failed to send request: {}", e))?;

    let json_response: Value = response
        .text()
        .await
        .map_err(|e| format!("Failed to get response text: {}", e))
        .and_then(|text| {
            serde_json::from_str(&text).map_err(|e| format!("Failed to parse JSON: {}", e))
        })?;

    let action = json_response["continuationContents"]["liveChatContinuation"]["actions"]
        .as_array()
        .ok_or("No actions found")?;

    if action.is_empty() {
        return Err("Cannot find the chat".to_string());
    }

    let continuation_data = json_response["continuationContents"]["liveChatContinuation"]
        ["continuations"]
        .as_array()
        .ok_or("No continuation data found")?;

    if continuation_data.is_empty() {
        return Err(format!(
            "Cannot find continuation for id: {:?}",
            data.video_id
        ));
    }

    let new_continuation =
        if let Some(timed) = continuation_data[0]["timedContinuationData"].as_object() {
            timed["continuation"]
                .as_str()
                .ok_or("No timed continuation found")?
        } else {
            continuation_data[0]["invalidationContinuationData"]["continuation"]
                .as_str()
                .ok_or("No invalidation continuation found")?
        };

    Ok((
        parse_message_type(action).unwrap(),
        new_continuation.to_string(),
    ))
}

fn parse_message_type(data: &[Value]) -> Result<Vec<YoutubeResponse>, ()> {
    let mut responses = Vec::new();

    // Efficiently collect chat items
    let chat_items: Vec<&Value> = data
        .iter()
        .filter_map(|x| x.get("addChatItemAction"))
        .collect();

    for item in chat_items {
        if let Some(message) = item
            .get("item")
            .and_then(|i| i.get("liveChatTextMessageRenderer"))
            .and_then(|m| m.as_object())
        {
            // Extract message components efficiently
            let author_name = message
                .get("authorName")
                .and_then(|a| a.get("simpleText"))
                .and_then(|a| a.as_str())
                .unwrap_or("Unknown Author")
                .to_string();

            // Process badges with iterator chaining
            let badges_urls: Vec<String> = message
                .get("authorBadges")
                .and_then(|b| b.as_array())
                .map(|badges| {
                    badges
                        .iter()
                        .filter_map(|x| x.get("liveChatAuthorBadgeRenderer"))
                        .filter_map(|b| b.get("customThumbnail"))
                        .filter_map(|c| c.get("thumbnails"))
                        .filter_map(|t| t.get(0))
                        .filter_map(|t| t.get("url"))
                        .filter_map(|u| u.as_str())
                        .map(String::from)
                        .collect()
                })
                .unwrap_or_default();

            // Efficiently process message text and emojis
            let message_text = message
                .get("message")
                .and_then(|m| m.get("runs"))
                .and_then(|r| r.as_array())
                .map(|runs| {
                    runs.iter()
                        .filter_map(|item| {
                            if let Some(text) = item.get("text").and_then(|t| t.as_str()) {
                                Some(text.to_string())
                            } else if let Some(emoji) =
                                item.get("emoji").and_then(|e| e.as_object())
                            {
                                let emoji_url = emoji
                                    .get("image")
                                    .and_then(|i| i.get("thumbnails"))
                                    .and_then(|t| t.get(0))
                                    .and_then(|t| t.get("url"))
                                    .and_then(|u| u.as_str())
                                    .unwrap_or("");

                                let emoji_name = emoji
                                    .get("image")
                                    .and_then(|i| i.get("accessibility"))
                                    .and_then(|a| a.get("accessibilityData"))
                                    .and_then(|d| d.get("label"))
                                    .and_then(|l| l.as_str())
                                    .unwrap_or("");

                                Some(format!(
                                    r#"<img id="{}" class="w-6 h-6" src="{}" alt="{}" />"#,
                                    emoji_name, emoji_url, emoji_name
                                ))
                            } else {
                                None
                            }
                        })
                        .collect::<Vec<String>>()
                        .join(" ")
                })
                .unwrap_or_default();

            let response = YoutubeResponse {
                id: message
                    .get("id")
                    .and_then(|t| t.as_str())
                    .unwrap_or("Unknown ID")
                    .to_string(),
                author_id: message
                    .get("authorExternalChannelId")
                    .and_then(|t| t.as_str())
                    .unwrap_or("Unknown Author ID")
                    .to_string(),
                author_name,
                author_badges: badges_urls,
                message: message_text,
                message_emotes: Vec::new(),
                timestamp: message
                    .get("timestampUsec")
                    .and_then(|t| t.as_str())
                    .unwrap_or("Unknown Timestamp")
                    .to_string(),
                tracking_params: message
                    .get("trackingParams")
                    .and_then(|t| t.as_str())
                    .unwrap_or("Unknown Tracking Params")
                    .to_string(),
            };

            responses.push(response);
        }
    }

    Ok(responses)
}

pub(crate) async fn youtube_polling_cmd(
    interval: u64,
    live_id: String,
    stop_flag: Arc<AtomicBool>,
    ws_server: Arc<WebSocketServer>,
) {
    // Initialize video and message cache
    let video = match get_video(live_id.clone()).await {
        Ok(v) => v,
        Err(e) => {
            eprintln!("Failed to get video info: {:?}", e);
            return;
        }
    };

    println!("Starting YouTube live chat client for video: {}", live_id);

    // Use a more efficient message cache with pre-allocated capacity
    let mut message_cache = MessageCache::new(20);
    let polling_interval = tokio::time::Duration::from_millis(interval);

    loop {
        // Check the stop flag first to prevent unnecessary processing
        if stop_flag.load(Ordering::Relaxed) {
            break;
        }

        // Use select! for better concurrency
        tokio::select! {
            _ = tokio::time::sleep(polling_interval) => {
                match get_live_chat(video.clone()).await {
                    Ok((messages, _)) => {
                        for message in messages {
                            // Only process new messages
                            if message_cache.add_message(message.id.clone()) {
                                // Prepare WebSocket response
                                let ws_response = json!({
                                    "platform": "youtube",
                                    "data": message
                                });

                                // Send response through WebSocket
                                let message_text = serde_json::to_string(&ws_response)
                                    .unwrap_or_else(|_| "{}".to_string());

                                // Broadcast without awaiting the result
                                ws_server.broadcast(Message::Text(message_text)).await;
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Error polling YouTube live chat: {:?}", e);

                        // Add exponential backoff for error cases
                        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                    }
                }
            }
            else => break
        }
    }

    println!("Stopping YouTube live chat client for video: {}", live_id);
}

#[tauri::command]
pub(crate) async fn get_video_cmd(id: String) -> Result<VideoInfo, VideoError> {
    get_video(id).await
}

#[tauri::command]
pub(crate) async fn get_live_chat_cmd(
    video: VideoInfo,
) -> Result<(Vec<YoutubeResponse>, String), String> {
    get_live_chat(video).await
}

#[cfg(test)]
mod test {
    use super::*;
    use tokio;

    #[tokio::test]
    async fn test_get_video_cmd() {
        let video = get_video("8OlZQTSq63I".to_string()).await.unwrap();
        println!("{:?}", video);
    }

    #[tokio::test]
    async fn test_get_live_chat_cmd() {
        let video = get_video("WrW-QlNG1eo".to_string()).await.unwrap();
        get_live_chat(video).await.expect("Failed to get live chat");
    }
}

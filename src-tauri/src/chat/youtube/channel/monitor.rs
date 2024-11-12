use crate::chat::youtube::video_functions::HTTP_CLIENT;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::Manager;
use tokio::time::{interval, Duration};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ChannelInfo {
    pub channel_id: String,
    pub channel_name: String,
    pub last_check: i64,
    pub is_monitoring: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ChannelFeed {
    channel_id: String,
    videos: Vec<VideoEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct VideoEntry {
    video_id: String,
    title: String,
    published_at: String,
    is_live: bool,
}

pub struct ChannelMonitor {
    db: Arc<sled::Db>,
    channels: HashMap<String, ChannelInfo>,
    stop_flag: Arc<AtomicBool>,
    http_client: Arc<Client>,
}

// Separate the channel feed fetching logic into a standalone function
async fn fetch_channel_feed(channel_id: &str, http_client: &Client) -> Result<ChannelFeed, String> {
    let url = format!(
        "https://www.youtube.com/feeds/videos.xml?channel_id={}",
        channel_id
    );

    let response = http_client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; rv:78.0)")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let text = response.text().await.map_err(|e| e.to_string())?;

    let feed = roxmltree::Document::parse(&text).map_err(|e| e.to_string())?;

    let mut videos = Vec::new();

    for entry in feed.descendants().filter(|n| n.has_tag_name("entry")) {
        let video_id = entry
            .descendants()
            .find(|n| n.has_tag_name("videoId"))
            .and_then(|n| n.text())
            .ok_or("Missing video ID")?;

        let title = entry
            .descendants()
            .find(|n| n.has_tag_name("title"))
            .and_then(|n| n.text())
            .ok_or("Missing title")?;

        let published_at = entry
            .descendants()
            .find(|n| n.has_tag_name("published"))
            .and_then(|n| n.text())
            .ok_or("Missing published date")?;

        // Check if video is live or scheduled
        let video_info = super::super::polling::get_video_cmd(video_id.to_string()).await;
        let is_live = match video_info {
            Ok(info) => info.stream_type.is_some(),
            Err(_) => false,
        };

        if is_live {
            videos.push(VideoEntry {
                video_id: video_id.to_string(),
                title: title.to_string(),
                published_at: published_at.to_string(),
                is_live,
            });
        }
    }

    Ok(ChannelFeed {
        channel_id: channel_id.to_string(),
        videos,
    })
}

impl ChannelMonitor {
    pub fn new(db: Arc<sled::Db>) -> Self {
        Self {
            db,
            channels: HashMap::new(),
            stop_flag: Arc::new(AtomicBool::new(false)),
            http_client: Arc::new(
                Client::builder()
                    .timeout(Duration::from_secs(10))
                    .build()
                    .unwrap(),
            ),
        }
    }

    pub async fn start_monitoring(&self, app_handle: tauri::AppHandle) {
        let mut interval = interval(Duration::from_secs(300)); // Check every 5 minutes
        let db = self.db.clone();
        let stop_flag = self.stop_flag.clone();
        let http_client = self.http_client.clone();

        tokio::spawn(async move {
            loop {
                if stop_flag.load(Ordering::Relaxed) {
                    break;
                }

                interval.tick().await;

                // Iterate through stored channels
                if let Ok(channels) = db.get(b"monitored_channels") {
                    if let Some(channels_data) = channels {
                        let channels: HashMap<String, ChannelInfo> =
                            serde_json::from_slice(&channels_data).unwrap_or_default();

                        for (channel_id, channel_info) in channels {
                            if !channel_info.is_monitoring {
                                continue;
                            }

                            // Fetch and process channel feed using the standalone function
                            match fetch_channel_feed(&channel_id, &http_client).await {
                                Ok(feed) => {
                                    for video in feed.videos {
                                        // Store new livestreams
                                        if let Ok(video_info) =
                                            super::super::polling::get_video_cmd(
                                                video.video_id.clone(),
                                            )
                                                .await
                                        {
                                            let _ =
                                                super::super::state_manager::store_new_livestream(
                                                    video_info,
                                                    app_handle.clone(),
                                                )
                                                    .await;
                                        }
                                    }
                                }
                                Err(e) => {
                                    eprintln!("Error fetching channel feed: {}", e);
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    pub fn stop_monitoring(&self) {
        self.stop_flag.store(true, Ordering::Relaxed);
    }
}

#[tauri::command]
pub(crate) async fn get_channel(channel_id: String) -> Result<ChannelInfo, String> {
    if channel_id.contains("@") {
        let url = format!("https://www.youtube.com/{}", channel_id);
        let response = HTTP_CLIENT.get(&url).send().await.map_err(|e| e.to_string())?;

        // Scrape from the HTML the identifier
        let text_doc = response.text().await.map_err(|e| e.to_string())?;

        println!("{}", text_doc);
    };

    Ok(ChannelInfo::default())
}

#[tauri::command]
pub(crate) async fn add_channel_to_monitor(
    channel_id: String,
    channel_name: String,
    app_handle: tauri::AppHandle,
) -> Result<bool, String> {
    let db: Arc<sled::Db> = app_handle.state::<Arc<sled::Db>>().inner().clone();

    let mut channels: HashMap<String, ChannelInfo> =
        if let Ok(Some(channels_data)) = db.get(b"monitored_channels") {
            serde_json::from_slice(&channels_data).unwrap_or_default()
        } else {
            HashMap::new()
        };

    let channel_info = ChannelInfo {
        channel_id: channel_id.clone(),
        channel_name,
        last_check: chrono::Utc::now().timestamp(),
        is_monitoring: true,
    };

    channels.insert(channel_id, channel_info);

    let serialized = serde_json::to_vec(&channels).map_err(|e| e.to_string())?;
    db.insert(b"monitored_channels", serialized)
        .map_err(|e| e.to_string())?;
    db.flush().map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub(crate) async fn remove_channel_from_monitor(
    channel_id: String,
    app_handle: tauri::AppHandle,
) -> Result<bool, String> {
    let db: Arc<sled::Db> = app_handle.state::<Arc<sled::Db>>().inner().clone();

    let mut channels: HashMap<String, ChannelInfo> =
        if let Ok(Some(channels_data)) = db.get(b"monitored_channels") {
            serde_json::from_slice(&channels_data).unwrap_or_default()
        } else {
            HashMap::new()
        };

    channels.remove(&channel_id);

    let serialized = serde_json::to_vec(&channels).map_err(|e| e.to_string())?;
    db.insert(b"monitored_channels", serialized)
        .map_err(|e| e.to_string())?;
    db.flush().map_err(|e| e.to_string())?;

    Ok(true)
}

use crate::misc::qol::database::state::DatabaseState;
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sled::Db;
use std::ops::Deref;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};
use tokio::sync::Mutex;
use tokio::time::{interval, Duration};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Channel {
    pub channel_id: String,
    pub title: String,
    pub description: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
    pub thumbnail_url: Option<String>,
    pub subscriber_count: Option<String>,
    pub video_count: Option<String>,
    pub custom_url: Option<String>,
    pub country: Option<String>,
    pub is_monitoring: bool,
    pub last_check: DateTime<Utc>,
    pub current_videos: Vec<VideoEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoEntry {
    pub video_id: String,
    pub title: String,
    pub published_at: String,
    pub is_live: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelError {
    pub error: String,
}

#[derive(Debug)]
pub struct ChannelState {
    channel: Option<Channel>,
    is_monitoring: bool,
    client: Client,
    db: Arc<Db>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct YTMetadata {
    pub(crate) metadata: ChannelMetadata,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ChannelMetadata {
    pub(crate) channel_metadata_renderer: ChannelMetadataRenderer,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ChannelMetadataRenderer {
    pub(crate) title: String,
    pub(crate) description: String,
    pub(crate) external_id: String,
    pub(crate) channel_url: String,
    pub(crate) avatar: Avatar,
    pub(crate) vanity_channel_url: Option<String>,
    #[serde(default)]
    pub(crate) is_family_safe: bool,
    pub(crate) keywords: Option<String>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct Avatar {
    pub(crate) thumbnails: Vec<Thumbnail>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct Thumbnail {
    pub(crate) url: String,
    pub(crate) width: i32,
    pub(crate) height: i32,
}

struct FetchXmlResponse {
    channel_id: String,
    title: String,
    published_at: Option<DateTime<Utc>>,
}

impl ChannelState {
    pub fn new(db: Arc<Db>) -> Self {
        Self {
            channel: None,
            is_monitoring: false,
            client: Client::builder()
                .timeout(Duration::from_secs(10))
                .build()
                .unwrap(),
            db,
        }
    }

    async fn fetch_channel_feed(&self, channel_id: &str) -> Result<Vec<VideoEntry>, ChannelError> {
        let url = format!(
            "https://www.youtube.com/feeds/videos.xml?channel_id={}",
            channel_id
        );

        let response = self.client
            .get(&url)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; rv:78.0)")
            .send()
            .await
            .map_err(|e| ChannelError {
                error: format!("Failed to fetch feed: {}", e)
            })?;

        let text = response.text().await.map_err(|e| ChannelError {
            error: format!("Failed to get feed text: {}", e)
        })?;

        // Clean XML declaration
        let text = text.replace(r#"<?xml version="1.0" encoding="UTF-8"?>"#, "");

        let parse_opts = roxmltree::ParsingOptions {
            allow_dtd: true,
            ..Default::default()
        };

        let doc = roxmltree::Document::parse_with_options(&text, parse_opts).map_err(|e| ChannelError {
            error: format!("Failed to parse feed: {}", e)
        })?;

        let mut videos = Vec::new();

        // Get all entry nodes
        let feed = doc.root_element();
        let entries = feed
            .children()
            .filter(|n| n.has_tag_name("entry"));

        for entry in entries {
            // Get video ID
            let video_id = entry
                .children()
                .find(|n| n.has_tag_name("videoId"))
                .and_then(|n| n.text())
                .ok_or_else(|| ChannelError {
                    error: "Missing video ID".to_string()
                })?;

            // Get title
            let title = entry
                .children()
                .find(|n| n.has_tag_name("title"))
                .and_then(|n| n.text())
                .ok_or_else(|| ChannelError {
                    error: "Missing title".to_string()
                })?;

            // Get published date
            let published_at = entry
                .children()
                .find(|n| n.has_tag_name("published"))
                .and_then(|n| n.text())
                .ok_or_else(|| ChannelError {
                    error: "Missing published date".to_string()
                })?;

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

        Ok(videos)
    }

    async fn fetch_xml_info(&self, channel_id: &str) -> Result<FetchXmlResponse, ChannelError> {
        let mut assigned_id = channel_id.to_string();
        if assigned_id.contains("@") {
            let url = format!("https://www.youtube.com/{}", channel_id);
            let response = self.client.get(&url).send().await.map_err(|e| e.to_string()).unwrap();

            // Scrape from the HTML the identifier
            let text_doc = response.text().await.map_err(|e| e.to_string()).unwrap();

            // Check if it's empty
            if text_doc.is_empty() {
                return Err(ChannelError {
                    error: "Empty response".to_string()
                });
            } else if text_doc.contains("This channel does not exist.") {
                return Err(ChannelError {
                    error: "Channel does not exist".to_string()
                });
            }

            // Get channel ID from the meta tag "<meta itemprop="identifier""
            assigned_id = text_doc
                .split("<meta itemprop=\"identifier\" content=\"")
                .nth(1)
                .and_then(|s| s.split('"').next())
                .map(|s| s.to_string())
                .ok_or_else(|| ChannelError {
                    error: "Cannot find channel ID".to_string()
                })?;
        }

        let url = format!(
            "https://www.youtube.com/feeds/videos.xml?channel_id={}",
            assigned_id
        );

        let response = self.client
            .get(&url)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; rv:78.0)")
            .send()
            .await
            .map_err(|e| ChannelError {
                error: format!("Failed to fetch XML: {}", e)
            })?;

        let text = response.text().await.map_err(|e| ChannelError {
            error: format!("Failed to get XML text: {}", e)
        })?;

        // Clean XML declaration
        let text = text.replace(r#"<?xml version="1.0" encoding="UTF-8"?>"#, "");

        let parse_opts = roxmltree::ParsingOptions {
            allow_dtd: true,
            ..Default::default()
        };

        let doc = roxmltree::Document::parse_with_options(&text, parse_opts).map_err(|e| ChannelError {
            error: format!("Failed to parse XML: {}", e)
        })?;

        let feed = doc.root_element();

        // Get channel info from feed
        let title = feed
            .children()
            .find(|n| n.has_tag_name("title"))
            .and_then(|n| n.text())
            .ok_or_else(|| ChannelError {
                error: "No channel title found".to_string()
            })?;

        let published_at = feed
            .children()
            .find(|n| n.has_tag_name("published"))
            .and_then(|n| n.text())
            .and_then(|t| DateTime::parse_from_rfc3339(t).ok())
            .map(|dt| dt.with_timezone(&Utc));

        Ok(
            FetchXmlResponse {
                channel_id: assigned_id,
                title: title.to_string(),
                published_at,
            }
        )
    }

    async fn fetch_page_info(&self, channel_id: &str) -> Result<Channel, ChannelError> {
        let url = format!("https://www.youtube.com/{}", channel_id);

        let client = Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .unwrap();

        let response = client
            .get(&url)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; rv:78.0)")
            .send()
            .await
            .map_err(|e| ChannelError {
                error: format!("Failed to fetch page: {}", e)
            })?;

        let text = response.text().await.map_err(|e| ChannelError {
            error: format!("Failed to get page text: {}", e)
        })?;

        // Extract metadata section
        let metadata = text
            .split("var ytInitialData = ")
            .nth(1)
            .and_then(|s| s.split("</script>").next())
            .ok_or_else(|| ChannelError {
                error: "Cannot find metadata".to_string()
            })?;

        // Remove ; from the end of the metadata
        let metadata = metadata.trim_end_matches(';');

        let metadata: YTMetadata = serde_json::from_str(&metadata.to_string()).map_err(|e| ChannelError {
            error: format!("Failed to parse metadata: {}", e)
        })?;

        let channel_metadata = metadata.metadata.channel_metadata_renderer;

        Ok(Channel {
            channel_id: channel_metadata.external_id,
            title: channel_metadata.title,
            description: Some(channel_metadata.description),
            published_at: None,
            thumbnail_url: channel_metadata.avatar.thumbnails.first().map(|t| t.url.clone()),
            subscriber_count: None,
            video_count: None,
            custom_url: channel_metadata.vanity_channel_url,
            country: None,
            is_monitoring: false,
            last_check: Utc::now(),
            current_videos: Vec::new(),
        })
    }

    fn merge_channel_info(xml: FetchXmlResponse, page: Channel) -> Channel {
        Channel {
            channel_id: xml.channel_id,
            title: page.title,
            description: page.description,
            published_at: page.published_at,
            thumbnail_url: page.thumbnail_url,
            subscriber_count: page.subscriber_count,
            video_count: page.video_count,
            custom_url: page.custom_url,
            country: page.country,
            is_monitoring: false,
            last_check: Utc::now(),
            current_videos: Vec::new(),
        }
    }
}

pub struct ChannelManager(pub Arc<Mutex<ChannelState>>);

impl ChannelManager {
    pub fn new(db: Arc<Db>) -> Self {
        Self(Arc::new(Mutex::new(ChannelState::new(db))))
    }
}

pub async fn init_channel_manager(app: &AppHandle) {
    println!("Initializing channel manager");
    match app.try_state::<DatabaseState>() {
        None => {
            println!("No database manager found");
        }
        Some(db) => {
            let db = db.inner().clone().0.get_db().await.unwrap().deref().clone();
            let manager = ChannelManager::new(Arc::new(db));
            app.manage(manager);
            println!("Channel manager initialized");
        }
    }
}

#[tauri::command]
pub async fn set_channel(channel_id: String, state: State<'_, ChannelManager>) -> Result<(), ChannelError> {
    let mut channel_state = state.0.lock().await;

    let xml_info = channel_state.fetch_xml_info(&channel_id).await?;
    let page_info = channel_state.fetch_page_info(&channel_id).await?;
    let channel = ChannelState::merge_channel_info(
        xml_info,
        page_info,
    );

    channel_state.channel = Some(channel);
    Ok(())
}

#[tauri::command]
pub async fn start_monitoring(
    app: AppHandle,
    state: State<'_, ChannelManager>,
) -> Result<(), ChannelError> {
    let mut channel_state = state.0.lock().await;

    if channel_state.is_monitoring {
        return Ok(());
    }

    let channel = channel_state.channel.clone().ok_or(ChannelError {
        error: "No channel set".to_string()
    })?;

    app.manage(Mutex::new(channel.clone()));

    channel_state.is_monitoring = true;
    let state_clone = state.0.clone();

    tokio::spawn(async move {
        let mut interval = interval(Duration::from_secs(300));
        loop {
            interval.tick().await;

            let mut state = state_clone.lock().await;
            if !state.is_monitoring {
                break;
            }

            if let Some(channel) = &state.channel {
                if let Ok(videos) = state.fetch_channel_feed(&channel.channel_id).await {
                    for video in videos {
                        if let Ok(video_info) = super::super::polling::get_video_cmd(video.video_id.clone()).await {
                            let _ = super::super::state_manager::store_new_livestream(
                                video_info,
                                app.clone(),
                            ).await;
                        }
                    }
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_monitoring(state: State<'_, ChannelManager>) -> Result<(), ChannelError> {
    let mut channel_state = state.0.lock().await;
    channel_state.is_monitoring = false;
    Ok(())
}

#[tauri::command]
pub async fn get_current_channel(state: State<'_, ChannelManager>) -> Result<Option<Channel>, String> {
    let channel_state = state.0.lock().await;

    Ok(channel_state.channel.clone())
}

#[tauri::command]
pub async fn update_channel_info(state: State<'_, ChannelManager>) -> Result<(), ChannelError> {
    let mut channel_state = state.0.lock().await;

    if let Some(channel) = &channel_state.channel {
        let channel_id = channel.channel_id.clone();
        let xml_info = channel_state.fetch_xml_info(&channel_id).await?;
        let page_info = channel_state.fetch_page_info(&channel_id).await?;
        channel_state.channel = Some(ChannelState::merge_channel_info(xml_info, page_info));
    }

    Ok(())
}
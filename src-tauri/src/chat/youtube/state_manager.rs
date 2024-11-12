use crate::chat::youtube::polling::{get_video_cmd, VideoInfo};
use crate::misc::qol::database::manager::DatabaseManager;
use crate::misc::qol::database::state::DatabaseState;
use lazy_static::lazy_static;
use lru::LruCache;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::num::NonZeroUsize;
use std::ops::Deref;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub(crate) struct StoredVideos {
    pub(crate) videos: HashMap<String, VideoInfo>,
}

#[tauri::command]
pub(crate) async fn store_new_livestream(data: VideoInfo, app: AppHandle) -> Result<bool, String> {
    let db = app.state::<DatabaseManager>();
    let db = db.get_db().await.unwrap().deref().clone();

    let video_id = data.video_id.clone().unwrap();
    let serialized_data = serde_json::to_vec(&data).map_err(|e| e.to_string())?;

    // Check if the video is already in the database
    if db.contains_key(&video_id).map_err(|e| e.to_string())? {
        return Ok(false);
    }

    // Insert data into the sled database
    db.insert(video_id, serialized_data)
        .map_err(|e| e.to_string())?;
    db.flush().map_err(|e| e.to_string())?;

    Ok(true)
}

lazy_static! {
    static ref VIDEO_CACHE: Mutex<LruCache<String, VideoInfo>> =
        Mutex::new(LruCache::new(NonZeroUsize::new(100).unwrap()));
}

#[tauri::command]
pub(crate) async fn get_video_from_db(id: String, app: AppHandle) -> Result<VideoInfo, String> {
    // Check cache first
    if let Some(video_info) = VIDEO_CACHE.lock().unwrap().get(&id) {
        return Ok(video_info.clone());
    }

    let db = app.state::<DatabaseManager>();
    let db = db.get_db().await.unwrap().deref().clone();

    match db.get(&id) {
        Ok(Some(video)) => {
            let video_info: VideoInfo =
                serde_json::from_slice(&video).map_err(|e| e.to_string())?;

            // Cache the result
            VIDEO_CACHE.lock().unwrap().put(id, video_info.clone());

            Ok(video_info)
        }
        Ok(None) => Err("Video not found".to_string()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub(crate) async fn get_all_videos(
    app: AppHandle,
    update_status: Option<bool>,
    max_retries: Option<usize>,
) -> Result<Vec<VideoInfo>, String> {
    let db = app.state::<DatabaseState>();
    let db = db.0.get_db().await.unwrap().deref().clone();

    max_retries.unwrap_or(3);
    let mut videos = Vec::new();
    let mut to_remove = Vec::new();

    // Use batch processing for database operations
    let batch_size = 50;
    let mut batch = sled::Batch::default();
    let mut current_batch_size = 0;

    for video in db.iter() {
        let (key, value) = video.map_err(|e| e.to_string())?;
        let video_info: VideoInfo = serde_json::from_slice(&value).map_err(|e| e.to_string())?;

        if let Some(true) = update_status {
            match get_video_cmd(video_info.video_id.clone().unwrap()).await {
                Ok(updated_video) => {
                    videos.push(updated_video.clone());

                    // Add to batch instead of immediate update
                    let serialized_data =
                        serde_json::to_vec(&updated_video).map_err(|e| e.to_string())?;
                    batch.insert(&key, serialized_data);
                    current_batch_size += 1;

                    // Execute batch when it reaches the size limit
                    if current_batch_size >= batch_size {
                        db.apply_batch(batch).map_err(|e| e.to_string())?;
                        batch = sled::Batch::default();
                        current_batch_size = 0;
                    }
                }
                Err(e) => {
                    if e.video_id == "Unknown" {
                        to_remove.push(key);
                    } else {
                        eprintln!("Error updating video: {}", e.video_id);
                    }
                }
            }
        } else {
            videos.push(video_info);
        }
    }

    // Apply any remaining batch operations
    if current_batch_size > 0 {
        db.apply_batch(batch).map_err(|e| e.to_string())?;
    }

    // Remove invalid videos in batch
    if !to_remove.is_empty() {
        let mut remove_batch = sled::Batch::default();
        for key in to_remove {
            remove_batch.remove(key);
        }
        db.apply_batch(remove_batch).map_err(|e| e.to_string())?;
    }

    db.flush().map_err(|e| e.to_string())?;
    Ok(videos)
}

#[tauri::command]
pub(crate) async fn delete_video_from_db(id: String, app: AppHandle) -> Result<bool, String> {
    let db = app.state::<DatabaseManager>();
    let db = db.get_db().await.unwrap().deref().clone();

    if db.contains_key(&id).unwrap() {
        db.remove(&id).unwrap();
        db.flush().unwrap();
        Ok(true)
    } else {
        Err("Video not found".to_string())
    }
}

#[tauri::command]
pub(crate) async fn update_video_metadata(video: VideoInfo, app: AppHandle) {
    let db = app.state::<DatabaseManager>();
    let db = db.get_db().await.unwrap().deref().clone();

    let video_id = video.video_id.clone().unwrap();
    let serialized_data = serde_json::to_vec(&video).unwrap();

    db.insert(video_id, serialized_data).unwrap();
    db.flush().unwrap();
}

#[tauri::command]
pub(crate) async fn update_video(id: String, app: AppHandle) {
    let db = app.state::<DatabaseManager>();
    let db = db.get_db().await.unwrap().deref().clone();

    let video = db.get(id.clone()).unwrap().unwrap();
    let video_info: VideoInfo = serde_json::from_slice(&video).unwrap();

    let updated_video = get_video_cmd(video_info.video_id.clone().unwrap())
        .await
        .unwrap();

    let serialized_data = serde_json::to_vec(&updated_video).unwrap();

    db.insert(id, serialized_data).unwrap();
    db.flush().unwrap();
}

async fn insert() {
    let db_path = dirs::config_dir()
        .unwrap()
        .join("United Chat")
        .join("database");

    let db = sled::open(db_path).unwrap();

    // Insert an invalid video to test the error handling
    // Use this one: https://www.youtube.com/watch?v=nAklN7qHGgk
    let video = VideoInfo {
        is_replay: Some(false),
        api_key: Some("1231231231231".to_string()),
        stream_type: Some("live".to_string()),
        continuation: Some("dhsjagfjhsadgfkjasdgkaj".to_string()),
        video_id: Some("nAklN7qHGgk".to_string()),
        video_name: Some(
            "【少し】ねぇ、かまって。【 #vtuber / 個人勢 / #shorts / #asmr 】".to_string(),
        ),
        client_version: Some("0.1.0".to_string()),
        scheduled_start_time: None,
    };

    let serialized_data = serde_json::to_vec(&video).unwrap();
    db.insert("nAklN7qHGgk", serialized_data).unwrap();
    db.flush().unwrap();
}

#[cfg(test)]
mod test {
    use super::*;

    #[tokio::test]
    async fn force_insert() {
        insert().await;
    }
}

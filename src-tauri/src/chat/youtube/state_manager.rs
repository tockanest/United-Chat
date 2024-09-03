use crate::chat::youtube::polling::{get_video_cmd, VideoInfo};
use serde::{Deserialize, Serialize};
use sled::Db;
use std::collections::HashMap;
use std::ops::Deref;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub(crate) struct StoredVideos {
    pub(crate) videos: HashMap<String, VideoInfo>,
}

#[tauri::command]
pub(crate) async fn store_new_livestream(data: VideoInfo, app: AppHandle) -> Result<bool, String> {
    let db: Arc<Db> = app.state::<Arc<Db>>().deref().clone();
    let video_id = data.video_id.clone().unwrap();
    let serialized_data = serde_json::to_vec(&data).map_err(|e| e.to_string())?;

    // Check if the video is already in the database
    if db.contains_key(&video_id).map_err(|e| e.to_string())? {
        return Ok(false);
    }

    // Insert data into the sled database
    db.insert(video_id, serialized_data).map_err(|e| e.to_string())?;
    db.flush().map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
/// WARNING: Using the update_status parameter will cause the function to check every video in the database for updates.
/// This can be very slow if there are a lot of videos in the database.
pub(crate) async fn get_all_videos(app: AppHandle, update_status: Option<bool>) -> Result<Vec<VideoInfo>, String> {
    let db: Arc<Db> = app.state::<Arc<Db>>().deref().clone();

    let mut videos = Vec::new();

    for video in db.iter() {
        let video_info: VideoInfo = serde_json::from_slice(&video.unwrap().1).unwrap();

        if let Some(update_status) = update_status {
            if update_status {
                let updated_video = get_video_cmd(video_info.video_id.clone().unwrap()).await.unwrap();
                videos.push(updated_video);
            }
        } else {
            videos.push(video_info);
        }
    }

    Ok(videos)
}

#[tauri::command]
pub(crate) async fn get_video_from_db(id: String, app: AppHandle) -> Result<VideoInfo, String> {
    let db: Arc<Db> = app.state::<Arc<Db>>().deref().clone();
    let video = db.get(id).unwrap().unwrap();
    let video_info: VideoInfo = serde_json::from_slice(&video).unwrap();

    Ok(video_info)
}

#[tauri::command]
pub(crate) async fn delete_video_from_db(id: String, app: AppHandle) -> Result<bool, String> {
    let db: Arc<Db> = app.state::<Arc<Db>>().deref().clone();

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
    let db: Arc<Db> = app.state::<Arc<Db>>().deref().clone();
    let video_id = video.video_id.clone().unwrap();
    let serialized_data = serde_json::to_vec(&video).unwrap();

    db.insert(video_id, serialized_data).unwrap();
    db.flush().unwrap();
}

#[tauri::command]
pub(crate) async fn update_video(id: String, app: AppHandle) {
    let db: Arc<Db> = app.state::<Arc<Db>>().deref().clone();
    let video = db.get(id.clone()).unwrap().unwrap();
    let video_info: VideoInfo = serde_json::from_slice(&video).unwrap();

    let updated_video = get_video_cmd(video_info.video_id.clone().unwrap()).await.unwrap();

    let serialized_data = serde_json::to_vec(&updated_video).unwrap();

    db.insert(id, serialized_data).unwrap();
    db.flush().unwrap();
}
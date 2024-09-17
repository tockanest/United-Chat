use crate::chat::twitch::irc::connect_twitch_websocket;
use crate::chat::websocket::start_ws::initialize_websocket_server;
use crate::chat::youtube::polling::youtube_polling_cmd;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub(crate) struct UnitedChat {
    pub(crate) websocket_started: Arc<Mutex<bool>>,
    pub(crate) stop_flag: Arc<AtomicBool>,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub(crate) struct YoutubeInfo {
    pub(crate) yt_id: String,
    pub(crate) interval: u64,
}


#[tauri::command]
pub(crate) async fn united_chat_init(
    app: AppHandle,  // app is not `Clone` by default
    youtube: Option<YoutubeInfo>,
) {
    let ws_started = Arc::clone(&app.state::<UnitedChat>().websocket_started);

    {
        let mut started = ws_started.lock().unwrap();
        if *started {
            return;
        }
        *started = true;
    }

    let stop_flag = Arc::clone(&app.state::<UnitedChat>().stop_flag);

    // Start the WebSocket server
    let ws_server = initialize_websocket_server(app.clone()).await;

    // Clone the `stop_flag` and `ws_server` before moving them into async blocks
    let stop_flag_twitch = Arc::clone(&stop_flag);
    let ws_server_twitch = ws_server.clone();

    // Clone the `app` since we need it in multiple places
    let app_twitch = app.clone();

    // Start the Twitch IRC client concurrently
    let twitch_handle = tokio::spawn(async move {
        connect_twitch_websocket(app_twitch, stop_flag_twitch, ws_server_twitch).await;
    });

    // Clone again for the YouTube task
    let stop_flag_youtube = Arc::clone(&stop_flag);
    let ws_server_youtube = ws_server.clone();

    // Check if YouTube info is provided and start the YouTube live chat client concurrently
    let youtube_handle = match youtube {
        Some(yt_info) => {
            let youtube_handle = if !yt_info.yt_id.is_empty() {
                println!("Starting YouTube live chat client");
                Some(tokio::spawn(async move {
                    youtube_polling_cmd(
                        yt_info.interval,
                        yt_info.yt_id.clone(),
                        stop_flag_youtube,
                        ws_server_youtube,
                    ).await;
                }))
            } else {
                None
            };

            youtube_handle
        }
        None => None,
    };

    // Use tokio::spawn to monitor the stop_flag in the background
    tokio::spawn(async move {
        while !stop_flag.load(Ordering::Relaxed) {
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }

        // If stop_flag is set, initiate the shutdown signal for the WebSocket server
        ws_server.close().await;

        // Wait for another two seconds to reset the flag
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        println!("Resetting stop flag");
        stop_flag.store(false, Ordering::Relaxed);
    });

    // Wait for the spawned tasks to complete using join
    if let Some(youtube_task) = youtube_handle {
        let _ = tokio::join!(twitch_handle, youtube_task);
    } else {
        let _ = twitch_handle.await;
    }
}

#[tauri::command]
pub(crate) async fn united_chat_stop(app: AppHandle) {
    let ws_started = Arc::clone(&app.state::<UnitedChat>().websocket_started);

    {
        let mut started = ws_started.lock().unwrap();
        if !*started {
            return;
        }
        *started = false;
    }

    let stop_flag = Arc::clone(&app.state::<UnitedChat>().stop_flag);
    stop_flag.store(true, Ordering::Relaxed);
}
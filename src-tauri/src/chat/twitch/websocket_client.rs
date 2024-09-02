use crate::chat::twitch::auth::{ImplicitGrantFlow, UserInformation, UserSkippedInformation};
use crate::chat::twitch::helpers::message_processor::message_processor;
use crate::chat::websocket::ws_server::WebSocketServer;
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tokio::sync::Mutex;
use tokio_tungstenite::connect_async;

#[derive(Serialize, Deserialize, Clone, Debug)]
struct RawTwitchResponse {
    raw_message: String,
    raw_emotes: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct TwitchResponse {
    id: String,
    timestamp: i64,
    display_name: String,
    user_color: String,
    user_badges: Vec<String>,
    message: String,
    emotes: Vec<(String, String)>,
    raw_data: RawTwitchResponse,
    tags: Vec<(String, String)>,
}

#[derive(Default)]
pub(crate) struct TwitchWebsocketChat {
    pub(crate) ws_stream_initialized: Arc<Mutex<bool>>,
    pub(crate) stop_flag: Arc<AtomicBool>, // Added AtomicBool
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) enum UserInformationState {
    Skipped(Arc<UserSkippedInformation>),
    Regular(Arc<UserInformation>),
}

#[tauri::command]
pub(crate) async fn connect_twitch_websocket(app: AppHandle) {
    let websocket_connection = Arc::clone(&app.state::<TwitchWebsocketChat>().ws_stream_initialized);
    let stop_flag = Arc::clone(&app.state::<TwitchWebsocketChat>().stop_flag);

    {
        let mut ws_initialized = websocket_connection.lock().await;
        if *ws_initialized {
            return;
        }

        *ws_initialized = true;
    }

    let state = app.state::<ImplicitGrantFlow>();

    let user_information = match state.skipped {
        Some(true) => {
            let skipped_state = Arc::new((*app.state::<UserSkippedInformation>()).clone());
            UserInformationState::Skipped(skipped_state)
        }
        _ => {
            let regular_state = Arc::new((*app.state::<UserInformation>()).clone());
            UserInformationState::Regular(regular_state)
        }
    };

    let ws_server = Arc::new(WebSocketServer::new());
    let ws_server_clone = Arc::clone(&ws_server);

    tokio::spawn(async move {
        if let Err(e) = ws_server_clone.run("127.0.0.1:9888").await {
            eprintln!("WebSocket server error: {}", e);
        } else {
            println!("WebSocket server started successfully");
        }
    });


    let (mut ws_stream, _) = connect_async("wss://irc-ws.chat.twitch.tv:443")
        .await
        .unwrap_or_else(|e| panic!("Error during handshake: {}", e));

    ws_stream.send("NICK justinfan1234".into()).await.unwrap();

    while let Some(msg) = ws_stream.next().await {
        let msg = msg.unwrap();

        if stop_flag.load(Ordering::Relaxed) {
            break;
        }

        if msg.to_string().contains("PING") {
            ws_stream.send("PONG :tmi.twitch.tv".into()).await.unwrap();
        } else if msg.to_string().contains("Welcome, GLHF!") {
            ws_stream.send("CAP REQ :twitch.tv/tags".into()).await.unwrap();

            match &user_information {
                UserInformationState::Skipped(user) => {
                    let username = user.username.clone();
                    ws_stream.send(format!("JOIN #{}", username).into()).await.unwrap();
                }
                UserInformationState::Regular(user_info) => {
                    ws_stream.send(format!("JOIN #{}", user_info.login).into()).await.unwrap();
                }
            }
        } else if msg.to_string().contains("PRIVMSG") {
            message_processor(msg.to_string(), ws_server.clone(), state.clone(), user_information.clone()).await;
        }
    }

    ws_stream.send("QUIT".into()).await.unwrap();
    ws_server.close().await;
    *websocket_connection.lock().await = false;
    stop_flag.store(false, Ordering::Relaxed);
}

#[tauri::command]
pub(crate) async fn stop_connections(app: AppHandle) {
    let stop_flag = Arc::clone(&app.state::<TwitchWebsocketChat>().stop_flag);
    stop_flag.store(true, Ordering::Relaxed); // Set the stop flag to true
}
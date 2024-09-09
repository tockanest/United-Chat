use crate::chat::twitch::auth::{ImplicitGrantFlow, UserInformation, UserSkippedInformation};
use crate::chat::twitch::helpers::message_processor::message_processor;
use crate::chat::websocket::ws_server::WebSocketServer;
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::ops::Deref;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
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

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) enum UserInformationState {
    Skipped(Arc<UserSkippedInformation>),
    Regular(Arc<UserInformation>),
}

// Command to create and start the WebSocket server
pub(crate) async fn connect_twitch_websocket(app: AppHandle, stop_flag: Arc<AtomicBool>, ws_server: Arc<WebSocketServer>) {
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

    let (mut ws_stream, _) = connect_async("wss://irc-ws.chat.twitch.tv:443")
        .await
        .unwrap_or_else(|e| panic!("Error during handshake: {}", e));

    ws_stream.send("NICK justinfan1234".into()).await.unwrap();

    loop {
        // Check if stop flag has been set
        if stop_flag.load(Ordering::Relaxed) {
            println!("Stopping WebSocket connection...");

            break;
        }

        // Poll with timeout to prevent waiting indefinitely for messages
        let message_future = ws_stream.next();
        tokio::select! {
            maybe_msg = message_future => {
                if let Some(Ok(msg)) = maybe_msg {
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
                        message_processor(msg.to_string(), ws_server.clone().deref(), state.clone(), user_information.clone()).await;
                    }
                } else {
                    // Handle disconnection or error
                    println!("Disconnected from WebSocket server.");
                    break;
                }
            },
            // If the stop flag is set during the message wait, break out of the loop immediately
            _ = tokio::time::sleep(std::time::Duration::from_millis(100)) => {
                if stop_flag.load(Ordering::Relaxed) {
                    break;
                }
            }
        }
    }

    // Close WebSocket connection
    ws_stream.send("QUIT".into()).await.unwrap();
}
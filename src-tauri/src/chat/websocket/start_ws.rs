use crate::chat::websocket::ws_server::WebSocketServer;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

// WebSocket server initialization logic
pub(crate) async fn initialize_websocket_server(app: AppHandle) -> Arc<WebSocketServer> {
    let ws_server = Arc::new(WebSocketServer::new());
    let ws_server_clone = Arc::clone(&ws_server);

    tokio::spawn(async move {
        if let Err(e) = ws_server_clone.run("localhost:9888").await {
            panic!("Error starting WebSocket server: {}", e);
        } else {
            println!("WebSocket server started successfully");
        }
    });

    app.manage(ws_server.clone());
    ws_server
}
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use crate::chat::websocket::ws_server::WebSocketServer;

// WebSocket server initialization logic
pub(crate) async fn initialize_websocket_server(app: AppHandle) -> Arc<WebSocketServer> {
    let ws_server = Arc::new(WebSocketServer::new());
    let ws_server_clone = Arc::clone(&ws_server);

    tokio::spawn(async move {
        if let Err(e) = ws_server_clone.run("127.0.0.1:9888").await {
            eprintln!("WebSocket server error: {}", e);
        } else {
            println!("WebSocket server started successfully");
        }
    });

    app.manage(ws_server.clone());
    ws_server
}
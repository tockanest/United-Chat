mod chat;
mod misc;

use std::sync::Mutex;
use chat::twitch::auth::polling_for_access_token;
use misc::setup::{setup_complete, SetupState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(Mutex::new(SetupState {
            frontend_task: false,
            backend_task: false,
        }))
        .invoke_handler(tauri::generate_handler![
            setup_complete,
            polling_for_access_token
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

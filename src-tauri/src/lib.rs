mod chat;
mod misc;

use chat::twitch::auth::{start_twitch_link, twitch_auth};
use chat::twitch::get_user::get_user;
use chat::twitch::websocket_client::{connect_twitch_websocket, TwitchWebsocketChat};
use misc::editor::get_app_url::{get_app_url, open_webchat_window, hide_webchat_window};
use misc::editor::get_theme::get_theme;
use misc::setup::{setup_complete, SetupState};
use std::sync::Mutex;
use tauri::{Emitter, Listener, Manager};
use tauri_plugin_deep_link::DeepLinkExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            let windows = app.webview_windows();

            twitch_auth(args, app);

            windows
                .values()
                .next()
                .expect("Sorry, no window found")
                .set_focus()
                .expect("Can't Bring Window to Focus");
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(TwitchWebsocketChat::default())
        .manage(Mutex::new(SetupState {
            frontend_task: false,
            backend_task: false,
        }))
        .setup(|app| {
            #[cfg(windows)]
            app.deep_link().register("unitedchat").unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            setup_complete,
            start_twitch_link,
            connect_twitch_websocket,
            get_user,
            get_theme,
            get_app_url,
            open_webchat_window,
            hide_webchat_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

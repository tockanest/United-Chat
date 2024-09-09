mod chat;
mod misc;

use chat::twitch::auth::{skip_twitch_auth, start_twitch_link, twitch_auth, twitch_deauth};
use chat::youtube::polling::{get_live_chat_cmd, get_video_cmd};
use chat::youtube::state_manager::{
    delete_video_from_db, get_all_videos, get_video_from_db, store_new_livestream,
    update_video, update_video_metadata, StoredVideos,
};
use misc::editor::get_app_url::{hide_webchat_window, open_webchat_window};
use misc::editor::get_theme::{get_theme, get_themes};
use misc::editor::save_theme::save_theme;
use misc::qol::check_if_unsaved::check_if_unsaved;
use misc::setup::{initialize_database, setup_complete, SetupState};

use crate::chat::initialize::{united_chat_init, united_chat_stop, UnitedChat};
use crate::chat::twitch::get_user::get_user;
use std::sync::Mutex;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_deep_link::DeepLinkExt;
use crate::misc::qol::linking_ais::twitch_linking;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = initialize_database();

    misc::qol::error_handling::setup_panic_hook();

    tauri::Builder::default()
        .plugin(tauri_plugin_localhost::Builder::new(9889).build())
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
        .manage(Mutex::new(SetupState {
            frontend_task: false,
            backend_task: false,
        }))
        .manage(Mutex::new(StoredVideos::default()))
        .manage(UnitedChat::default())
        .manage(db)
        .setup(|app| {
            #[cfg(windows)]
            app.deep_link().register("unitedchat").unwrap();

            let url = format!("http://127.0.0.1:{}", 9889).parse().unwrap();

            WebviewWindowBuilder::new(app, "webchat".to_string(), WebviewUrl::External(url))
                .visible(false)
                .resizable(true)
                .center()
                .closable(false)
                .transparent(true)
                .title("United Chat - WebChat")
                .build()?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            setup_complete,
            // Twitch
            start_twitch_link,
            skip_twitch_auth,
            twitch_deauth,
            get_user,
            // Editor
            get_theme,
            get_themes,
            save_theme,
            check_if_unsaved,
            // WebChat Window
            open_webchat_window,
            hide_webchat_window,
            // YouTube
            get_video_cmd,
            get_live_chat_cmd,
            store_new_livestream,
            get_all_videos,
            get_video_from_db,
            delete_video_from_db,
            update_video_metadata,
            update_video,
            // Chat Start/Stop
            united_chat_init,
            united_chat_stop,
            // Account Linking After initial Setup
            twitch_linking
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

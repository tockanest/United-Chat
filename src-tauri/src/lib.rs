mod chat;
mod misc;

use crate::chat::initialize::{united_chat_init, united_chat_stop, UnitedChat};
use crate::chat::twitch::auth::twitch_auth;
use crate::chat::twitch::get_user::get_user;
use crate::misc::qol::linking_ais::twitch_linking;
use crate::misc::setup::initialize_database;
use chat::twitch::auth::{skip_twitch_auth, start_twitch_link, twitch_deauth};
use chat::youtube::polling::{get_live_chat_cmd, get_video_cmd};
use chat::youtube::state_manager::{
    delete_video_from_db, get_all_videos, get_video_from_db, store_new_livestream,
    update_video, update_video_metadata, StoredVideos,
};
use misc::editor::get_app_url::{hide_webchat_window, open_webchat_window};
use misc::editor::get_theme::{get_theme, get_themes};
use misc::editor::save_theme::save_theme;
use misc::qol::check_if_unsaved::check_if_unsaved;
use misc::setup::{setup_complete, SetupState};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{Listener, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_deep_link::DeepLinkExt;
use url::Url;

fn extract_info(urls: Vec<Url>) -> HashMap<String, String> {
    urls.into_iter()
        .filter_map(|url| {
            if url.scheme() == "unitedchat" && url.host().is_some() {
                let mut map = HashMap::new();
                map.insert("scheme".to_string(), url.scheme().to_string());
                map.insert("host".to_string(), url.host().unwrap().to_string());
                map.insert("fragment".to_string(), url.fragment().unwrap_or("").to_string());
                Some(map)
            } else {
                None
            }
        })
        .flatten()
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    misc::qol::error_handling::setup_panic_hook();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            let deep = app.deep_link().get_current().unwrap();
            if let Some(urls) = deep {
                let parsed_urls = extract_info(urls);
                if let Some(url) = parsed_urls.get("host") {
                    if url == "twitch_link" {
                        let args: Vec<&str> = parsed_urls.get("fragment").unwrap().split('&').collect();
                        twitch_auth(app, args);
                    }
                }
            }
        }))
        .plugin(tauri_plugin_localhost::Builder::new(9889).build())
        .manage(Mutex::new(SetupState {
            frontend_task: false,
            backend_task: false,
        }))
        .manage(Mutex::new(StoredVideos::default()))
        .manage(UnitedChat::default())
        .setup(|app| {
            app.deep_link().register("unitedchat").unwrap();

            let url = format!("http://localhost:{}", 9889).parse().unwrap();

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

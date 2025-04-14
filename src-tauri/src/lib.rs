mod chat;
mod misc;

// Standard library imports
use std::{collections::HashMap, sync::Mutex};

use tauri::{WebviewUrl, WebviewWindowBuilder};
// External crate imports
use tauri_plugin_deep_link::DeepLinkExt;
use url::Url;

// Internal chat module imports
use crate::chat::{
    initialize::{united_chat_init, united_chat_stop, UnitedChat},
    twitch::{
        auth::{link::twitch_auth, skip::link_process, start::linking, unlink::twitch},
        get_user::get_user,
    },
    youtube::{
        channel::manager::{
            get_current_channel, set_channel, start_monitoring, stop_monitoring,
            update_channel_info,
        },
        polling::{get_live_chat_cmd, get_video_cmd},
        state_manager::{
            delete_video_from_db, get_all_videos, get_video_from_db, store_new_livestream,
            update_video, update_video_metadata, StoredVideos,
        },
    },
};

// Internal misc module imports
use crate::misc::{
    editor::{
        get_theme::{get_theme, get_themes},
        open_windows::{
            close_mock_chat_window, hide_webchat_window, open_mock_chat_window, open_webchat_window,
        },
        save_theme::{delete_folder, delete_theme, rename_theme, save_theme, save_theme_folder},
    },
    qol::{
        check_if_unsaved::check_if_unsaved,
        get_focus::{focus_event_emitter, get_focus_state},
        linking_ais::twitch_linking,
        logging::setup_logging,
    },
    setup::{setup_complete, SetupState},
};

fn extract_info(urls: Vec<Url>) -> HashMap<String, String> {
    urls.into_iter()
        .filter_map(|url| {
            if url.scheme() == "unitedchat" && url.host().is_some() {
                let mut map = HashMap::new();
                map.insert("scheme".to_string(), url.scheme().to_string());
                map.insert("host".to_string(), url.host().unwrap().to_string());
                map.insert(
                    "fragment".to_string(),
                    url.fragment().unwrap_or("").to_string(),
                );
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

    // Initialize logging
    if let Err(e) = setup_logging() {
        eprintln!("Failed to initialize logging: {}", e);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let deep = app.deep_link().get_current().unwrap();
            if let Some(urls) = deep {
                let parsed_urls = extract_info(urls);
                if let Some(url) = parsed_urls.get("host") {
                    if url == "twitch_link" {
                        let args: Vec<&str> =
                            parsed_urls.get("fragment").unwrap().split('&').collect();
                        let _ = twitch_auth(app, args);
                    }
                }
            }
        }))
        .plugin(tauri_plugin_localhost::Builder::new(9889).build())
        .manage(Mutex::new(SetupState::default()))
        .manage(Mutex::new(StoredVideos::default()))
        .manage(UnitedChat::default())
        .setup(|app| {
            app.deep_link().register("unitedchat").unwrap();

            let host = std::env::var("TAURI_DEV_HOST").unwrap_or_else(|_| "localhost".to_string());
            let url = format!("http://{}:{}/auth", host, 3000).parse().unwrap();

            WebviewWindowBuilder::new(app, "splashscreen".to_string(), WebviewUrl::External(url))
                .title("United Chat - Splashscreen")
                .resizable(false)
                .visible(true)
                .center()
                .closable(true)
                .inner_size(600.0, 600.0)
                .build()?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            setup_complete,
            linking,
            link_process,
            twitch,
            get_user,
            // Editor
            get_theme,
            get_themes,
            save_theme,
            save_theme_folder,
            rename_theme,
            delete_theme,
            delete_folder,
            check_if_unsaved,
            // WebChat Window
            open_webchat_window,
            open_mock_chat_window,
            hide_webchat_window,
            close_mock_chat_window,
            // YouTube
            get_video_cmd,
            get_live_chat_cmd,
            store_new_livestream,
            get_all_videos,
            get_video_from_db,
            delete_video_from_db,
            update_video_metadata,
            update_video,
            // Youtube Channel
            set_channel,
            start_monitoring,
            stop_monitoring,
            get_current_channel,
            update_channel_info,
            // Chat Start/Stop
            united_chat_init,
            united_chat_stop,
            // Account Linking After initial Setup
            twitch_linking,
            get_focus_state,
            focus_event_emitter,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

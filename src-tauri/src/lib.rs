mod chat;
mod misc;

use crate::chat::twitch::auth::twitch_deauth;
use crate::misc::editor::get_theme::get_themes;
use crate::misc::editor::save_theme::save_theme;
use chat::twitch::auth::{skip_twitch_auth, start_twitch_link, twitch_auth};
use chat::twitch::get_user::get_user;
use chat::twitch::websocket_client::{connect_twitch_websocket, stop_connections, TwitchWebsocketChat};
use misc::editor::get_app_url::{hide_webchat_window, open_webchat_window};
use misc::editor::get_theme::get_theme;
use misc::qol::check_if_unsaved::check_if_unsaved;
use misc::setup::{setup_complete, SetupState};
use std::backtrace;
use std::io::Write;
use std::sync::Mutex;
use tauri::{Emitter, Listener, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_deep_link::DeepLinkExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::panic::set_hook(Box::new(|info| {
        let path = dirs::config_dir().unwrap().join("United Chat").join("logs");

        if !path.exists() {
            std::fs::create_dir_all(&path).expect("Failed to create directory");
        }

        // Timestamp: dd-mm-yyyy-hh-mm
        let timestamp = chrono::Local::now().format("%d-%m-%Y-%H-%M");
        let file_name = format!("error-{}.log", timestamp);
        let file_path = path.join(file_name);

        std::fs::File::create(file_path.clone()).expect("Failed to create file");

        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .append(true)
            .open(file_path)
            .expect("Failed to open file");

        let error = format!(
            "Error: {}\nBacktrace: {:?}\n",
            info,
            backtrace::Backtrace::capture()
        );

        file.write_all(error.clone().as_bytes()).expect("Failed to write to file");

        eprint!("{}", error)
    }));

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
        .manage(TwitchWebsocketChat::default())
        .manage(Mutex::new(SetupState {
            frontend_task: false,
            backend_task: false,
        }))
        .setup(|app| {
            #[cfg(windows)]
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
            start_twitch_link,
            skip_twitch_auth,
            twitch_deauth,
            connect_twitch_websocket,
            stop_connections,
            get_user,
            get_theme,
            get_themes,
            save_theme,
            check_if_unsaved,
            open_webchat_window,
            hide_webchat_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

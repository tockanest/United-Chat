use crate::chat::twitch::auth::structs::{
    ImplicitGrantFlow, UserInformation, UserInformationState, UserSkippedInformation,
};
use crate::chat::youtube::channel::manager::init_channel_manager;
use crate::chat::youtube::state_manager::get_all_videos;
use crate::misc::editor::get_theme::initialize_default_themes;
use crate::misc::qol::database::config::DatabaseConfig;
use crate::misc::qol::database::manager::DatabaseManager;
use crate::misc::qol::database::state::DatabaseState;
use keyring::Entry;
use serde_json::json;
use std::fs;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tokio::task;

#[derive(Default)]
pub(crate) struct SetupState {
    pub(crate) frontend_task: bool,
    pub(crate) backend_task: bool,
}

fn get_password(service: &str, username: &str) -> Result<String, keyring::Error> {
    let entry = Entry::new(service, username)?;
    entry.get_password()
}

async fn backend_setup(app: AppHandle) {
    let db_manager = DatabaseManager::new();
    let config = DatabaseConfig::default();
    db_manager.initialize(Some(config)).await.unwrap();
    app.manage(DatabaseState::new(db_manager));

    let app_clone = app.clone();

    match get_password("united-chat", "twitch-auth") {
        Ok(auth) => {
            let parsed: ImplicitGrantFlow = serde_json::from_str(&auth).unwrap();

            // Manage state directly after parsing
            app_clone.manage(Mutex::new(ImplicitGrantFlow {
                access_token: parsed.access_token,
                scope: parsed.scope,
                state: parsed.state,
                token_type: parsed.token_type,
                error: parsed.error,
                error_description: parsed.error_description,
                skipped: parsed.skipped,
            }));

            let path = dirs::config_dir().unwrap().join("United Chat");
            if !path.exists() {
                fs::create_dir_all(&path).expect("Failed to create directory");
            }

            let user_file = path.join("twitch-auth.json");
            // Read the file
            let file = std::fs::File::open(user_file.clone()).expect("Failed to open file");
            let user: UserInformation = serde_json::from_reader(file).unwrap_or_else(|e| {
                // Emit an event and panic if the file can't be read
                app.emit(
                    "splashscreen::twitch_auth",
                    json!({
                        "success": false,
                        "error": e.to_string()
                    }),
                )
                .expect("Failed to emit setup_complete event");
                panic!("Error: {}", e);
            });

            // Manage the user information
            match app.try_state::<UserInformationState>() {
                Some(state) => {
                    let mut state = state
                        .lock()
                        .map_err(|e| format!("Failed to lock user state: {}", e))
                        .unwrap();
                    *state = user;
                }
                None => {
                    app.manage(Mutex::new(user));
                }
            }

            task::spawn_blocking(move || {
                let runtime = tokio::runtime::Runtime::new().unwrap();
                runtime.block_on(setup_complete(app.clone(), "backend".to_string()))
            });
        }
        Err(_) => {
            match get_password("united-chat", "twitch-noauth") {
                Ok(auth) => {
                    println!("No authentication found, skipping setup");
                    let parsed: UserSkippedInformation = serde_json::from_str(&auth).unwrap();

                    // Manage state directly after parsing
                    app_clone.manage(Mutex::new(UserSkippedInformation {
                        full_channel_url: parsed.full_channel_url,
                        username: parsed.username,
                    }));

                    app_clone.manage(Mutex::new(ImplicitGrantFlow {
                        access_token: "".to_string(),
                        scope: "".to_string(),
                        state: "".to_string(),
                        token_type: "".to_string(),
                        error: Option::from("".to_string()),
                        error_description: Option::from("".to_string()),
                        skipped: Option::from(true),
                    }));

                    task::spawn_blocking(move || {
                        let runtime = tokio::runtime::Runtime::new().unwrap();
                        runtime.block_on(setup_complete(app.clone(), "backend".to_string()))
                    });
                }
                Err(_) => {
                    // There's no authentication set, we remove all data set on browser storage, mainly the keys: twitch_linked, setup_skipped
                    app.emit_to(
                        "splashscreen",
                        "twitch_auth",
                        json!({"success": false, "error": "No authentication found"}),
                    )
                    .unwrap();
                    return;
                }
            }
        }
    };

    // Initialize default themes with error handling
    if let Err(e) = initialize_default_themes(&app_clone) {
        log::error!("Failed to initialize default themes: {}", e);
        // Continue with the setup process even if theme initialization fails
    }

    init_channel_manager(&app_clone).await;
    get_all_videos(app_clone, Option::from(true), None)
        .await
        .unwrap();
}

#[tauri::command]
pub(crate) async fn setup_complete(app: AppHandle, task: String) -> Result<(), ()> {
    let state = app
        .try_state::<Mutex<SetupState>>()
        .expect("Setup state should be initialized");

    // Even if poisoned, get the state and continue
    let mut state_lock = state.lock().unwrap_or_else(|poisoned| {
        println!("Recovering from poisoned state");
        poisoned.into_inner()
    });

    match task.as_str() {
        "frontend" => {
            state_lock.frontend_task = true;
            task::spawn(backend_setup(app.clone()));
        }
        "backend" => {
            state_lock.backend_task = true;
        }
        _ => {
            println!("Unknown task");
        }
    }

    if state_lock.frontend_task && state_lock.backend_task {
        let splash_window = app
            .get_webview_window("splashscreen")
            .and_then(|window| Some(window));

        // Check if the window exists and set it to hidden if it does
        if let Some(ref splash_window) = splash_window {
            splash_window.hide().unwrap();
        }

        let main_window =
            WebviewWindowBuilder::new(&app, "main".to_string(), WebviewUrl::default())
                .title("United Chat")
                .build();

        match main_window {
            Ok(window) => {
                window.maximize().unwrap();
            }
            Err(e) => {
                println!("Failed to create main window: {}", e);
            }
        }

        // Close the splash window
        if let Some(splash_window) = splash_window {
            splash_window.close().unwrap();
        }
    }

    // Drop setup to prevent poisoning
    drop(state_lock);

    Ok(())
}

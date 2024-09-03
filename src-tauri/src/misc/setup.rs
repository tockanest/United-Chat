use crate::chat::twitch::auth::{ImplicitGrantFlow, UserInformation, UserSkippedInformation};
use crate::misc::editor::get_theme::get_themes;
use keyring::Entry;
use serde_json::json;
use sled::Db;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};
use tokio::task;

pub(crate) struct SetupState {
    pub(crate) frontend_task: bool,
    pub(crate) backend_task: bool,
}

fn get_password(service: &str, username: &str) -> Result<String, keyring::Error> {
    let entry = Entry::new(service, username)?;
    entry.get_password()
}

fn get_database_path() -> PathBuf {
    let path = dirs::config_dir().unwrap().join("United Chat").join("database");
    if !path.exists() {
        fs::create_dir_all(&path).expect("Failed to create directory");
    }
    path.join("united_chat.db")
}

pub(crate) fn initialize_database() -> Arc<Db> {
    let db_path = get_database_path();
    let db = sled::open(db_path).expect("Failed to open sled database");
    Arc::new(db)
}

async fn backend_setup(app: AppHandle) {
    let app_clone = app.clone();

    match get_password("united-chat", "twitch-auth") {
        Ok(auth) => {
            let parsed: ImplicitGrantFlow = serde_json::from_str(&auth).unwrap();

            // Manage state directly after parsing
            app_clone.manage(ImplicitGrantFlow {
                access_token: parsed.access_token,
                scope: parsed.scope,
                state: parsed.state,
                token_type: parsed.token_type,
                error: parsed.error,
                error_description: parsed.error_description,
                skipped: parsed.skipped,
            });

            let path = dirs::config_dir().unwrap().join("United Chat");
            if !path.exists() {
                std::fs::create_dir_all(&path).expect("Failed to create directory");
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
            app.manage(user.clone());

            task::spawn_blocking(move || {
                let runtime = tokio::runtime::Runtime::new().unwrap();
                runtime.block_on(setup_complete(
                    app.clone(),
                    app.state::<Mutex<SetupState>>(),
                    "backend".to_string(),
                ))
            });
        }
        Err(_) => {
            match get_password("united-chat", "twitch-noauth") {
                Ok(auth) => {
                    println!("No authentication found, skipping setup");
                    let parsed: UserSkippedInformation = serde_json::from_str(&auth).unwrap();

                    // Manage state directly after parsing
                    app_clone.manage(UserSkippedInformation {
                        full_channel_url: parsed.full_channel_url,
                        username: parsed.username,
                    });

                    app_clone.manage(ImplicitGrantFlow {
                        access_token: "".to_string(),
                        scope: "".to_string(),
                        state: "".to_string(),
                        token_type: "".to_string(),
                        error: Option::from("".to_string()),
                        error_description: Option::from("".to_string()),
                        skipped: Option::from(true),
                    });

                    task::spawn_blocking(move || {
                        let runtime = tokio::runtime::Runtime::new().unwrap();
                        runtime.block_on(setup_complete(
                            app.clone(),
                            app.state::<Mutex<SetupState>>(),
                            "backend".to_string(),
                        ))
                    });
                }
                Err(_) => {
                    // There's no authentication set, we remove all data set on browser storage, mainly the keys: twitch_linked, setup_skipped
                    app.emit_to("splashscreen", "twitch_auth", json!({"success": false, "error": "No authentication found"})).unwrap();
                    return;
                }
            }
        }
    };

    let themes = get_themes(app_clone.clone()).await.unwrap();

    // Manage the themes state
    app_clone.manage(crate::misc::editor::save_theme::ThemeState {
        themes,
    });
}

#[tauri::command]
pub(crate) async fn setup_complete(
    app: AppHandle,
    state: State<'_, Mutex<SetupState>>,
    task: String,
) -> Result<(), ()> {
    let mut state_lock = state.lock().unwrap();

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
        let splash_window = app.get_webview_window("splashscreen").unwrap();
        splash_window.close().unwrap();

        WebviewWindowBuilder::new(&app, "main".to_string(), WebviewUrl::default())
            .title("United Chat")
            .build()
            .unwrap()
            .maximize()
            .unwrap();
    }

    drop(state_lock);
    Ok(())
}

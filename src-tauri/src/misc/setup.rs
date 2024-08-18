use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::task;

pub(crate) struct SetupState {
    pub(crate) frontend_task: bool,
    pub(crate) backend_task: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub(crate) struct TwitchAuth {
    pub(crate) device_code: Option<String>,
    pub(crate) expires_in: Option<u64>,
    pub(crate) refresh_token: Option<String>,
    pub(crate) scope: Option<Vec<String>>,
    pub(crate) skip: Option<bool>,
}

async fn backend_setup(app: AppHandle) {
    let app_clone = app.clone();

    // Try to get the Twitch authentication from the keyring first
    let twitch_auth = match Entry::new("united-chat", "twitch-auth") {
        Ok(entry) => {
            let auth = entry.get_password().unwrap();

            let parsed: Vec<Vec<String>> = serde_json::from_str(&auth.clone()).unwrap();

            let mut val = TwitchAuth {
                device_code: None,
                expires_in: None,
                refresh_token: None,
                scope: None,
                skip: None,
            };

            for i in parsed {
                match i[0].as_str() {
                    "access_token" => val.device_code = Some(i[1].clone()),
                    "expires_in" => val.expires_in = Some(i[1].parse().unwrap()),
                    "refresh_token" => val.refresh_token = Some(i[1].clone()),
                    "scope" => val.scope = Some(i[1].split(", ").map(|s| s.to_string()).collect()),
                    "skip" => val.skip = Some(i[1].parse().unwrap()),
                    _ => {}
                }
            }

            app.manage(val);

            task::spawn_blocking(move || {
                let runtime = tokio::runtime::Runtime::new().unwrap();
                runtime.block_on(setup_complete(
                    app.clone(),
                    app.state::<Mutex<SetupState>>(),
                    "backend".to_string(),
                    None,
                ))
            })
        }
        Err(_) => {
            // If the keyring entry doesn't exist, send an event to the frontend to start the Twitch authentication process
            app_clone.emit_to("splashscreen", "splashscreen::twitch-reauth", true).unwrap();
            panic!("Twitch auth not found");
        }
    };
}

#[tauri::command]
pub(crate) async fn setup_complete(
    app: AppHandle,
    state: State<'_, Mutex<SetupState>>,
    task: String,
    skip: Option<bool>,
) -> Result<(), ()> {
    let mut state_lock = state.lock().unwrap();

    match task.as_str() {
        "frontend" => {
            state_lock.frontend_task = true;

            if Some(true) == skip {
                state_lock.backend_task = true;

                // manage TwitchAuth struct
                let twitch_auth = TwitchAuth {
                    device_code: None,
                    expires_in: None,
                    refresh_token: None,
                    scope: None,
                    skip: Some(true),
                };

                app.manage(twitch_auth);
            } else {
                task::spawn(backend_setup(app.clone()));
            }
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
        let main_window = app.get_webview_window("main").unwrap();
        splash_window.close().unwrap();
        main_window.show().unwrap();
    }

    drop(state_lock);
    Ok(())
}

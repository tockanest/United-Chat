use crate::chat::twitch::auth::structs::{ImplicitGrantFlow, ImplicitGrantFlowState, UserSkippedInformation};
use keyring::Entry;
use std::fs::OpenOptions;
use std::io::Write;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub(crate) async fn link_process(app: AppHandle, full_url: String, username: String) -> bool {
    // Clear any existing auth state first
    if let Ok(entry) = Entry::new("united-chat", "twitch-auth") {
        let _ = entry.delete_credential();
    }

    let user = UserSkippedInformation {
        full_channel_url: full_url,
        username,
    };

    let grant_flow = ImplicitGrantFlow {
        access_token: String::new(),
        scope: String::new(),
        state: String::new(),
        token_type: String::new(),
        error: None,
        error_description: None,
        skipped: Some(true),
    };

    match app.try_state::<ImplicitGrantFlowState>() {
        Some(state) => {
            let mut state = state
                .lock()
                .map_err(|e| format!("Failed to lock auth state: {}", e)).unwrap();
            *state = grant_flow
        }
        None => {
            app.manage(Mutex::new(Mutex::new(grant_flow)));
        }
    }

    // Save skipped auth info
    if let Ok(entry) = Entry::new("united-chat", "twitch-noauth") {
        let _ = entry.set_password(&serde_json::to_string(&user).unwrap());
    }

    let path = dirs::config_dir().unwrap().join("United Chat");
    if !path.exists() {
        std::fs::create_dir_all(&path).expect("Failed to create directory");
    }

    let user_file = path.join("twitch-auth.json");
    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(user_file)
        .expect("Failed to open file");

    file.write_all(serde_json::to_string(&user).unwrap().as_bytes())
        .expect("Failed to write to file");

    true
}
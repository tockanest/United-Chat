use crate::chat::twitch::auth::start::validate_user;
use crate::chat::twitch::auth::structs::{ImplicitGrantFlow, ImplicitGrantFlowState, UserInformation, UserInformationState};
use keyring::Entry;
use std::collections::HashMap;
use std::fs::OpenOptions;
use std::io::Write;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

pub(crate) fn twitch_auth(app: &AppHandle, query_parameters: Vec<&str>) -> Result<(), String> {
    // Clear existing auth credentials
    for credential in ["twitch-noauth", "twitch-auth"] {
        if let Ok(entry) = Entry::new("united-chat", credential) {
            if let Err(e) = entry.delete_credential() {
                eprintln!("Failed to delete {} credential: {}", credential, e);
            }
        }
    }

    // Parse parameters
    let params_map: HashMap<String, String> = query_parameters
        .into_iter()
        .filter_map(|param| {
            let mut parts = param.splitn(2, '=');
            Some((
                parts.next()?.trim().to_string(),
                parts.next()?.trim().to_string(),
            ))
        })
        .collect();

    // Extract and validate required fields
    let access_token = params_map.get("access_token").ok_or("Missing access token")?;
    let scope = params_map.get("scope").ok_or("Missing scope")?;
    let state = params_map.get("state").ok_or("Missing state")?;
    let token_type = params_map.get("token_type").ok_or("Missing token type")?;

    if access_token.is_empty() || scope.is_empty() || state.is_empty() || token_type.is_empty() {
        let default_flow = ImplicitGrantFlow {
            access_token: String::new(),
            scope: String::new(),
            state: String::new(),
            token_type: String::new(),
            error: Some("Validation failed".to_string()),
            error_description: Some("Required fields are missing".to_string()),
            skipped: None,
        };

        update_app_state(app, UserInformation::default(), default_flow)?;

        app.emit("splashscreen::twitch_auth", false)
            .map_err(|e| format!("Failed to emit auth failure: {}", e))?;

        return Err("Missing required fields".into());
    }

    // Validate user
    match validate_user(access_token.clone()) {
        Ok(user) => {
            let auth_state = ImplicitGrantFlow {
                access_token: access_token.clone(),
                scope: scope.clone(),
                state: state.clone(),
                token_type: token_type.clone(),
                error: None,
                error_description: None,
                skipped: Some(false),
            };

            // Save to keyring
            if let Ok(entry) = Entry::new("united-chat", "twitch-auth") {
                entry
                    .set_password(&serde_json::to_string(&Mutex::new(auth_state.clone())).unwrap())
                    .map_err(|e| format!("Failed to save to keyring: {}", e))?;
            }

            // Save user info to file
            let path = dirs::config_dir()
                .ok_or("Could not find config directory")?
                .join("United Chat");

            std::fs::create_dir_all(&path)
                .map_err(|e| format!("Failed to create directory: {}", e))?;

            let user_file = path.join("twitch-auth.json");
            let mut file = OpenOptions::new()
                .write(true)
                .create(true)
                .truncate(true)
                .open(user_file)
                .map_err(|e| format!("Failed to open file: {}", e))?;

            file.write_all(serde_json::to_string(&user).unwrap().as_bytes())
                .map_err(|e| format!("Failed to write to file: {}", e))?;

            // Update application state
            update_app_state(app, user.clone(), auth_state)?;

            app.emit("splashscreen::twitch_auth", true)
                .map_err(|e| format!("Failed to emit auth success: {}", e))?;

            Ok(())
        }
        Err(e) => {
            eprintln!("User validation failed: {}", e);
            app.emit("splashscreen::twitch_auth", false)
                .map_err(|e| format!("Failed to emit auth failure: {}", e))?;
            Err(format!("User validation failed: {}", e))
        }
    }
}

// Helper function to update application state
fn update_app_state(
    app: &AppHandle,
    user: UserInformation,
    auth: ImplicitGrantFlow,
) -> Result<(), String> {
    // Update user state
    match app.try_state::<UserInformationState>() {
        Some(state) => {
            let mut state = state
                .lock()
                .map_err(|e| format!("Failed to lock user state: {}", e))?;
            *state = user;
        }
        None => {
            app.manage(Mutex::new(user));
        }
    }

    // Update auth state
    match app.try_state::<ImplicitGrantFlowState>() {
        Some(state) => {
            let mut state = state
                .lock()
                .map_err(|e| format!("Failed to lock auth state: {}", e))?;
            *state = auth;
        }
        None => {
            app.manage(Mutex::new(auth));
        }
    }

    Ok(())
}
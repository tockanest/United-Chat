use crate::misc::qol::database::state::DatabaseState;
use keyring::Entry;
use std::fs;
use tauri::{AppHandle, Manager, WebviewWindowBuilder};
use tracing::{error, info};

#[tauri::command]
pub async fn twitch_linking(app: AppHandle) -> Result<(), String> {
    info!("Starting Twitch unlinking process");

    // Handle keyring cleanup
    if let Ok(entry) = Entry::new("united-chat", "twitch-noauth") {
        if let Err(e) = entry.delete_credential() {
            error!("Failed to delete credential: {}", e);
        }
    }

    // Clean up configuration file
    let path = dirs::config_dir()
        .ok_or("Failed to get config directory")?
        .join("United Chat");
    let user_file = path.join("twitch-auth.json");
    if user_file.exists() {
        fs::remove_file(&user_file).map_err(|e| e.to_string())?;
    }

    // Reinitialize database
    let db_state = app.state::<DatabaseState>();
    if let Err(e) = db_state.0.reinitialize().await {
        error!("Database reinitialization failed: {}", e);
        return Err(format!("Database reinitialization failed: {}", e));
    }

    // Handle window management
    info!("Managing windows");
    if let Some(main_window) = app.get_webview_window("main") {
        main_window.close().map_err(|e| e.to_string())?;
    }

    // Create new splashscreen window
    WebviewWindowBuilder::from_config(&app, &app.config().app.windows.get(0).unwrap().clone())
        .map_err(|e| e.to_string())?
        .build()
        .map_err(|e| e.to_string())?;

    info!("Twitch unlinking process completed");
    Ok(())
}
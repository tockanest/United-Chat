use crate::chat::twitch::auth::structs::{ImplicitGrantFlow, ImplicitGrantFlowState, UserInformation, UserInformationState};
use keyring::Entry;
use tauri::{AppHandle, Manager, WebviewWindowBuilder};

#[tauri::command]
pub(crate) async fn twitch(app: AppHandle) -> bool {
    // Clear both auth and no-auth credentials
    if let Ok(entry) = Entry::new("united-chat", "twitch-auth") {
        let _ = entry.delete_credential();
    }
    if let Ok(entry) = Entry::new("united-chat", "twitch-noauth") {
        let _ = entry.delete_credential();
    }

    // Clear auth file
    let path = dirs::config_dir().unwrap().join("United Chat");
    let user_file = path.join("twitch-auth.json");
    if user_file.exists() {
        let _ = std::fs::remove_file(user_file);
    }

    // Set empty states
    {
        let user_state = app.state::<UserInformationState>();
        let mut user_state = user_state.lock().unwrap();
        *user_state = UserInformation::default();

        let auth_state = app.state::<ImplicitGrantFlowState>();
        let mut auth_state = auth_state.lock().unwrap();
        *auth_state = ImplicitGrantFlow::default();

        drop(user_state);
        drop(auth_state);
    }

    // Handle window management
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.close();
    }

    if let Ok(builder) = WebviewWindowBuilder::from_config(&app, &app.config().app.windows.get(0).unwrap().clone()) {
        let _ = builder.build();
    }

    true
}
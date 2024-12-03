use crate::chat::twitch::auth::structs::{ImplicitGrantFlowState, UserInformation, UserInformationState};
use tauri::{AppHandle, Manager};

#[tauri::command]
pub(crate) fn get_user(app: AppHandle) -> Result<UserInformation, String> {
    let state = match app.try_state::<ImplicitGrantFlowState>() {
        None => {
            panic!("Auth Not Found")
        }
        Some(state) => state
    };
    let state = state.lock().map_err(|e| format!("Failed to lock state: {}", e))?;

    println!("{:?}", state);

    match state.skipped {
        Some(skipped) if !skipped => {
            let user_state = app.state::<UserInformationState>();
            // Get the user information from the mutex
            let user_information = user_state
                .lock()
                .map_err(|e| format!("Failed to lock user state: {}", e))?
                .clone();
            Ok(user_information)
        }
        Some(_) => Err("Setup was skipped, there's no user linked.".into()),
        None => Err("Twitch auth not found".into()),
    }
}
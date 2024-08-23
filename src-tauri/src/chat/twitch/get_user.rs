use crate::chat::twitch::auth::{ImplicitGrantFlow, UserInformation};
use std::ops::Deref;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub(crate) async fn get_user(app: AppHandle) -> Result<UserInformation, String> {
    let state = app.state::<ImplicitGrantFlow>();

    // Check if the setup was skipped by checking the "skipped" flag on the state: skipped: Option<bool>
    if let Some(skipped) = state.skipped {
        if !skipped {
            let user_state = app.state::<UserInformation>();
            // Retrieve from state the user information
            let user_information = user_state.deref().clone();
            Ok(user_information)
        } else {
            Err("Setup was skipped, there's no user to be ".into())
        }
    } else {
        Err("Twitch auth not found".into())
    }
}
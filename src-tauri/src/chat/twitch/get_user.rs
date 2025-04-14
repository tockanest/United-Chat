use crate::chat::twitch::auth::structs::{
    ImplicitGrantFlowState, UserInformation, UserInformationState,
};
use anyhow::anyhow;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetUserResponse {
    success: bool,
    reason: String,
    setup_skipped: bool,
    user: Option<UserInformation>,
}

#[tauri::command]
pub(crate) fn get_user(app: AppHandle) -> tauri::Result<GetUserResponse> {
    let state = match app.try_state::<ImplicitGrantFlowState>() {
        None => {
            return Ok(GetUserResponse {
                success: false,
                reason: "Twitch auth not found".to_string(),
                setup_skipped: false,
                user: None,
            });
        }
        Some(state) => state,
    };
    let state = state
        .lock()
        .map_err(|e| tauri::Error::Anyhow(anyhow!(e.to_string())))?;

    match state.skipped {
        Some(skipped) if !skipped => {
            let user_state = app.state::<UserInformationState>();
            // Get the user information from the mutex
            let user_information = user_state
                .lock()
                .map_err(|e| tauri::Error::Anyhow(anyhow!(e.to_string())))?
                .clone();

            Ok(GetUserResponse {
                success: true,
                reason: "".to_string(),
                setup_skipped: false,
                user: Some(user_information),
            })
        }
        Some(_) => Ok(GetUserResponse {
            success: true,
            reason: "Setup was skipped, there's no user linked.".to_string(),
            setup_skipped: true,
            user: None,
        }),
        None => Ok(GetUserResponse {
            success: false,
            reason: "Twitch auth not found".to_string(),
            setup_skipped: false,
            user: None,
        }),
    }
}

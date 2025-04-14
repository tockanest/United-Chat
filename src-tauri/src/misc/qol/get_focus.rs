use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WindowEvent};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GetFocusState {
    Focused,
    Unfocused,
    Unknown,
}

// Create a struct to hold the focus state
pub struct FocusStateManager {
    state: Mutex<GetFocusState>,
}

impl FocusStateManager {
    pub fn set_state(&self, new_state: GetFocusState) {
        if let Ok(mut state) = self.state.lock() {
            *state = new_state;
        }
    }

    pub fn get_state(&self) -> GetFocusState {
        self.state
            .lock()
            .map(|state| state.clone())
            .unwrap_or(GetFocusState::Unknown)
    }
}

#[tauri::command]
pub async fn focus_event_emitter(app: AppHandle) {
    tokio::spawn(async move {
        let app_clone = app.clone();
        let window = app_clone.get_webview_window("main").unwrap();

        window.clone().on_window_event(move |event| match event {
            WindowEvent::Focused(focused) => {
                if *focused {
                    let focus_manager = app_clone.try_state::<FocusStateManager>();
                    if let Some(focus_manager) = focus_manager {
                        focus_manager.set_state(GetFocusState::Focused);
                    }

                    window.emit("focus-event", GetFocusState::Focused).unwrap();
                } else {
                    let focus_manager = app_clone.try_state::<FocusStateManager>();
                    if let Some(focus_manager) = focus_manager {
                        focus_manager.set_state(GetFocusState::Unfocused);
                    }

                    window
                        .emit("focus-event", GetFocusState::Unfocused)
                        .unwrap();
                }
            }
            _ => {
                window.emit("focus-event", GetFocusState::Unknown).unwrap();
            }
        });
    });
}

#[tauri::command]
pub async fn get_focus_state(app: AppHandle) -> GetFocusState {
    let focus_manager = app.state::<FocusStateManager>();
    focus_manager.get_state()
}

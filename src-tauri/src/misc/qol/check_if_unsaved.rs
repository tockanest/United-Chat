use crate::misc::editor::get_theme::ThemeState;
use tauri::{AppHandle, Manager};

/// Check if there are any themes that have been modified but not saved.
/// Returns true if there are unsaved themes, false otherwise.
#[tauri::command]
pub(crate) async fn check_if_unsaved(
    current_theme_name: String,
    current_theme_html: String,
    current_theme_css: String,
    app: AppHandle,
) -> Result<bool, String> {
    let state = match app.try_state::<ThemeState>() {
        Some(themes) => themes,
        None => return Err("Failed to get themes".into()),
    };
    let theme_state = state.lock().unwrap();

    // Check if there are any themes that have been modified but not saved
    let unsaved_themes: Vec<_> = theme_state
        .iter()
        .filter(|(name, theme)| {
            name.as_str() != current_theme_name.as_str()
                && (theme.theme_code.html_code != current_theme_html
                    || theme.theme_code.css_code.as_deref() != Some(&current_theme_css))
        })
        .collect();

    if !unsaved_themes.is_empty() {
        return Ok(true);
    }

    Ok(false)
}

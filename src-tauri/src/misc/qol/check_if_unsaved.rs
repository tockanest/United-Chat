use std::ops::Deref;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub(crate) async fn check_if_unsaved(
    current_theme_name: String,
    current_theme_html: String,
    current_theme_css: String,
    app: AppHandle,
) -> Result<bool, String> {
    let state = app.state::<crate::misc::editor::save_theme::ThemeState>();
    let theme_state = state.deref();

    let theme = theme_state.themes.iter().find(|(name, _, _)| name == &current_theme_name);

    match theme {
        Some((_, html_path, css_path)) => {
            let html_code = std::fs::read_to_string(html_path).unwrap();
            let css_code = std::fs::read_to_string(css_path).unwrap();

            if html_code == current_theme_html && css_code == current_theme_css {
                Ok(false)
            } else {
                Ok(true)
            }
        }
        None => Err("Theme not found".into()),
    }
}
#[tauri::command]
pub(crate) async fn check_if_unsaved(
    current_theme_name: String,
    current_theme_html: String,
    current_theme_css: String,
    app: AppHandle,
) -> Result<bool, String> {
    let state = app.state::<Mutex<ThemeState>>();
    let theme_state = state.lock().unwrap();

    let theme = theme_state
        .themes
        .iter()
        .find(|(name, _, _)| name == &current_theme_name);

    match theme {
        Some((_, html_path, css_path)) => {
            // Check if the path exists
            if !html_path.exists() || !css_path.exists() {
                return Err("Theme not found".into());
            }

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

#[tauri::command]
pub(crate) async fn delete_theme(theme_name: String, app: AppHandle) -> Result<bool, String> {
    let themes_path = dirs::config_dir()
        .ok_or("Failed to get config directory")?
        .join("United Chat")
        .join("themes");

    let theme_folder = themes_path.join(&theme_name);

    // Don't allow deletion of default themes
    if theme_name == "default" || theme_name == "sakura" {
        return Err("Cannot delete default themes".into());
    }

    // Check if the theme exists
    if !theme_folder.exists() {
        return Err("Theme not found".into());
    }

    // Remove the theme directory
    std::fs::remove_dir_all(&theme_folder).map_err(|e| e.to_string())?;

    // Update the theme list
    let state = app.state::<Mutex<ThemeState>>();
    let mut theme_state = state.lock().unwrap();
    theme_state
        .themes
        .retain(|(name, _, _)| name != &theme_name);

    Ok(true)
}

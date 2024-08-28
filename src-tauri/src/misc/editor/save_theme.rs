use std::ops::Deref;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

pub(crate) struct ThemeState {
    /// (Name, HTML path, CSS path)
    pub(crate) themes: Vec<(String, PathBuf, PathBuf)>,
}

#[tauri::command]
pub(crate) async fn save_theme(html_code: String, css_code: String, theme_name: String, app: AppHandle) -> tauri::Result<bool> {
    let themes_path = dirs::config_dir().ok_or("Failed to get config directory")
        .unwrap()
        .join("United Chat")
        .join("themes");

    let folder = themes_path.join(theme_name.clone());
    if !folder.exists() {
        std::fs::create_dir_all(&folder).unwrap();
    }
    println!("Theme name: {:?}", theme_name);
    println!("Folder: {:?}", folder);
    let html_path = folder.join("index.html");
    let css_path = folder.join("style.css");

    // Save or update the html file
    std::fs::write(&html_path, html_code).unwrap();
    // Save or update the css file
    std::fs::write(&css_path, css_code).unwrap();

    // Update the theme list
    let state = app.state::<ThemeState>();
    let theme_state = state.deref();

    let theme = theme_state.themes.iter().find(|(name, _, _)| name == &theme_name);

    if let Some((_, _, _)) = theme {
        // Update the theme
        let theme = theme_state.themes.iter().map(|(name, html, css)| {
            if name == &theme_name {
                (name.clone(), html_path.clone(), css_path.clone())
            } else {
                (name.clone(), html.clone(), css.clone())
            }
        }).collect();

        app.manage(ThemeState {
            themes: theme,
        });
    } else {
        // Add the new theme
        let mut themes = theme_state.themes.clone();
        themes.push((theme_name.clone(), html_path.clone(), css_path.clone()));

        app.manage(ThemeState {
            themes,
        });
    }

    app.emit_to("main", "editor::theme_saved", Some(theme_name)).unwrap();
    Ok(true)
}
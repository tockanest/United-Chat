use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Theme {
    pub name: String,
    pub html_code: String,
    pub css_code: String,
}

pub struct ThemeState {
    pub themes: Vec<(String, PathBuf, PathBuf)>,
}

impl Theme {
    pub fn new(name: String, html_code: String, css_code: String) -> Self {
        Self {
            name,
            html_code,
            css_code,
        }
    }
}

// Function to initialize default themes at app startup
pub fn initialize_default_themes(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let themes_path = dirs::config_dir()
        .ok_or("Failed to get config directory")?
        .join("United Chat")
        .join("themes");

    // Create themes directory if it doesn't exist
    if !themes_path.exists() {
        std::fs::create_dir_all(&themes_path)?;

        // Initialize default themes
        let default_themes = [
            ("default", include_str!("../../../assets/themes/default/index.html"), include_str!("../../../assets/themes/default/style.css")),
            ("sakura", include_str!("../../../assets/themes/sakura/index.html"), include_str!("../../../assets/themes/sakura/style.css")),
        ];

        for (theme_name, html_content, css_content) in default_themes {
            let theme_dir = themes_path.join(theme_name);
            std::fs::create_dir_all(&theme_dir)?;

            std::fs::write(theme_dir.join("index.html"), html_content)?;
            std::fs::write(theme_dir.join("style.css"), css_content)?;
        }
    }

    // Initialize ThemeState
    let themes = std::fs::read_dir(&themes_path)?
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.path().is_dir())
        .map(|entry| {
            let name = entry.file_name().to_string_lossy().to_string();
            let html_path = entry.path().join("index.html");
            let css_path = entry.path().join("style.css");
            (name, html_path, css_path)
        })
        .collect();

    app.manage(Mutex::new(ThemeState { themes }));
    Ok(())
}

#[tauri::command]
pub async fn get_theme(theme: String, app: AppHandle) -> Result<Theme, String> {
    let state = app.state::<Mutex<ThemeState>>();
    let theme_state = state.lock().unwrap();

    let theme_entry = theme_state.themes.iter()
        .find(|(name, _, _)| name == &theme)
        .ok_or("Theme not found")?;

    let html_code = std::fs::read_to_string(&theme_entry.1)
        .map_err(|e| e.to_string())?;
    let css_code = std::fs::read_to_string(&theme_entry.2)
        .map_err(|e| e.to_string())?;

    Ok(Theme {
        name: theme_entry.0.clone(),
        html_code,
        css_code,
    })
}

#[tauri::command]
pub(crate) async fn get_themes(app: AppHandle) -> tauri::Result<Vec<(String, std::path::PathBuf, std::path::PathBuf)>> {
    let themes_path = dirs::config_dir().ok_or("Failed to get config directory").unwrap().join("United Chat").join("themes");

    if !themes_path.exists() {
        std::fs::create_dir_all(&themes_path)?;
        let default_theme = get_theme("default".to_string(), app.clone()).await.unwrap();
        let sakura_theme = get_theme("sakura".to_string(), app).await.unwrap();

        let default_theme_path = themes_path.join("default");
        let sakura_theme_path = themes_path.join("sakura");
        std::fs::create_dir_all(default_theme_path.clone())?;
        std::fs::create_dir_all(sakura_theme_path.clone())?;

        let mut default_file = std::fs::File::create(default_theme_path.join("index.html"))?;
        let mut sakura_file = std::fs::File::create(sakura_theme_path.join("index.html"))?;
        default_file.write_all(default_theme.html_code.as_bytes())?;
        sakura_file.write_all(sakura_theme.html_code.as_bytes())?;

        let mut css_file = std::fs::File::create(default_theme_path.join("style.css"))?;
        let mut sakura_css_file = std::fs::File::create(sakura_theme_path.join("style.css"))?;
        css_file.write_all(default_theme.css_code.as_bytes())?;
        sakura_css_file.write_all(sakura_theme.css_code.as_bytes())?;

        return Ok(vec![("default".to_string(), default_theme_path.join("index.html"), default_theme_path.join("style.css"))]);
    }

    // Get all folders from the themes directory and filter out the ones that are not directories
    let themes = std::fs::read_dir(&themes_path)?
        .filter_map(|entry| {
            entry.ok().and_then(|e| {
                if e.path().is_dir() {
                    Some(e)
                } else {
                    None
                }
            })
        })
        .map(|entry| {
            let theme_name = entry.file_name().into_string().unwrap();
            let html_path = entry.path().join("index.html");
            let css_path = entry.path().join("style.css");
            (theme_name, html_path, css_path)
        })
        .collect::<Vec<(String, std::path::PathBuf, std::path::PathBuf)>>();

    Ok(themes)
}

use crate::misc::editor::default_themes::{default, sakura};
use crate::misc::editor::save_theme::ThemeState;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Write;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize)]
pub(crate) struct Theme {
    pub(crate) name: String,
    pub(crate) html_code: String,
    pub(crate) css_code: String,
}

#[tauri::command]   
pub(crate) async fn get_theme(theme: String, app: AppHandle) -> Result<Theme, String> {
    let theme_dirs = dirs::config_dir()
        .unwrap()
        .join("United Chat")
        .join("themes");

    let default_theme = default();
    let sakura_theme = sakura();

    let mut themes = HashMap::new();
    themes.insert("default".to_string(), default_theme.clone());
    themes.insert("sakura".to_string(), sakura_theme.clone());

    if !theme_dirs.exists() {
        // Create all themes on the hashmap

        std::fs::create_dir_all(&theme_dirs).unwrap();
        for (name, _theme) in themes {
            let theme_path = theme_dirs.join(name);
            std::fs::create_dir_all(&theme_path).unwrap();

            let mut file = std::fs::File::create(theme_path.join("index.html")).unwrap();
            file.write_all("".as_bytes()).unwrap();

            let mut css_file = std::fs::File::create(theme_path.join("style.css")).unwrap();
            css_file.write_all("".as_bytes()).unwrap();
        }
    }

    match theme.as_str() {
        "default" => Ok(Theme {
            name: "default".to_string(),
            html_code: default_theme,
            css_code: "".to_string(),
        }),
        "sakura" => Ok(Theme {
            name: "sakura".to_string(),
            html_code: sakura_theme,
            css_code: "".to_string(),
        }),
        _ => {
            let state = app.state::<Mutex<ThemeState>>();
            let theme_state = state.lock().unwrap();

            let theme = theme_state.themes.iter().find(|(name, _, _)| name == &theme);

            match theme {
                Some((_, html_path, css_path)) => {
                    let html_code = std::fs::read_to_string(html_path).unwrap();
                    let css_code = std::fs::read_to_string(css_path).unwrap();
                    Ok(Theme {
                        name: theme.unwrap().0.clone(),
                        html_code,
                        css_code,
                    })
                }
                None => Err("Theme not found".into())
            }
        }
    }
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

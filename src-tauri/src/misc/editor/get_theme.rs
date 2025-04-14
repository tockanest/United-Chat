use anyhow::anyhow;
use log::{debug, error};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ThemeCode {
    /// This is obligatory to exist, if it doesn't exist, the theme will not be loaded.
    pub html_code: String,
    /// This is optional, if it doesn't exist, the theme will not be loaded.
    pub css_code: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ThemeHasFolder {
    /// Whether the theme has a parent folder or not. Use as a reference to know if this theme has or not a parent.
    pub has_parent: bool,
    /// This will either be a path to the parent folder directly. Can be None if the theme is at the root.
    pub parent: Option<PathBuf>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ThemeInfo {
    /// The name of the theme. Always on lower case and unique.
    pub name: String,
    /// The last time the theme was edited.
    pub last_edit: Option<chrono::DateTime<chrono::Utc>>,
    /// Will always be directly the path to the theme folder.
    /// Ex: /Users/username/Library/Application Support/United Chat/themes/Default/simple <-- Inside this folder we will have the index.html and style.css files.
    pub theme_path: PathBuf,
    /// The code of the theme.
    pub theme_code: ThemeCode,
    /// Reference to the parent theme info.
    pub has_parent: ThemeHasFolder,
}
pub type ThemeState = Mutex<HashMap<String, ThemeInfo>>;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ThemeSubFolderInfo {
    /// If the subfolder has a parent folder.
    pub has_parent: bool,
    /// The path to the parent folder.
    pub parent: Option<PathBuf>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ThemeFolder {
    /// The name of the folder.
    pub name: String,
    /// The themes inside the folder.
    pub themes: Vec<ThemeInfo>,
    /// The path to the folder.
    pub path: PathBuf,
    /// This folder can be a subfolder of another folder, so we need to know if it has a parent folder and what is the path to it.
    pub parent: Option<ThemeSubFolderInfo>,
    /// The subfolders inside the folder. This folder itself can be a subfolder of another folder.
    pub subfolders: Option<HashMap<String, ThemeFolder>>,
    /// The last time the folder was edited.
    pub last_edit: Option<chrono::DateTime<chrono::Utc>>,
}
pub type ThemeFolderState = Mutex<HashMap<String, ThemeFolder>>;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Theme {
    pub name: String,
    pub html_code: String,
    pub css_code: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ThemeError {
    pub type_: String,
    pub message: String,
    pub stack: Option<String>,
}

// Function to initialize default themes at app startup
pub fn initialize_default_themes(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    log::debug!("Initializing default themes.");

    let themes_path = dirs::config_dir()
        .ok_or("Failed to get config directory")?
        .join("United Chat")
        .join("themes");
    log::debug!("Themes path: {:?}", themes_path);

    // Create themes directory if it doesn't exist
    if !themes_path.exists() {
        std::fs::create_dir_all(&themes_path)?;
        log::debug!("Created themes directory: {:?}", themes_path);

        // Create Default folder
        let default_folder = themes_path.join("Default");
        std::fs::create_dir_all(&default_folder)?;
        log::debug!("Created default themes folder: {:?}", default_folder);

        // Initialize default themes
        let default_themes = [
            (
                "simple",
                include_str!("../../../assets/themes/default/index.html"),
                include_str!("../../../assets/themes/default/style.css"),
            ),
            (
                "sakura",
                include_str!("../../../assets/themes/sakura/index.html"),
                include_str!("../../../assets/themes/sakura/style.css"),
            ),
        ];

        for (theme_name, html_content, css_content) in default_themes {
            let theme_dir = default_folder.join(theme_name);
            std::fs::create_dir_all(&theme_dir)?;
            log::debug!("Created theme directory: {:?}", theme_dir);

            std::fs::write(theme_dir.join("index.html"), html_content)?;
            log::debug!("Wrote index.html for theme: {}", theme_name);
            std::fs::write(theme_dir.join("style.css"), css_content)?;
            log::debug!("Wrote style.css for theme: {}", theme_name);
        }
    }

    // Initialize ThemeState
    let mut themes = HashMap::new();
    let mut theme_folders = HashMap::new();

    // Read all folders and themes
    for folder_entry in std::fs::read_dir(&themes_path)? {
        let folder_entry = folder_entry?;
        if !folder_entry.path().is_dir() {
            log::debug!("Skipping non-directory entry: {:?}", folder_entry.path());
            continue;
        }

        let folder_name = folder_entry.file_name().to_string_lossy().to_string();
        let folder_path = folder_entry.path();
        let folder_metadata = std::fs::metadata(&folder_path)?;
        let mut folder_themes = Vec::new();
        let mut subfolders = HashMap::new();

        // Read themes in this folder
        for entry in std::fs::read_dir(&folder_path)? {
            let entry = entry?;
            let entry_path = entry.path();

            if entry_path.is_dir() {
                // Check if it's a theme or a subfolder
                let is_theme =
                    entry_path.join("index.html").exists() && entry_path.join("style.css").exists();

                if is_theme {
                    log::debug!("Handling theme: {}", entry.file_name().to_string_lossy());
                    // Handle theme
                    let theme_name = entry.file_name().to_string_lossy().to_string();
                    let html_path = entry_path.join("index.html");
                    let css_path = entry_path.join("style.css");

                    // Get the theme directory's last modification time
                    let theme_metadata = std::fs::metadata(&entry_path)?;
                    let last_edit = theme_metadata
                        .modified()
                        .ok()
                        .map(|t| chrono::DateTime::from(t));

                    // Read the HTML and CSS files, with error handling
                    let html_code = match std::fs::read_to_string(&html_path) {
                        Ok(content) => content,
                        Err(e) => {
                            log::error!("Failed to read HTML file for theme {}: {}", theme_name, e);
                            continue;
                        }
                    };

                    let css_code = match std::fs::read_to_string(&css_path) {
                        Ok(content) => Some(content),
                        Err(e) => {
                            log::error!("Failed to read CSS file for theme {}: {}", theme_name, e);
                            None
                        }
                    };

                    let theme_info = ThemeInfo {
                        name: theme_name.clone(),
                        last_edit,
                        theme_path: entry_path.clone(),
                        theme_code: ThemeCode {
                            html_code,
                            css_code,
                        },
                        has_parent: ThemeHasFolder {
                            has_parent: true,
                            parent: Some(folder_path.clone()),
                        },
                    };

                    themes.insert(theme_name.clone(), theme_info.clone());
                    folder_themes.push(theme_info);
                } else {
                    log::debug!(
                        "Handling subfolder: {}",
                        entry.file_name().to_string_lossy()
                    );
                    // Handle subfolder
                    let subfolder_name = entry.file_name().to_string_lossy().to_string();
                    let subfolder_metadata = std::fs::metadata(&entry_path)?;
                    let mut subfolder_themes = Vec::new();
                    let subfolder_subfolders = HashMap::new();

                    // Read themes in subfolder
                    for subentry in std::fs::read_dir(&entry_path)? {
                        let subentry = subentry?;
                        if !subentry.path().is_dir() {
                            continue;
                        }

                        let subtheme_name = subentry.file_name().to_string_lossy().to_string();
                        let subtheme_path = subentry.path();
                        let subhtml_path = subtheme_path.join("index.html");
                        let subcss_path = subtheme_path.join("style.css");

                        let subtheme_metadata = std::fs::metadata(&subtheme_path)?;
                        let subtheme_last_edit = subtheme_metadata
                            .modified()
                            .ok()
                            .map(|t| chrono::DateTime::from(t));

                        let subtheme_info = ThemeInfo {
                            name: subtheme_name.clone(),
                            last_edit: subtheme_last_edit,
                            theme_path: subtheme_path.clone(),
                            theme_code: ThemeCode {
                                html_code: std::fs::read_to_string(&subhtml_path)?,
                                css_code: Some(std::fs::read_to_string(&subcss_path)?),
                            },
                            has_parent: ThemeHasFolder {
                                has_parent: true,
                                parent: Some(entry_path.clone()),
                            },
                        };

                        themes.insert(subtheme_name.clone(), subtheme_info.clone());
                        subfolder_themes.push(subtheme_info);
                    }

                    let subfolder = ThemeFolder {
                        name: subfolder_name.clone(),
                        themes: subfolder_themes,
                        path: entry_path.clone(),
                        parent: Some(ThemeSubFolderInfo {
                            has_parent: true,
                            parent: Some(folder_path.clone()),
                        }),
                        subfolders: Some(subfolder_subfolders),
                        last_edit: subfolder_metadata
                            .modified()
                            .ok()
                            .map(|t| chrono::DateTime::from(t)),
                    };

                    subfolders.insert(subfolder_name, subfolder);
                }
            }
        }

        // Create theme folder
        let theme_folder = ThemeFolder {
            name: folder_name.clone(),
            themes: folder_themes,
            path: folder_path.clone(),
            parent: None, // Root folders have no parent
            subfolders: Some(subfolders),
            last_edit: folder_metadata
                .modified()
                .ok()
                .map(|t| chrono::DateTime::from(t)),
        };

        theme_folders.insert(folder_name, theme_folder);
    }

    app.manage(ThemeState::new(themes));
    app.manage(ThemeFolderState::new(theme_folders));
    log::debug!("Theme state initialized.");

    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum ThemeResultStatus {
    Success { theme: Theme },
    Error { error: ThemeError },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ThemeResult {
    pub status: ThemeResultStatus,
}

#[tauri::command]
pub async fn get_theme(theme: ThemeInfo, app: AppHandle) -> tauri::Result<ThemeResult> {
    let state = app.state::<ThemeState>();
    let theme_state = state.lock().unwrap();

    let theme_info = theme_state.get(&theme.name);

    match theme_info {
        Some(theme_info) => Ok(ThemeResult {
            status: ThemeResultStatus::Success {
                theme: Theme {
                    name: theme_info.name.clone(),
                    html_code: theme_info.theme_code.html_code.clone(),
                    css_code: theme_info.theme_code.css_code.clone().unwrap_or_default(),
                },
            },
        }),
        None => Ok(ThemeResult {
            status: ThemeResultStatus::Error {
                error: ThemeError {
                    type_: "storage_error".to_string(),
                    message: "Theme not found".to_string(),
                    stack: Some(
                        anyhow!("Theme not found at path: {}", theme.theme_path.display())
                            .to_string(),
                    ),
                },
            },
        }),
    }
}

#[tauri::command]
pub(crate) fn get_themes(app: AppHandle) -> tauri::Result<Vec<ThemeFolder>> {
    let state = app.state::<ThemeFolderState>();
    let theme_folders = state.lock().unwrap();

    Ok(theme_folders.values().cloned().collect())
}

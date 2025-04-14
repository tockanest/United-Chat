use crate::misc::editor::get_theme::{
    ThemeCode, ThemeFolderState, ThemeHasFolder, ThemeInfo, ThemeState,
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveThemeResponse {
    pub success: bool,
    pub error: Option<String>,
}

#[tauri::command]
pub(crate) async fn save_theme(
    html_code: String,
    css_code: String,
    theme_name: String,
    theme_parent: Option<String>,
    app: AppHandle,
) -> tauri::Result<SaveThemeResponse> {
    let themes_path = match dirs::config_dir() {
        Some(path) => path.join("United Chat").join("themes"),
        None => {
            return Ok(SaveThemeResponse {
                success: false,
                error: Some("Failed to get config directory".to_string()),
            });
        }
    };

    // Create parent folder if it doesn't exist
    let parent_folder = match &theme_parent {
        Some(parent) => themes_path.join(parent),
        None => themes_path.clone(),
    };

    if !parent_folder.exists() {
        if let Err(e) = std::fs::create_dir_all(&parent_folder) {
            return Ok(SaveThemeResponse {
                success: false,
                error: Some(format!("Failed to create parent folder: {}", e)),
            });
        }
    }

    // Create theme folder inside parent folder
    let theme_folder = parent_folder.join(&theme_name);
    if !theme_folder.exists() {
        if let Err(e) = std::fs::create_dir_all(&theme_folder) {
            return Ok(SaveThemeResponse {
                success: false,
                error: Some(format!("Failed to create theme folder: {}", e)),
            });
        }
    }

    let html_path = theme_folder.join("index.html");
    let css_path = theme_folder.join("style.css");

    // Save or update the HTML file
    if let Err(e) = std::fs::write(&html_path, &html_code) {
        return Ok(SaveThemeResponse {
            success: false,
            error: Some(format!("Failed to save HTML file: {}", e)),
        });
    }
    // Save or update the CSS file
    if let Err(e) = std::fs::write(&css_path, &css_code) {
        return Ok(SaveThemeResponse {
            success: false,
            error: Some(format!("Failed to save CSS file: {}", e)),
        });
    }

    // Get theme metadata
    let theme_metadata = match std::fs::metadata(&theme_folder) {
        Ok(metadata) => metadata,
        Err(e) => {
            return Ok(SaveThemeResponse {
                success: false,
                error: Some(format!("Failed to get theme metadata: {}", e)),
            });
        }
    };
    let last_edit = theme_metadata
        .modified()
        .ok()
        .map(|t| chrono::DateTime::from(t));

    // Create theme info
    let theme_info = ThemeInfo {
        name: theme_name.clone(),
        last_edit,
        theme_path: theme_folder.clone(),
        theme_code: ThemeCode {
            html_code,
            css_code: Some(css_code),
        },
        has_parent: ThemeHasFolder {
            has_parent: theme_parent.is_some(),
            parent: theme_parent.as_ref().map(|p| themes_path.join(p)),
        },
    };

    // Update theme state
    let state = app.state::<ThemeState>();
    let mut theme_state = state.lock().unwrap();
    theme_state.insert(theme_name.clone(), theme_info.clone());

    // Update folder state if needed
    if let Some(parent) = theme_parent {
        let folder_state = app.state::<ThemeFolderState>();
        let mut folder_state = folder_state.lock().unwrap();
        if let Some(folder) = folder_state.get_mut(&parent) {
            folder.themes.push(theme_info);
            folder.last_edit = last_edit;
        }
    }

    Ok(SaveThemeResponse {
        success: true,
        error: None,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveThemeFolderResponse {
    pub success: bool,
    pub error: Option<String>,
}

#[tauri::command]
pub(crate) async fn save_theme_folder(
    folder_name: String,
    app: AppHandle,
) -> tauri::Result<SaveThemeFolderResponse> {
    let themes_path = match dirs::config_dir() {
        Some(path) => path.join("United Chat").join("themes"),
        None => {
            return Ok(SaveThemeFolderResponse {
                success: false,
                error: Some("Failed to get config directory".to_string()),
            });
        }
    };

    let folder_path = themes_path.join(&folder_name);
    if !folder_path.exists() {
        if let Err(e) = std::fs::create_dir_all(&folder_path) {
            return Ok(SaveThemeFolderResponse {
                success: false,
                error: Some(format!("Failed to create folder: {}", e)),
            });
        }
    } else {
        return Ok(SaveThemeFolderResponse {
            success: false,
            error: Some("Folder with this name already exists".to_string()),
        });
    }

    // Create folder metadata
    let folder_metadata = match std::fs::metadata(&folder_path) {
        Ok(metadata) => metadata,
        Err(e) => {
            return Ok(SaveThemeFolderResponse {
                success: false,
                error: Some(format!("Failed to get folder metadata: {}", e)),
            });
        }
    };
    let last_edit = folder_metadata
        .modified()
        .ok()
        .map(|t| chrono::DateTime::from(t));

    // Create new folder in state
    let folder_state = app.state::<ThemeFolderState>();
    let mut folder_state = folder_state.lock().unwrap();
    folder_state.insert(
        folder_name.clone(),
        crate::misc::editor::get_theme::ThemeFolder {
            name: folder_name.clone(),
            themes: Vec::new(),
            path: folder_path,
            parent: None,
            subfolders: Some(std::collections::HashMap::new()),
            last_edit,
        },
    );

    Ok(SaveThemeFolderResponse {
        success: true,
        error: None,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RenameThemeResponse {
    pub success: bool,
    pub error: Option<String>,
}

#[tauri::command]
pub(crate) async fn rename_theme(
    old_name: String,
    new_name: String,
    app: AppHandle,
) -> tauri::Result<RenameThemeResponse> {
    let state = app.state::<ThemeState>();
    let mut theme_state = state.lock().unwrap();

    // Get the old theme info
    let old_theme = match theme_state.get(&old_name) {
        Some(theme) => theme.clone(),
        None => {
            return Ok(RenameThemeResponse {
                success: false,
                error: Some(format!("Theme '{}' not found", old_name)),
            });
        }
    };

    let old_folder = old_theme.theme_path.clone();
    let new_folder = old_folder.parent().unwrap().join(&new_name);

    // Check if new name already exists
    if new_folder.exists() {
        return Ok(RenameThemeResponse {
            success: false,
            error: Some("Theme with this name already exists".to_string()),
        });
    }

    // Rename the folder
    if let Err(e) = std::fs::rename(&old_folder, &new_folder) {
        return Ok(RenameThemeResponse {
            success: false,
            error: Some(format!("Failed to rename theme folder: {}", e)),
        });
    }

    // Update theme info
    let mut new_theme = old_theme;
    new_theme.name = new_name.clone();
    new_theme.theme_path = new_folder;

    // Update state
    theme_state.remove(&old_name);
    theme_state.insert(new_name.clone(), new_theme);

    Ok(RenameThemeResponse {
        success: true,
        error: None,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeleteThemeResponse {
    pub success: bool,
    pub error: Option<String>,
}

#[tauri::command]
pub(crate) async fn delete_theme(
    theme_name: String,
    app: AppHandle,
) -> tauri::Result<DeleteThemeResponse> {
    let state = app.state::<ThemeState>();
    let mut theme_state = state.lock().unwrap();

    // Get the theme info
    let theme_info = match theme_state.get(&theme_name) {
        Some(theme) => theme.clone(),
        None => {
            return Ok(DeleteThemeResponse {
                success: false,
                error: Some(format!("Theme '{}' not found", theme_name)),
            });
        }
    };

    // Remove from state
    theme_state.remove(&theme_name);

    // Delete the theme folder
    if theme_info.theme_path.exists() {
        if let Err(e) = std::fs::remove_dir_all(&theme_info.theme_path) {
            return Ok(DeleteThemeResponse {
                success: false,
                error: Some(format!("Failed to delete theme folder: {}", e)),
            });
        }
    }

    Ok(DeleteThemeResponse {
        success: true,
        error: None,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeleteFolderResponse {
    pub success: bool,
    pub error: Option<String>,
}

#[tauri::command]
pub(crate) async fn delete_folder(
    folder_name: String,
    app: AppHandle,
) -> tauri::Result<DeleteFolderResponse> {
    let folder_state = app.state::<ThemeFolderState>();
    let mut folder_state = folder_state.lock().unwrap();
    let theme_state = app.state::<ThemeState>();
    let mut theme_state = theme_state.lock().unwrap();

    // Get the folder info
    let folder_info = match folder_state.get(&folder_name) {
        Some(folder) => folder.clone(),
        None => {
            return Ok(DeleteFolderResponse {
                success: false,
                error: Some(format!("Folder '{}' not found", folder_name)),
            });
        }
    };

    // Remove all themes in this folder from theme state
    for theme in folder_info.themes {
        theme_state.remove(&theme.name);
    }

    // Remove the folder from state
    folder_state.remove(&folder_name);

    // Delete the folder
    if folder_info.path.exists() {
        if let Err(e) = std::fs::remove_dir_all(&folder_info.path) {
            return Ok(DeleteFolderResponse {
                success: false,
                error: Some(format!("Failed to delete folder: {}", e)),
            });
        }
    }

    Ok(DeleteFolderResponse {
        success: true,
        error: None,
    })
}

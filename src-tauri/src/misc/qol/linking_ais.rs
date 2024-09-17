use keyring::Entry;
use std::fs;
use tauri::{AppHandle, Manager, WebviewWindowBuilder};

#[tauri::command]
pub(crate) async fn twitch_linking(app: AppHandle) {
    fn get_password(service: &str, username: &str) -> Result<String, keyring::Error> {
        let entry = Entry::new(service, username)?;
        entry.get_password()
    }

    match get_password("united-chat", "twitch-auth") {
        Ok(_auth) => {
            // Remove the password from the keyring if any
            let entry = Entry::new("united-chat", "twitch-auth").unwrap();
            entry.delete_credential().unwrap();
        }
        Err(e) => {
            println!("Error: {}", e);
        }
    }

    // Remove the configuration file
    let path = dirs::config_dir().unwrap().join("United Chat");
    if !path.exists() {
        fs::create_dir_all(&path).expect("Failed to create directory");
    }

    let user_file = path.join("twitch-auth.json");
    // Delete the file
    fs::remove_file(user_file).expect("Failed to remove file");

    // Stop the main window and show the splashscreen
    let window = app.get_webview_window("main").unwrap();
    window.close().unwrap();

    // Reopen the splashscreen window to show the linking button
    WebviewWindowBuilder::from_config(&app, &app.config().app.windows.get(0).unwrap().clone())
        .unwrap()
        .build()
        .unwrap();
}
use tauri::{AppHandle, Manager, Url};

#[tauri::command]
pub(crate) fn open_webchat_window(url: String, app: AppHandle) {
    let mut webchat = app.get_webview_window("webchat").unwrap();
    // Show the webchat window with the URL loaded
    webchat.show().unwrap();
    webchat.navigate(url.parse().unwrap()).unwrap()
}

#[tauri::command]
pub(crate) fn hide_webchat_window(app: AppHandle) {
    let mut webchat = app.get_webview_window("webchat").unwrap();
    // Hide the webchat window
    webchat.hide().unwrap();
}

use tauri::{AppHandle, Error, Manager, WebviewUrl, WebviewWindowBuilder};
use url::Url;

#[tauri::command]
pub(crate) fn open_webchat_window(url: String, app: AppHandle) -> Result<(), Error> {
    let webchat = WebviewWindowBuilder::new(&app, "webchat".to_string(), WebviewUrl::default())
        .title("United Chat")
        .center()
        .transparent(true)
        .inner_size(600.0, 800.0)
        .build()?;

    // Show the webchat window
    webchat.show()?;

    // Parse the URL more safely
    let parsed_url = Url::parse(&url).map_err(|e| {
        println!("Error parsing URL: {}", e);
        Error::InvalidUrl(e)
    })?;

    // Navigate to the URL
    webchat.navigate(parsed_url)?;

    Ok(())
}

#[tauri::command]
pub(crate) async fn open_mock_chat_window(url: String, app: AppHandle) -> Result<(), Error> {
    // First check if the window already exists
    if let Some(existing_window) = app.get_webview_window("mockchat") {
        println!("Mock chat window already exists, focusing it");
        existing_window.show()?;
        existing_window.set_focus()?;
        return Ok(());
    }

    let mockchat = WebviewWindowBuilder::new(&app, "mockchat".to_string(), WebviewUrl::default())
        .title("United Chat")
        .center()
        .transparent(true)
        .inner_size(800.0, 600.0)
        .build();

    let window = match mockchat {
        Ok(window) => window,
        Err(e) => {
            println!("Error opening mock chat window: {}", e);
            return Err(e);
        }
    };

    // Parse the URL more safely with better error handling
    let parsed_url = match Url::parse(&url) {
        Ok(url) => url,
        Err(e) => {
            println!("Error parsing URL: {}", e);
            println!("Attempting to fix URL encoding...");

            // Try to handle the URL differently if parsing fails
            let fixed_url = if !url.starts_with("http://") && !url.starts_with("https://") {
                format!("http://localhost:3000/{}", url)
            } else {
                url.clone()
            };

            Url::parse(&fixed_url).map_err(|e| {
                println!("Still failed to parse URL after fixing: {}", e);
                Error::InvalidUrl(e)
            })?
        }
    };

    // Show the window after creation
    window.show()?;
    
    // Navigate to the URL
    window.navigate(parsed_url)?;

    Ok(())
}

#[tauri::command]
pub(crate) fn close_mock_chat_window(app: AppHandle) -> Result<(), Error> {
    if let Some(mockchat) = app.get_webview_window("mockchat") {
        println!("Hiding mock chat window");
        mockchat.close()?;
    } else {
        println!("Mock chat window not found");
    }
    Ok(())
}

#[tauri::command]
pub(crate) fn hide_webchat_window(app: AppHandle) -> Result<(), Error> {
    let webchat = app
        .get_webview_window("webchat")
        .ok_or(Error::WindowNotFound)?;
    webchat.close()?;
    Ok(())
}

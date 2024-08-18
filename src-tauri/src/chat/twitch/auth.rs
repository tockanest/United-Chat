use keyring::Entry;
use reqwest::multipart;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Deserialize, Debug, Clone)]
struct DeviceLinking {
    device_code: String,
    expires_in: u64,
    interval: u64,
    user_code: String,
    verification_uri: String,
}

async fn create_device_linking(client_id: &str, scopes: &str) -> Result<DeviceLinking, ()> {
    let client_id = client_id.to_string();
    let scopes = scopes.to_string();

    let form = multipart::Form::new()
        .text("client_id", client_id)
        .text("scopes", scopes);

    let client = reqwest::Client::new();
    let res: DeviceLinking = client
        .post("https://id.twitch.tv/oauth2/device")
        .multipart(form)
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();

    Ok(res)
}

async fn get_access_token(
    client_id: &str,
    scopes: &str,
    device_code: &str,
) -> Result<serde_json::Value, String> {
    let client_id = client_id.to_string();
    let scopes = scopes.to_string();
    let device_code = device_code.to_string();

    let form = multipart::Form::new()
        .text("client_id", client_id)
        .text("scopes", scopes.to_string())
        .text("device_code", device_code.to_string())
        .text("grant_type", "urn:ietf:params:oauth:grant-type:device_code");

    let client = reqwest::Client::new();
    let res: serde_json::Value = client
        .post("https://id.twitch.tv/oauth2/token")
        .multipart(form)
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();

    Ok(res)
}

#[tauri::command]
pub(crate) async fn polling_for_access_token(
    client_id: &str,
    scopes: &str,
    app: AppHandle,
) -> Result<bool, String> {
    let cdl = create_device_linking(client_id, scopes).await.unwrap();
    app.emit_to("splashscreen", "splashscreen::device_linking", cdl.clone())
        .unwrap();

    let mut res = get_access_token(client_id, scopes, &*cdl.device_code.clone()).await?;
    while res["message"].is_string() && res["message"] == "authorization_pending" {
        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        res = get_access_token(client_id, scopes, &*cdl.device_code).await?;
    }

    let access_token = res["access_token"].as_str().unwrap();
    let refresh_token = res["refresh_token"].as_str().unwrap();
    let expires_in = res["expires_in"].as_u64().unwrap();
    let expires_in_str = &expires_in.to_string();
    let scope = res["scope"]
        .as_array()
        .unwrap()
        .iter()
        .map(|s| s.as_str().unwrap())
        .collect::<Vec<&str>>();
    let scopes = scope.join(", ");

    let token_type = res["token_type"].as_str().unwrap();

    let vec = vec![
        ("access_token", access_token),
        ("refresh_token", refresh_token),
        ("expires_in", expires_in_str),
        ("scope", &*scopes),
        ("token_type", token_type),
    ];

    // Set the access token in the keyring
    let entry = Entry::new("united-chat", "twitch-auth").unwrap_or_else(|e| panic!("Error: {}", e));
    entry
        .set_password(&serde_json::to_string(&vec).unwrap())
        .unwrap_or_else(|e| panic!("Error: {}", e));

    Ok(true)
}

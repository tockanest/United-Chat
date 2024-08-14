use reqwest::multipart;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct DeviceLinking {
    device_code: String,
    expires_in: u64,
    interval: u64,
    user_code: String,
    verification_uri: String,
}

#[tauri::command]
pub(crate) async fn create_device_linking() -> Result<DeviceLinking, ()> {
    let form = multipart::Form::new()
        .text("client_id", "h3yvglc6y3kmtrzyq7it20z7vi5sa2")
        .text("scopes", "user%3Aread%3Achat");

    let client = reqwest::Client::new();
    let res: DeviceLinking = client.post("https://id.twitch.tv/oauth2/device")
        .multipart(form)
        .send()
        .await.unwrap()
        .json()
        .await.unwrap();

    Ok(res)
}

async fn get_access_token(client_id: &str, scopes: &str, device_code: &str) -> Result<serde_json::Value, String> {
    let form = multipart::Form::new()
        .text("client_id", client_id.to_string())
        .text("scopes", scopes.to_string())
        .text("device_code", device_code.to_string())
        .text("grant_type", "urn:ietf:params:oauth:grant-type:device_code");

    let client = reqwest::Client::new();
    let res: serde_json::Value = client.post("https://id.twitch.tv/oauth2/token")
        .multipart(form)
        .send()
        .await.unwrap()
        .json()
        .await.unwrap();

    if res["message"].is_string() && res["message"] == "authorization_pending" {
        return Err("Authorization pending".to_string());
    }

    Ok(res)
}

#[tauri::command]
pub(crate) async fn polling_for_access_token(client_id: &str, scopes: &str, device_code: &str) -> Result<serde_json::Value, String> {
    let mut res = get_access_token(client_id, scopes, device_code).await?;
    while res["message"].is_string() && res["message"] == "authorization_pending" {
        println!("Authorization pending");
        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        res = get_access_token(client_id, scopes, device_code).await?;
    }

    Ok(res)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_device_linking() {
        let cdl = create_device_linking().await.unwrap();
        println!("{:?}", cdl);
    }

    #[tokio::test]
    async fn test_get_access_token() {
        let cdl = create_device_linking().await.unwrap();
        let res = polling_for_access_token("h3yvglc6y3kmtrzyq7it20z7vi5sa2", "user%3Aread%3Achat", &cdl.device_code).await.unwrap();
        println!("{:?}", res);
    }
}
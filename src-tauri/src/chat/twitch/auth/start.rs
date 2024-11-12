use crate::chat::twitch::auth::structs::{InternalUserInformation, ReqUserResponse, ReqValidateResponse, UserInformation};

#[tauri::command]
pub(crate) async fn linking(client_id: &str, scopes: &str) -> Result<String, ()> {
    let client_id = client_id.to_string();
    let scopes = scopes.to_string();

    use rand::distributions::{Alphanumeric, DistString};
    let rand_state = Alphanumeric
        .sample_string(&mut rand::thread_rng(), 32)
        .to_lowercase();

    // Check if we are prod or not
    // let redirect_uri = if cfg!(debug_assertions) {
    //     "http://localhost:3001/united-chat/auth"
    // } else {
    //     "https://tockanest.com/united-chat/auth"
    // };

    let redirect_uri = "https://tockanest.com/united-chat/auth";

    let url = format!(
        "https://id.twitch.tv/oauth2/authorize?client_id={}&redirect_uri={}&response_type={}&scope={}&state={}",
        client_id,
        redirect_uri,
        "token",
        scopes,
        rand_state.to_string()
    );

    Ok(url)
}

pub(crate) fn validate_user(auth: String) -> Result<UserInformation, String> {
    let client = reqwest::blocking::Client::new();
    let response = client
        .get("https://api.twitch.tv/helix/users")
        .header("Authorization", format!("Bearer {}", auth))
        .header("Client-Id", "h3yvglc6y3kmtrzyq7it20z7vi5sa2")
        .send()
        .expect("Failed to send request");

    match response.status() {
        reqwest::StatusCode::OK => {
            // Convert the response to a JSON object
            let response_json: ReqUserResponse = response.json().expect("Failed to parse response");
            let user_info = response_json.data.first().expect("Failed to get user info");

            // Send a request to validate the user
            let client = reqwest::blocking::Client::new();
            let response = client
                .get("https://id.twitch.tv/oauth2/validate")
                .header("Authorization", format!("Bearer {}", auth))
                .send()
                .expect("Failed to send request");

            match response.status() {
                reqwest::StatusCode::OK => {
                    // Convert the response to a JSON object
                    let response_json: ReqValidateResponse =
                        response.json().expect("Failed to parse response");
                    //convert expires_in to a readable format
                    let expires_in =
                        chrono::Utc::now() + chrono::Duration::seconds(response_json.expires_in);

                    // Return the user information
                    let user = UserInformation {
                        login: response_json.login,
                        user_id: response_json.user_id,
                        expires_in: expires_in.to_string(),
                        internal_info: InternalUserInformation {
                            broadcaster_type: user_info.broadcaster_type.clone(),
                            description: user_info.description.clone(),
                            display_name: user_info.display_name.clone(),
                            id: user_info.id.clone(),
                            login: user_info.login.clone(),
                            profile_image_url: user_info.profile_image_url.clone(),
                        },
                    };

                    // Return the user information
                    Ok(user)
                }
                _e => {
                    let resp = response.text().expect("Failed to get response text");
                    Err(format!("Failed to validate user: {}", resp))
                }
            }
        }
        _e => {
            let resp = response.text().expect("Failed to get response text");
            Err(format!("Failed to get user info: {}", resp))
        }
    }
}
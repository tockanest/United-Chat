use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::OpenOptions;
use std::io::Write;
use tauri::{AppHandle, Emitter, Manager, WebviewWindowBuilder};

#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub(crate) struct ImplicitGrantFlow {
    pub(crate) access_token: String,
    pub(crate) scope: String,
    pub(crate) state: String,
    pub(crate) token_type: String,
    pub(crate) error: Option<String>,
    pub(crate) error_description: Option<String>,
    pub(crate) skipped: Option<bool>,
}

#[derive(Serialize, Deserialize, Clone, Default, Debug)]
pub(crate) struct UserInformation {
    pub(crate) login: String,
    pub(crate) user_id: String,
    pub(crate) expires_in: String,
    pub(crate) internal_info: InternalUserInformation,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct UserSkippedInformation {
    pub(crate) full_channel_url: String,
    pub(crate) username: String,
}

#[derive(Serialize, Deserialize, Clone, Default, Debug)]
pub(crate) struct InternalUserInformation {
    pub(crate) broadcaster_type: String,
    pub(crate) description: String,
    pub(crate) display_name: String,
    pub(crate) id: String,
    pub(crate) login: String,
    pub(crate) profile_image_url: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct ReqUserResponse {
    data: Vec<InternalUserInformation>,
}

#[derive(Serialize, Deserialize, Debug)]
struct ReqValidateResponse {
    client_id: String,
    login: String,
    scopes: Vec<String>,
    user_id: String,
    expires_in: i64,
}

#[tauri::command]
pub(crate) async fn start_twitch_link(client_id: &str, scopes: &str) -> Result<String, ()> {
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

fn validate_user(auth: String) -> Result<UserInformation, String> {
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

pub(crate) fn twitch_auth(app: &AppHandle, query_parameters: Vec<&str>) {
    // Convert the query parameters into a HashMap for easier access
    let mut params_map: HashMap<String, String> = HashMap::new();
    for param in query_parameters {
        let mut iter = param.splitn(2, '=');
        let key = iter.next().unwrap_or("").trim();
        let value = iter.next().unwrap_or("").trim();
        params_map.insert(key.to_string(), value.to_string());
    }

    println!("Params: {:?}", params_map);

    // Now you can access the query parameters using the map
    let access_token = params_map
        .get("access_token")
        .unwrap_or(&"".to_string())
        .to_string();
    let scope = params_map
        .get("scope")
        .unwrap_or(&"".to_string())
        .to_string();
    let state = params_map
        .get("state")
        .unwrap_or(&"".to_string())
        .to_string();
    let token_type = params_map
        .get("token_type")
        .unwrap_or(&"".to_string())
        .to_string();

    // Check if any of them are empty, and if one of them are, reset the setup
    if access_token.is_empty()
        || scope.is_empty()
        || state.is_empty()
        || token_type.is_empty()
    {
        app.emit("splashscreen::twitch_auth", false)
            .expect("Failed to emit setup_complete event");
    } else {
        // If all query parameters are present, emit the setup_complete event with the query parameters

        let user = validate_user(access_token.clone()).unwrap();
        println!("User: {:?}", user);
        app.manage(user.clone());

        // Write the user information to a json file at dirs::config_dir() / "united-chat" / "twitch-auth.json"
        let path = dirs::config_dir().unwrap().join("United Chat");
        if !path.exists() {
            std::fs::create_dir_all(&path).expect("Failed to create directory");
        }

        let user_file = path.join("twitch-auth.json");
        std::fs::File::create(user_file.clone()).expect("Failed to create file");

        let mut file = OpenOptions::new()
            .write(true)
            .open(user_file)
            .expect("Failed to open file");
        file.write_all(serde_json::to_string(&user).unwrap().as_bytes())
            .expect("Failed to write to file");

        let state = ImplicitGrantFlow {
            access_token,
            scope,
            state,
            token_type,
            error: None,
            error_description: None,
            skipped: Option::from(false),
        };
        app.manage(state.clone());

        let entry = Entry::new("united-chat", "twitch-auth")
            .unwrap_or_else(|e| panic!("Error: {}", e));
        entry
            .set_password(&serde_json::to_string(&state).unwrap())
            .unwrap_or_else(|e| panic!("Error: {}", e));

        app.emit("splashscreen::twitch_auth", true)
            .expect("Failed to emit setup_complete event");
    }
}

#[tauri::command]
pub(crate) async fn twitch_deauth(app: AppHandle) -> bool {
    let entry = Entry::new("united-chat", "twitch-auth")
        .unwrap_or_else(|e| panic!("Error: {}", e));

    match entry.delete_credential() {
        Ok(_) => {
            app.manage(UserInformation::default());
            app.manage(ImplicitGrantFlow::default());
        }
        Err(e) => {
            println!("Error: {}", e);
        }
    }

    let path = dirs::config_dir().unwrap().join("United Chat");
    if !path.exists() {
        std::fs::create_dir_all(&path).expect("Failed to create directory");
    }

    let user_file = path.join("twitch-auth.json");
    std::fs::remove_file(user_file).expect("Failed to remove file");

    let main_window = app.get_webview_window("main").unwrap();
    main_window.close().unwrap();

    WebviewWindowBuilder::from_config(&app, &app.config().app.windows.get(0).unwrap().clone())
        .unwrap()
        .build()
        .unwrap();

    true
}

#[tauri::command]
pub(crate) async fn skip_twitch_auth(full_url: String, username: String) -> bool {
    println!("Skipping auth");
    let user = UserSkippedInformation {
        full_channel_url: full_url,
        username,
    };

    let path = dirs::config_dir().unwrap().join("United Chat");
    if !path.exists() {
        std::fs::create_dir_all(&path).expect("Failed to create directory");
    }

    let user_file = path.join("twitch-auth.json");

    if !user_file.exists() {
        std::fs::File::create(user_file.clone()).expect("Failed to create file");
    }

    let mut file = OpenOptions::new()
        .write(true)
        .open(user_file)
        .expect("Failed to open file");
    file.write_all(serde_json::to_string(&user).unwrap().as_bytes())
        .expect("Failed to write to file");

    let entry = Entry::new("united-chat", "twitch-noauth")
        .unwrap_or_else(|e| panic!("Error: {}", e));

    entry
        .set_password(&serde_json::to_string(&user).unwrap())
        .unwrap_or_else(|e| panic!("Error: {}", e));

    true
}
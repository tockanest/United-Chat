use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::OpenOptions;
use std::io::Write;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub(crate) struct ImplicitGrantFlow {
    pub(crate) access_token: String,
    pub(crate) scope: String,
    pub(crate) state: String,
    pub(crate) token_type: String,
    pub(crate) error: Option<String>,
    pub(crate) error_description: Option<String>,
    pub(crate) skipped: Option<bool>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct UserInformation {
    pub(crate) login: String,
    pub(crate) user_id: String,
    pub(crate) expires_in: String,
    pub(crate) internal_info: InternalUserInformation,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct InternalUserInformation {
    pub broadcaster_type: String,
    pub description: String,
    pub display_name: String,
    pub id: String,
    pub login: String,
    pub profile_image_url: String,
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
    let rand_state = Alphanumeric.sample_string(&mut rand::thread_rng(), 32).to_lowercase();

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
                    let response_json: ReqValidateResponse = response.json().expect("Failed to parse response");
                    //convert expires_in to a readable format
                    let expires_in = chrono::Utc::now() + chrono::Duration::seconds(response_json.expires_in);

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

pub(crate) fn twitch_auth(args: Vec<String>, app: &AppHandle) {
    // Check if window was opened by a deeplink
    let mut is_deep_link = false;

    for arg in &args {
        if arg.starts_with("unitedchat://") { // Adjust the prefix according to your deep link scheme
            is_deep_link = true;
            break; // Found a deep link, no need to check further
        }
    }

    if is_deep_link {
        // Break down the arguments by removing the "unitedchat://" prefix and parsing what's in between the nexts slashes
        // For example: "unitedchat://twitch_link?client_id=123&scopes=chat:read" will be parsed to "twitch_link", "client_id=123", "scopes=chat:read"
        let deep_link_arg = args.iter().find(|arg| arg.starts_with("unitedchat://")).unwrap();
        let full_path = deep_link_arg.strip_prefix("unitedchat://").unwrap_or(deep_link_arg);
        let path_components: Vec<&str> = full_path.split("/").collect();

        let query_parameters_str = path_components.last().unwrap_or(&"");
        let query_parameters: Vec<&str> = query_parameters_str.split('?').last().unwrap_or("").split('&').collect();

        match path_components[0] {
            "twitch_link" => {
                // Convert the query parameters into a HashMap for easier access
                let mut params_map: HashMap<String, String> = HashMap::new();
                for param in query_parameters {
                    let mut iter = param.splitn(2, '=');
                    let key = iter.next().unwrap_or("").trim();
                    let value = iter.next().unwrap_or("").trim();
                    params_map.insert(key.to_string(), value.to_string());
                }

                // Now you can access the query parameters using the map
                let access_token = params_map.get("#access_token").unwrap_or(&"".to_string()).to_string();
                let scope = params_map.get("scope").unwrap_or(&"".to_string()).to_string();
                let state = params_map.get("state").unwrap_or(&"".to_string()).to_string();
                let token_type = params_map.get("token_type").unwrap_or(&"".to_string()).to_string();

                // Check if any of them are empty, and if one of them are, reset the setup
                if access_token.is_empty() || scope.is_empty() || state.is_empty() || token_type.is_empty() {
                    app.emit("splashscreen::twitch_auth", false).expect("Failed to emit setup_complete event");
                } else {
                    // If all query parameters are present, emit the setup_complete event with the query parameters

                    let user = validate_user(access_token.clone()).unwrap();
                    app.manage(user.clone());

                    // Write the user information to a json file at dirs::config_dir() / "united-chat" / "twitch-auth.json"
                    let path = dirs::config_dir().unwrap().join("United Chat");
                    if !path.exists() {
                        std::fs::create_dir_all(&path).expect("Failed to create directory");
                    }

                    let user_file = path.join("twitch-auth.json");
                    std::fs::File::create(user_file.clone()).expect("Failed to create file");

                    let mut file = OpenOptions::new().write(true).open(user_file).expect("Failed to open file");
                    file.write_all(serde_json::to_string(&user).unwrap().as_bytes()).expect("Failed to write to file");

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

                    let entry = Entry::new("united-chat", "twitch-auth").unwrap_or_else(|e| panic!("Error: {}", e));
                    entry
                        .set_password(&serde_json::to_string(&state).unwrap())
                        .unwrap_or_else(|e| panic!("Error: {}", e));

                    app.emit("splashscreen::twitch_auth", true).expect("Failed to emit setup_complete event");
                }
            }
            _ => {
                println!("Not matched")
            }
        }
    } else {
        println!("Not opened via deep link");
    }
}

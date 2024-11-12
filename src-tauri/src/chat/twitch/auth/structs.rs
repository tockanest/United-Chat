use serde::{Deserialize, Serialize};
use std::sync::Mutex;

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

pub(crate) type ImplicitGrantFlowState = Mutex<ImplicitGrantFlow>;

#[derive(Serialize, Deserialize, Clone, Default, Debug)]
pub(crate) struct UserInformation {
    pub(crate) login: String,
    pub(crate) user_id: String,
    pub(crate) expires_in: String,
    pub(crate) internal_info: InternalUserInformation,
}

pub(crate) type UserInformationState = Mutex<UserInformation>;

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
pub(crate) struct ReqUserResponse {
    pub(crate) data: Vec<InternalUserInformation>,
}

#[derive(Serialize, Deserialize, Debug)]
pub(crate) struct ReqValidateResponse {
    pub(crate) client_id: String,
    pub(crate) login: String,
    pub(crate) scopes: Vec<String>,
    pub(crate) user_id: String,
    pub(crate) expires_in: i64,
}
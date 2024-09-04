use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub(crate) struct YoutubeResponse {
    pub(crate) id: String,
    pub(crate) author_id: String,
    pub(crate) author_name: String,
    pub(crate) author_badges: Vec<String>,
    pub(crate) message: String,
    pub(crate) message_emotes: Vec<(String, String)>,
    pub(crate) timestamp: String,
    pub(crate) tracking_params: String
}
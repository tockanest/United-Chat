// use std::any::Any;
// use std::collections::HashMap;
// use serde_json::Value;
//
// struct Thumbnail {
//     url: String,
//     width: u32,
//     height: u32,
// }
//
// struct Channel {
//     id: Option<String>,
//     name: Option<String>,
//     thumbnails: Option<Thumbnail>,
//     subscriber_count: Option<u32>,
//
// }
//
// struct BaseVideoProperties {
//     id: Option<String>,
//     title: Option<String>,
//     thumbnails: Option<Thumbnail>,
//     description: Option<String>,
//     channel: Option<Channel>,
//     upload_date: Option<String>,
//     view_count: Option<u32>,
//     like_count: Option<u32>,
//     is_live_content: Option<bool>,
//     tags: Option<Vec<String>>,
// }
//
// type YoutubeRawData = HashMap<String, dyn Any>;
//
// impl BaseVideoProperties {
//     async fn get_video(id: &str) -> Result<Self, Box<dyn std::error::Error>> {
//         let request_url = format!("https://www.youtube.com/watch?v={}", id);
//         let response = reqwest::Client::builder()
//             .user_agent("Mozilla/5.0 (Windows NT 10.0; rv:78.0) Gecko/20100101 Firefox/78.0")
//             .build()
//             .unwrap()
//             .get(&request_url)
//             .send()
//             .await
//             .unwrap();
//
//         let json_response: Value = response.json().await?;
//         let data: YoutubeRawData = if response["data"].is_array() {
//             response["data"]
//                 .as_array()
//                 .unwrap()
//                 .iter()
//                 .fold(HashMap::new(), |acc, item| {
//                     acc.into_iter().chain(item.as_object().unwrap().into_iter()).collect()
//                 })
//         } else {
//             response["data"].clone()
//         };
//
//         if !data["response"]["contents"]["twoColumnWatchNextResults"]["results"]["results"]["contents"].is_null()
//             && data["playerResponse"]["playabilityStatus"]["status"] == "ERROR"
//         {
//             return Err("Video is not available".into())
//         }
//
//         let is_live = data["playerResponse"]["playabilityStatus"]["liveStreamability"].is_null();
//         if is_live {
//
//         }
//     }
// }
//
// struct LiveVideoProperties {
//     base_video_properties: BaseVideoProperties,
//     watching_count: Option<u32>,
//     chat_continuation: Option<String>,
// }
//
// struct LiveVideoEvents {
//     chat: Vec<String>,
// }

use crate::chat::youtube::polling::{VideoError, VideoInfo};
use lazy_static::lazy_static;
use std::time::Duration;

// Create a static RegexSet for better performance
lazy_static! {
    static ref YOUTUBE_REGEX_SET: regex::RegexSet = regex::RegexSet::new(&[
        r#""isReplay"\s*:\s*(true)"#,
        r#""INNERTUBE_API_KEY"\s*:\s*"([^"]+)""#,
        r#""continuation"\s*:\s*"([^"]+)""#,
        r#""scheduledStartTime"\s*:\s*"([^"]+)""#,
        r#""clientVersion"\s*:\s*"([\d.]+)""#,
        r#"<link\s+rel="canonical"\s+href="https://www\.youtube\.com/watch\?v=([^"]+)""#,
        r#"<title>([^<]+)</title>"#
    ])
    .unwrap();
    static ref YOUTUBE_REGEX_CAPTURES: Vec<regex::Regex> = vec![
        regex::Regex::new(r#""isReplay"\s*:\s*(true)"#).unwrap(),
        regex::Regex::new(r#""INNERTUBE_API_KEY"\s*:\s*"([^"]+)""#).unwrap(),
        regex::Regex::new(r#""continuation"\s*:\s*"([^"]+)""#).unwrap(),
        regex::Regex::new(r#""scheduledStartTime"\s*:\s*"([^"]+)""#).unwrap(),
        regex::Regex::new(r#""clientVersion"\s*:\s*"([\d.]+)""#).unwrap(),
        regex::Regex::new(
            r#"<link\s+rel="canonical"\s+href="https://www\.youtube\.com/watch\?v=([^"]+)""#
        )
        .unwrap(),
        regex::Regex::new(r#"<title>([^<]+)</title>"#).unwrap(),
    ];
}

// Use a connection pool for HTTP requests
lazy_static! {
    pub(crate) static ref HTTP_CLIENT: reqwest::Client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; rv:78.0) Gecko/20100101 Firefox/78.0")
        .pool_max_idle_per_host(10)
        .pool_idle_timeout(Duration::from_secs(30))
        .build()
        .unwrap();
}

pub(crate) fn retrieve_video_info(html: &str) -> Result<VideoInfo, VideoError> {
    let mut video_info = VideoInfo {
        is_replay: None,
        api_key: None,
        stream_type: None,
        continuation: None,
        scheduled_start_time: None,
        client_version: None,
        video_id: None,
        video_name: None,
    };

    // Use RegexSet for faster matching
    let matches = YOUTUBE_REGEX_SET.matches(html);

    // Process matches efficiently
    if matches.matched(0) {
        if let Some(caps) = YOUTUBE_REGEX_CAPTURES[0].captures(html) {
            video_info.is_replay = Some(caps.get(1).map_or(false, |m| m.as_str() == "true"));
        }
    }

    if matches.matched(1) {
        video_info.api_key = YOUTUBE_REGEX_CAPTURES[1]
            .captures(html)
            .and_then(|caps| caps.get(1))
            .map(|m| m.as_str().to_string());
    }

    if video_info.api_key.is_none() {
        return Err(VideoError {
            video_id: video_info
                .video_id
                .clone()
                .unwrap_or_else(|| "Unknown".to_string()),
            error: "Cannot find the API key".to_string(),
        });
    }

    // Process continuation and stream type together for efficiency
    if matches.matched(2) {
        video_info.continuation = YOUTUBE_REGEX_CAPTURES[2]
            .captures(html)
            .and_then(|caps| caps.get(1))
            .map(|m| m.as_str().to_string());

        video_info.stream_type = Some(if video_info.is_replay == Some(true) {
            "offline".to_string()
        } else {
            "live".to_string()
        });
    } else if matches.matched(3) {
        video_info.scheduled_start_time = YOUTUBE_REGEX_CAPTURES[3]
            .captures(html)
            .and_then(|caps| caps.get(1))
            .map(|m| m.as_str().to_string());

        if video_info.scheduled_start_time.is_some() {
            video_info.stream_type = Some("scheduled".to_string());
        }
    }

    if video_info.stream_type.is_none() {
        return Err(VideoError {
            video_id: video_info
                .video_id
                .clone()
                .unwrap_or_else(|| "Unknown".to_string()),
            error: "Cannot find the continuation or scheduled start time".to_string(),
        });
    }

    // Process remaining fields
    if matches.matched(4) {
        video_info.client_version = YOUTUBE_REGEX_CAPTURES[4]
            .captures(html)
            .and_then(|caps| caps.get(1))
            .map(|m| m.as_str().to_string());
    }

    if video_info.client_version.is_none() {
        return Err(VideoError {
            video_id: video_info
                .video_id
                .clone()
                .unwrap_or_else(|| "Unknown".to_string()),
            error: "Cannot find the client version".to_string(),
        });
    }

    if matches.matched(5) {
        video_info.video_id = YOUTUBE_REGEX_CAPTURES[5]
            .captures(html)
            .and_then(|caps| caps.get(1))
            .map(|m| m.as_str().to_string());
    }

    if video_info.video_id.is_none() {
        return Err(VideoError {
            video_id: "Unknown".to_string(),
            error: "Cannot find the video id".to_string(),
        });
    }

    if matches.matched(6) {
        video_info.video_name = YOUTUBE_REGEX_CAPTURES[6]
            .captures(html)
            .and_then(|caps| caps.get(1))
            .map(|m| m.as_str().to_string());
    }

    Ok(video_info)
}

pub(crate) async fn get_video(id: String) -> Result<VideoInfo, VideoError> {
    let request_url = format!("https://www.youtube.com/watch?v={}", id);

    // Use the shared HTTP client
    let response = HTTP_CLIENT
        .get(&request_url)
        .send()
        .await
        .map_err(|e| VideoError {
            video_id: id.clone(),
            error: format!("Failed to fetch video: {}", e),
        })?
        .text()
        .await
        .map_err(|e| VideoError {
            video_id: id,
            error: format!("Failed to get response text: {}", e),
        })?;

    retrieve_video_info(&response)
}

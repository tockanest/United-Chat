use crate::chat::youtube::channel::manager::{Channel, ChannelError};
use chrono::Utc;
use reqwest::Client;
use std::time::Duration;

async fn fetch_page_info(channel_id: &str) -> Result<Channel, ChannelError> {
    let url = format!("https://www.youtube.com/{}", channel_id);

    let client = Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap();

    let mut assigned_id = channel_id.to_string();
    if assigned_id.contains("@") {
        let url = format!("https://www.youtube.com/{}", channel_id);
        let response = client.get(&url).send().await.map_err(|e| e.to_string()).unwrap();

        // Scrape from the HTML the identifier
        let text_doc = response.text().await.map_err(|e| e.to_string()).unwrap();

        // Check if it's empty
        if text_doc.is_empty() {
            return Err(ChannelError {
                error: "Empty response".to_string()
            });
        } else if text_doc.contains("This channel does not exist.") {
            return Err(ChannelError {
                error: "Channel does not exist".to_string()
            });
        }

        // Get channel ID from the meta tag "<meta itemprop="identifier""
        assigned_id = text_doc
            .split("<meta itemprop=\"identifier\" content=\"")
            .nth(1)
            .and_then(|s| s.split('"').next())
            .map(|s| s.to_string())
            .ok_or_else(|| ChannelError {
                error: "Cannot find channel ID".to_string()
            })?;
    }

    let response = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; rv:78.0)")
        .send()
        .await
        .map_err(|e| ChannelError {
            error: format!("Failed to fetch page: {}", e)
        })?;

    let text = response.text().await.map_err(|e| ChannelError {
        error: format!("Failed to get page text: {}", e)
    })?;

    // Extract metadata section
    let metadata = text
        .split("var ytInitialData = ")
        .nth(1)
        .and_then(|s| s.split("</script>").next())
        .ok_or_else(|| ChannelError {
            error: "Cannot find metadata".to_string()
        })?;

    // Remove ; from the end of the metadata
    let metadata = metadata.trim_end_matches(';');

    let metadata: crate::chat::youtube::channel::manager::YTMetadata = serde_json::from_str(&metadata.to_string()).map_err(|e| ChannelError {
        error: format!("Failed to parse metadata: {}", e)
    })?;

    let channel_metadata = metadata.metadata.channel_metadata_renderer;

    Ok(Channel {
        channel_id: channel_metadata.external_id,
        title: channel_metadata.title,
        description: Some(channel_metadata.description),
        published_at: None,
        thumbnail_url: channel_metadata.avatar.thumbnails.first().map(|t| t.url.clone()),
        subscriber_count: None,
        video_count: None,
        custom_url: channel_metadata.vanity_channel_url,
        country: None,
        is_monitoring: false,
        last_check: Utc::now(),
        current_videos: Vec::new(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_fetch_page_info() {
        let channel_id = "@_neurosama";
        let channel = fetch_page_info(channel_id).await.unwrap();

        assert_eq!(channel.channel_id, "UCqOK_pl0LS0e8Lp7HMRDZsw");
        println!("{:?}", channel);
    }
}
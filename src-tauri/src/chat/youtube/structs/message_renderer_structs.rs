use serde::{Deserialize, Serialize};

// Root struct for GetLiveChatResponse
#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct GetLiveChatResponse {
    pub(crate) response_context: serde_json::Value, // Used serde_json::Value for an unstructured object
    pub(crate) tracking_params: Option<String>,
    pub(crate) continuation_contents: ContinuationContents,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct ContinuationContents {
    pub(crate) live_chat_continuation: LiveChatContinuation,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct LiveChatContinuation {
    pub(crate) continuations: Vec<Continuation>,
    pub(crate) actions: Vec<Action>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct Continuation {
    pub(crate) invalidation_continuation_data: Option<InvalidationContinuationData>,
    pub(crate) timed_continuation_data: Option<TimedContinuationData>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct InvalidationContinuationData {
    pub(crate) invalidation_id: InvalidationId,
    pub(crate) timeout_ms: i64,
    pub(crate) continuation: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct InvalidationId {
    pub(crate) object_source: i64,
    pub(crate) object_id: String,
    pub(crate) topic: String,
    pub(crate) subscribe_to_gcm_topics: bool,
    pub(crate) proto_creation_timestamp_ms: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct TimedContinuationData {
    pub(crate) timeout_ms: i64,
    pub(crate) continuation: String,
    pub(crate) click_tracking_params: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct Action {
    pub(crate) add_chat_item_action: Option<AddChatItemAction>,
    pub(crate) add_live_chat_ticker_item_action: Option<serde_json::Value>, // Using serde_json::Value for unstructured object
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct Thumbnail {
    pub(crate) url: String,
    pub(crate) width: Option<i64>,
    pub(crate) height: Option<i64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct MessageText {
    pub(crate) text: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct MessageEmoji {
    pub(crate) emoji: Emoji,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct Emoji {
    pub(crate) emoji_id: String,
    pub(crate) shortcuts: Vec<String>,
    pub(crate) search_terms: Vec<String>,
    pub(crate) supports_skin_tone: bool,
    pub(crate) image: EmojiImage,
    pub(crate) variant_ids: Vec<String>,
    pub(crate) is_custom_emoji: Option<bool>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct EmojiImage {
    pub(crate) thumbnails: Vec<Thumbnail>,
    pub(crate) accessibility: Accessibility,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct Accessibility {
    pub(crate) accessibility_data: AccessibilityData,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct AccessibilityData {
    pub(crate) label: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct AuthorBadge {
    pub(crate) live_chat_author_badge_renderer: LiveChatAuthorBadgeRenderer,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct LiveChatAuthorBadgeRenderer {
    pub(crate) custom_thumbnail: Option<CustomThumbnail>,
    pub(crate) icon: Option<Icon>,
    pub(crate) tooltip: String,
    pub(crate) accessibility: Accessibility,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct CustomThumbnail {
    pub(crate) thumbnails: Vec<Thumbnail>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct Icon {
    pub(crate) icon_type: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct MessageRendererBase {
    pub(crate) author_name: Option<SimpleText>,
    pub(crate) author_photo: Thumbnails,
    pub(crate) author_badges: Option<Vec<AuthorBadge>>,
    pub(crate) context_menu_endpoint: ContextMenuEndpoint,
    pub(crate) id: String,
    pub(crate) timestamp_usec: String,
    pub(crate) author_external_channel_id: String,
    pub(crate) context_menu_accessibility: Accessibility,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct SimpleText {
    pub(crate) simple_text: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct Thumbnails {
    pub(crate) thumbnails: Vec<Thumbnail>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct ContextMenuEndpoint {
    pub(crate) click_tracking_params: String,
    pub(crate) command_metadata: CommandMetadata,
    pub(crate) live_chat_item_context_menu_endpoint: LiveChatItemContextMenuEndpoint,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct CommandMetadata {
    pub(crate) web_command_metadata: WebCommandMetadata,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct WebCommandMetadata {
    pub(crate) ignore_navigation: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct LiveChatItemContextMenuEndpoint {
    pub(crate) params: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct LiveChatTextMessageRenderer {
    pub(crate) base: MessageRendererBase,
    pub(crate) message: Message,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct Message {
    pub(crate) runs: Vec<MessageRun>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(untagged)]
pub(crate) enum MessageRun {
    MessageText(MessageText),
    MessageEmoji(MessageEmoji),
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct LiveChatPaidMessageRenderer {
    pub(crate) base: MessageRendererBase,
    pub(crate) purchase_amount_text: SimpleText,
    pub(crate) header_background_color: i64,
    pub(crate) header_text_color: i64,
    pub(crate) body_background_color: i64,
    pub(crate) body_text_color: i64,
    pub(crate) author_name_text_color: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct LiveChatPaidStickerRenderer {
    pub(crate) base: MessageRendererBase,
    pub(crate) purchase_amount_text: SimpleText,
    pub(crate) sticker: Sticker,
    pub(crate) money_chip_background_color: i64,
    pub(crate) money_chip_text_color: i64,
    pub(crate) sticker_display_width: i64,
    pub(crate) sticker_display_height: i64,
    pub(crate) background_color: i64,
    pub(crate) author_name_text_color: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct Sticker {
    pub(crate) thumbnails: Vec<Thumbnail>,
    pub(crate) accessibility: Accessibility,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct LiveChatMembershipItemRenderer {
    pub(crate) base: MessageRendererBase,
    pub(crate) header_subtext: Message,
    pub(crate) author_badges: Vec<AuthorBadge>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct AddChatItemAction {
    pub(crate) item: ChatItem,
    pub(crate) client_id: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct ChatItem {
    pub(crate) live_chat_text_message_renderer: Option<LiveChatTextMessageRenderer>,
    pub(crate) live_chat_paid_message_renderer: Option<LiveChatPaidMessageRenderer>,
    pub(crate) live_chat_membership_item_renderer: Option<LiveChatMembershipItemRenderer>,
    pub(crate) live_chat_paid_sticker_renderer: Option<LiveChatPaidStickerRenderer>,
    pub(crate) live_chat_viewer_engagement_message_renderer: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) enum Renderer {
    LiveChatTextMessageRenderer(LiveChatTextMessageRenderer),
    LiveChatPaidMessageRenderer(LiveChatPaidMessageRenderer),
    LiveChatPaidStickerRenderer(LiveChatPaidStickerRenderer),
    LiveChatMembershipItemRenderer(LiveChatMembershipItemRenderer),
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct FetchOptions {
    pub(crate) api_key: String,
    pub(crate) client_version: String,
    pub(crate) continuation: String,
}

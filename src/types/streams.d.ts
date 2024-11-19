/**
 *
 * @fileOverview This mainly is for YouTube streams, will not be used for Twitch streams since we do not have to fetch the
 * particular stream chat and instead use a WebSocket connection via Twitch's IRC.
 */
type Video = {
	is_replay: boolean | null
	api_key: string
	stream_type: "scheduled" | "live" | "offline"
	continuation: string
	scheduled_start_time: string | null
	client_version: string
	video_id: string
	video_name: string
}

type VideoError = {
	video_id: string,
	error: string
}

type LiveStream = {
	id: string
	name: string
	scheduledTime: string | null
	status: 'live' | 'scheduled' | 'offline'
}

type ChatTheme = {
	id: string
	name: string
	html: string
	css: string
}

// This is here because I don't know where else to put it, but it's used at the splashscreen.
type TwitchAuthEvent = {
	payload: boolean;
};

export type {Video, VideoError, LiveStream, ChatTheme, TwitchAuthEvent};
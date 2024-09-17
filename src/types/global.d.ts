declare global {
	type PreviewPosition = 'right' | 'bottom' | 'left' | 'top'

	export type UserInformation = {
		login: string,
		user_id: string,
		expires_in: number,
		internal_info: {
			broadcaster_type: string,
			description: string,
			display_name: string,
			id: string,
			profile_image_url: string,
		}
	}

	type TwitchResponse = {
		id: string;
		timestamp: number
		display_name: string,
		user_color: string | null,
		user_badges: string[] | [];
		message: string,
		emotes: string[] | [];
		raw_data: {
			raw_message: string,
			raw_emotes: string,
		},
		tags: [string, string][],
	}

	type YoutubeResponse = {
		id: string,
		author_id: string,
		author_name: string,
		author_badges: string[] | [],
		message: string,
		message_emotes: [string, string][],
		timestamp: string,
		tracking_params: string,
	}

	type TwitchMessage = {
		platform: "twitch";
		message: TwitchResponse;
	};

	type YoutubeMessage = {
		platform: "youtube";
		message: YoutubeResponse;
	};

	type PlatformMessage<T extends "twitch" | "youtube"> = T extends "twitch" ? TwitchMessage : T extends "youtube" ? YoutubeMessage : Message;

	type Message = PlatformMessage<"twitch" | "youtube"> & {
		fadingOut?: boolean;
		fullyFadedOut?: boolean;
	};

	interface ConfigState {
		scaling: boolean
		scalingValue: number
		fadeOut: boolean
		messageRemoveTimer: number
		maxMessages: number
		maxWidth: number
		maxHeight: number
		currentWidth: number
		currentHeight: number
		messageTransition: string
	}

	type AvailableThemes = [string, string, string][];

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

}

export {}
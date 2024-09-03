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

	// This will change 100%, do not expect this to work on next update
	type YoutubeResponse = {
		id: string,
		timestamp: number;
		display_name: string;
		user_color: string | null;
		user_badges: string[] | [];
		message: string;
		emotes: string[] | [];
		raw_data: {
			raw_message: string;
			raw_emotes: string;
		};
		tags: [string, string][];
	};

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
	}

	type AvailableThemes = [string, string, string][];

	type Video = {
		is_replay: boolean | null
		api_key: string
		stream_type: "scheduled" | "live" | "replay"
		continuation: string
		scheduled_start_time: string | null
		client_version: string
		video_id: string
		video_name: string
	}

}

export {}
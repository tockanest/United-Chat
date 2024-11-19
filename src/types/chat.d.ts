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

interface WebChatConfig {
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

export type {TwitchResponse, YoutubeResponse, TwitchMessage, YoutubeMessage, PlatformMessage, Message, WebChatConfig};
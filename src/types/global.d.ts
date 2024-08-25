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
		timestamp: number
		display_name: string,
		user_color: string | null,
		user_badges: string[] | [] | null,
		message: string,
		emotes: string[] | [] | null,
		raw_data: {
			raw_message: string,
			raw_emotes: string,
		},
		tags: [string, string][],
	}

	// This will change 100%, do not expect this to work on next update
	type YoutubeResponse = {
		timestamp: number;
		display_name: string;
		user_color: string | null;
		user_badges: string[] | [] | null;
		message: string;
		emotes: string[] | [] | null;
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

	type Message = PlatformMessage<"twitch" | "youtube">;
}

export {}
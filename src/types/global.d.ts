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

	type Message = {
		message: {
			platform: "twitch" | "youtube",
			user: string,
			formated_message: string,
			raw_message: string,
			color: string | null,
			timestamp: number
			badges: string[] | [] | null,
			emotes: string[] | [] | null,
		}
	}
}

export {}
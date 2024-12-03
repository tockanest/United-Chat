// src/types/user.d.ts
declare global {
	namespace User {
		interface Information {
			login: string;
			user_id: string;
			expires_in: number;
			internal_info: {
				broadcaster_type: string;
				description: string;
				display_name: string;
				id: string;
				profile_image_url: string;
			};
		}
	}
}

export {};
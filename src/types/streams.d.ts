// src/types/streams.d.ts
declare global {
	namespace Streams {

		interface TwitchConfig {
			url: string;
			youtube?: {
				yt_id?: string;
				interval?: number;
			};
		}

		type Video = {
			is_replay: boolean | null;
			api_key: string;
			stream_type: "scheduled" | "live" | "offline";
			continuation: string;
			scheduled_start_time: string | null;
			client_version: string;
			video_id: string;
			video_name: string;
		};

		type VideoError = {
			video_id: string;
			error: string;
		};

		type LiveStream = {
			id: string;
			name: string;
			scheduledTime: string | null;
			status: 'live' | 'scheduled' | 'offline';
		};

		type TwitchAuthEvent = {
			payload: boolean;
		};
	}
}

export { };

// src/lib/tauri/youtube.ts
import {BaseTauriClient} from './base';

export class YouTubeClient extends BaseTauriClient {
	static async setYouTubeChannel(channelId: string) {
		await this.invokeCommand<unknown>("set_channel", {channelId});
		
		const channel = await this.invokeCommand("get_current_channel", {});
		if (!channel) {
			throw new Error("Channel not found");
		}
		
		await this.invokeCommand("start_monitoring", {});
		return channel;
	}
	
	static async getYouTubeVideo(url: string): Promise<Streams.Video> {
		const videoId = this.extractYouTubeId(url);
		if (!videoId) {
			throw new Error("Invalid YouTube URL");
		}
		return await this.invokeCommand<Streams.Video>("get_video_cmd", {id: videoId});
	}
	
	private static extractYouTubeId(url: string): string | null {
		const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
		const match = url.match(regex);
		return match ? match[1] : null;
	}
	
	static async getAllVideos(): Promise<Streams.Video[]> {
		return await this.invokeCommand<Streams.Video[]>("get_all_videos", {updateStatus: true});
	}
	
	static async storeVideo(video: Streams.Video): Promise<boolean> {
		try {
			return await this.invokeCommand<boolean>("store_new_livestream", {data: video});
		} catch (error) {
			throw error as Streams.VideoError;
		}
	}
	
	static async deleteVideo(videoId: string): Promise<boolean> {
		return await this.invokeCommand<boolean>("delete_video_from_db", {id: videoId});
	}
}
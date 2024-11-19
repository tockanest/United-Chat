declare global {
	
	/**
	 * WebChat types
	 */
	import {
		TwitchResponse, YoutubeResponse, TwitchMessage, YoutubeMessage, PlatformMessage, Message, WebChatConfig
	} from "./chat"
	export type {TwitchResponse, YoutubeResponse, TwitchMessage, YoutubeMessage, PlatformMessage, Message, WebChatConfig}
	
	/**
	 * Editor types
	 */
	import {AvailableThemes, PreviewPosition} from "./editor"
	export type {AvailableThemes, PreviewPosition}
	
	
	import {UserInformation} from "./app_states"
	export type {UserInformation}
	
	import {
		Video, VideoError, LiveStream, ChatTheme, TwitchAuthEvent
	} from "@/types/streams";
	export type {Video, VideoError, LiveStream, ChatTheme, TwitchAuthEvent}
	
}

export {}
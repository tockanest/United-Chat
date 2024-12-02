// src/lib/tauri/index.ts
export * from './auth';
export * from './chat';
export * from './theme';
export * from './youtube';
export * from './events';

// If you want to use them as a namespace:
import {AuthClient} from './auth';
import {ChatClient} from './chat';
import {ThemeClient} from './theme';
import {YouTubeClient} from './youtube';
import {EventsClient} from './events';
import {ShellClient} from "./shell";

export const TauriAPI = {
	Auth: AuthClient,
	Chat: ChatClient,
	Theme: ThemeClient,
	YouTube: YouTubeClient,
	Events: EventsClient,
	Shell: ShellClient,
};
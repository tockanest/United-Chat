// src/lib/tauri/index.ts
export * from './auth';
export * from './chat';
export * from './events';
export * from './theme';
export * from './youtube';

// If you want to use them as a namespace:
import { AuthClient } from './auth';
import { ChatClient } from './chat';
import { EventsClient } from './events';
import { ShellClient } from "./shell";
import { ThemeClient } from './theme';
import { YouTubeClient } from './youtube';
export const TauriAPI = {
	Auth: AuthClient,
	Chat: ChatClient,
	Theme: ThemeClient,
	YouTube: YouTubeClient,
	Events: EventsClient,
	Shell: ShellClient,
};
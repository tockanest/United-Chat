// src/lib/tauri/chat.ts
import { BaseTauriClient } from './base';

export class ShellClient extends BaseTauriClient {
	static async OpenUrl(url: string): Promise<void> {
		function isValidUrl(string: string) {
			try {
				new URL(string);
				return true;
			} catch (e) {
				return false;
			}
		}

		if (!isValidUrl(url)) {
			throw new Error("Invalid URL");
		}

		const { open } = await import("@tauri-apps/plugin-shell");
		return await open(url);
	}
}
// src/lib/tauri/base.ts
import {invoke} from '@tauri-apps/api/core';

export abstract class BaseTauriClient {
	protected static async invokeCommand<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
		try {
			return await invoke<T>(command, args);
		} catch (error) {
			console.error(`Error invoking command ${command}:`, error);
			throw error;
		}
	}
	
	protected static isValidUrl(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}
}
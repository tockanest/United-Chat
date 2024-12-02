// src/lib/tauri/events.ts
import {type Event, listen, once, type UnlistenFn} from '@tauri-apps/api/event';
import {BaseTauriClient} from './base';

export class EventsClient extends BaseTauriClient {
	private static eventSubscriptions = new Map<string, UnlistenFn>();
	
	static async listenToEvent<T>(
		event: string,
		callback: (event: Event<T>) => void
	): Promise<void> {
		const unsubscribe = await listen<T>(event, callback);
		this.eventSubscriptions.set(event, unsubscribe);
	}
	
	static async listenToEventOnce<T>(
		event: string,
		callback: (event: Event<T>) => void
	): Promise<() => void> {
		return await once<T>(event, callback);
	}
	
	static unsubscribeFromEvent(event: string): void {
		const unsubscribe = this.eventSubscriptions.get(event);
		if (unsubscribe) {
			unsubscribe();
			this.eventSubscriptions.delete(event);
		}
	}
	
	// Helper method to extract payload from event
	static getEventPayload<T>(event: Event<T>): T {
		return event.payload;
	}
}
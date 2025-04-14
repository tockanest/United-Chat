// src/lib/tauri/base.ts
import { invoke } from '@tauri-apps/api/core';
import { ok, err, Result } from 'neverthrow';

type EventSubscribeResult = {
	status: "Subscribed";
	message: string;
}

type EventSubscribeError = {
	status: "Cancelled";
	message: string;
}

// Singleton event manager to ensure we only have one subscription per event
class EventManager {
	private static instance: EventManager;
	private eventSubscriptions: Map<string, () => void> = new Map();
	private eventCallbacks: Map<string, Set<(event: any) => void>> = new Map();

	private constructor() { }

	public static getInstance(): EventManager {
		if (!EventManager.instance) {
			EventManager.instance = new EventManager();
		}
		return EventManager.instance;
	}

	public async subscribe(event: string, callback: (event: any) => void): Promise<Result<EventSubscribeResult, EventSubscribeError>> {
		// Add callback to the set of callbacks for this event
		if (!this.eventCallbacks.has(event)) {
			this.eventCallbacks.set(event, new Set());
		}
		this.eventCallbacks.get(event)?.add(callback);

		// If we already have a subscription for this event, we're done
		if (this.eventSubscriptions.has(event)) {
			return ok({
				status: "Subscribed",
				message: "Added callback to existing subscription."
			});
		}

		// Create a new subscription
		try {
			const { listen } = await import('@tauri-apps/api/event');
			const unsub = await listen(event, (eventData) => {
				// Call all registered callbacks for this event
				this.eventCallbacks.get(event)?.forEach(cb => cb(eventData));
			});
			this.eventSubscriptions.set(event, unsub);
			return ok({
				status: "Subscribed",
				message: "Event subscribed successfully."
			});
		} catch (error) {
			return err({
				status: "Cancelled",
				message: `Failed to subscribe: ${error}`
			});
		}
	}

	public unsubscribe(event: string, callback?: (event: any) => void): void {
		// If a specific callback is provided, only remove that callback
		if (callback && this.eventCallbacks.has(event)) {
			this.eventCallbacks.get(event)?.delete(callback);

			// If there are still callbacks, keep the subscription
			if (this.eventCallbacks.get(event)?.size && this.eventCallbacks.get(event)?.size! > 0) {
				return;
			}
		}

		// If no callback provided or no callbacks left, remove the entire subscription
		const unsub = this.eventSubscriptions.get(event);
		if (unsub) {
			unsub();
			this.eventSubscriptions.delete(event);
			this.eventCallbacks.delete(event);
		}
	}
}

export abstract class BaseTauriClient {
	protected static async invokeCommand<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
		return await invoke<T>(command, args);
	}

	protected static isValidUrl(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}

	static async EventSubscribe(event: string, callback: (event: any) => void): Promise<Result<EventSubscribeResult, EventSubscribeError>> {
		return await EventManager.getInstance().subscribe(event, callback);
	}

	public static UnsubscribeEvent(event: string, callback?: (event: any) => void) {
		EventManager.getInstance().unsubscribe(event, callback);
	}

	static async StartWFE(): Promise<boolean> {
		return await this.invokeCommand<boolean>("focus_event_emitter", {});
	}
}
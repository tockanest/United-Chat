export default class TauriApi {
	private static eventSubscriptions = new Map<string, () => void>();

	private static async command<T>(command: string, args: any): Promise<T> {
		const {invoke} = await import('@tauri-apps/api/core');
		return invoke(command, args);
	}

	/** Twitch Linking Process */

	public static async StartLinking() {
		return await this.command<string>("start_twitch_link", {
			clientId: "h3yvglc6y3kmtrzyq7it20z7vi5sa2",
			scopes: "user:read:chat+user:read:email"
		})
	}

	public static async SkipLinking() {
		return await this.command<boolean>("skip_twitch_auth", {});
	}

	public static async FinishFrontendSetup() {
		return await this.command<boolean>("setup_complete", {task: "frontend"});
	}

	public static async OpenUrl(url: string) {
		// Check if valid url
		function isValidUrl(string: string) {
			try {
				new URL(string);
				return true;
			} catch (_) {
				return false;
			}
		}

		if (!isValidUrl(url)) {
			throw new Error("Invalid URL");
		}

		const {open} = await import("@tauri-apps/plugin-shell");
		return await open(url);

	}

	public static async ConnectTwitchWebsocket() {
		return await this.command<void>("connect_twitch_websocket", {});
	}

	public static async DisconnectTwitchWebsocket() {
		return await this.command<void>("ws_disconnect", {});
	}

	public static async GetAppUrl() {
		return await this.command<string>("get_app_url", {});
	}

	public static async OpenWebChatWindow(url: string) {
		return await this.command<void>("open_webchat_window", {url});
	}

	public static async CloseWebChatWindow() {
		return await this.command<void>("hide_webchat_window", {});
	}

	public static async GetUserInformation() {

		try {
			return await this.command<UserInformation>("get_user", {});
		} catch (e) {
			console.error(e);
			return null;
		}
	}

	public static async GetEditorTheme(theme: string = "default") {
		return await this.command<string>("get_theme", {theme: theme});
	}

	public static async ListenEvent(event: string, callback: (event: any) => void) {
		const {listen} = await import('@tauri-apps/api/event');
		const unsub = await listen(event, callback);
		this.eventSubscriptions.set(event, unsub);
	}


	public static async ListenEventOnce(event: string, callback: (event: any) => void) {
		const {once} = await import('@tauri-apps/api/event');
		return await once(event, callback);
	}

	public static UnsubscribeEvent(event: string) {
		const unsub = this.eventSubscriptions.get(event);
		if (unsub) {
			unsub(); // Call the Unsub function to unsubscribe
			this.eventSubscriptions.delete(event); // Clean up the reference
		}
	}
}



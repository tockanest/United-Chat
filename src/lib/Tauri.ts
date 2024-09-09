export default class TauriApi {
	private static eventSubscriptions = new Map<string, () => void>();

	/**
	 * Twitch Linking Process
	 */

	/**
	 * Starts the Twitch linking process by invoking the `start_twitch_link` command.
	 * @returns {Promise<string>} A promise that resolves to a string containing the linking URL.
	 */
	public static async StartLinking(): Promise<string> {
		return await this.command<string>("start_twitch_link", {
			clientId: "h3yvglc6y3kmtrzyq7it20z7vi5sa2",
			scopes: "user:read:chat+user:read:email"
		});
	}

	/**
	 * Logs out the user by invoking the `twitch_deauth` command.
	 * @returns {Promise<void>} A promise that resolves when the logout is complete.
	 */
	public static async Logout(): Promise<void> {
		return await this.command<void>("twitch_deauth", {});
	}

	/**
	 * Skips the Twitch linking process by invoking the `skip_twitch_auth` command.
	 * @param {string} fullUrl - The full URL for the Twitch authentication.
	 * @param {string} username - The username for the Twitch account.
	 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating success or failure.
	 */
	public static async SkipLinking(fullUrl: string, username: string): Promise<boolean> {
		return await this.command<boolean>("skip_twitch_auth", {fullUrl, username});
	}

	/**
	 * Completes the frontend setup by invoking the `setup_complete` command.
	 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating success or failure.
	 */
	public static async FinishFrontendSetup(): Promise<boolean> {
		return await this.command<boolean>("setup_complete", {task: "frontend"});
	}

	/**
	 * Opens a URL in the default web browser.
	 * @param {string} url - The URL to open.
	 * @returns {Promise<void>} A promise that resolves when the URL is opened.
	 * @throws {Error} If the URL is invalid.
	 */
	public static async OpenUrl(url: string): Promise<void> {
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

	/**
	 * Connects to the Twitch WebSocket by invoking the `connect_twitch_websocket` command.
	 * @returns {Promise<void>} A promise that resolves when the connection is established.
	 */
	public static async StartUnitedChat(
		yt_id?: string,
		interval?: number,
	): Promise<void> {
		return await this.command<void>("united_chat_init", {
			youtube: {
				yt_id,
				interval
			}
		});
	}

	/**
	 * Disconnects from the Twitch WebSocket by invoking the `ws_disconnect` command.
	 * @returns {Promise<void>} A promise that resolves when the disconnection is complete.
	 */
	public static async DisconnectTwitchWebsocket(): Promise<void> {
		return await this.command<void>("united_chat_stop", {});
	}

	/**
	 * Opens a web chat window by invoking the `open_webchat_window` command.
	 * @param {string} url - The URL of the web chat.
	 * @returns {Promise<void>} A promise that resolves when the window is opened.
	 */
	public static async OpenWebChatWindow(url: string): Promise<void> {
		return await this.command<void>("open_webchat_window", {url});
	}

	/**
	 * Closes the web chat window by invoking the `hide_webchat_window` command.
	 * @returns {Promise<void>} A promise that resolves when the window is closed.
	 */
	public static async CloseWebChatWindow(): Promise<void> {
		return await this.command<void>("hide_webchat_window", {});
	}

	/**
	 * Retrieves user information by invoking the `get_user` command.
	 * @returns {Promise<UserInformation | null>} A promise that resolves to the user information or null if an error occurs.
	 */
	public static async GetUserInformation(): Promise<UserInformation | null> {
		try {
			return await this.command<UserInformation>("get_user", {});
		} catch (e) {
			console.error(e);
			return null;
		}
	}

	/**
	 * Retrieves the editor theme by invoking the `get_theme` command.
	 * @param {string} [theme="default"] - The name of the theme to retrieve.
	 * @returns {Promise<{name: string, html_code: string, css_code: string}>} A promise that resolves to the theme details.
	 */
	public static async GetEditorTheme(theme: string = "default"): Promise<{
		name: string;
		html_code: string;
		css_code: string;
	}> {
		const {name, html_code, css_code} = await this.command<{
			name: string,
			html_code: string,
			css_code: string
		}>("get_theme", {theme: theme});
		return {name, html_code, css_code};
	}

	/**
	 * Retrieves the available themes by invoking the `get_themes` command.
	 * @returns {Promise<AvailableThemes>} A promise that resolves to an array of available themes.
	 */
	public static async GetAvailableThemes() {
		return await this.command<AvailableThemes>("get_themes", {});
	}

	/**
	 * Saves a theme by invoking the `save_theme` command.
	 * @param {string} themeName - The name of the theme to save.
	 * @param {string} htmlCode - The HTML code of the theme.
	 * @param {string} cssCode - The CSS code of the theme.
	 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating success or failure.
	 */
	public static async SaveTheme(themeName: string, htmlCode: string, cssCode: string) {
		return await this.command<boolean>("save_theme", {themeName, htmlCode, cssCode});
	}

	/**
	 * Event Handling
	 */

	/**
	 * Listens for an event by invoking the `listen` function from the Tauri API.
	 * @param {string} event - The name of the event to listen for.
	 * @param {(event: any) => void} callback - The callback function to execute when the event occurs.
	 * @returns {Promise<void>} A promise that resolves when the event listener is set up.
	 */
	public static async ListenEvent(event: string, callback: (event: any) => void) {
		const {listen} = await import('@tauri-apps/api/event');
		const unsub = await listen(event, callback);
		this.eventSubscriptions.set(event, unsub);
	}

	/**
	 * Listens for an event once by invoking the `once` function from the Tauri API.
	 * @param {string} event - The name of the event to listen for.
	 * @param {(event: any) => void} callback - The callback function to execute when the event occurs.
	 * @returns {Promise<void>} A promise that resolves when the event listener is set up.
	 */
	public static async ListenEventOnce(event: string, callback: (event: any) => void) {
		const {once} = await import('@tauri-apps/api/event');
		return await once(event, callback);
	}

	/**
	 * Unsubscribes from an event.
	 * @param {string} event - The name of the event to unsubscribe from.
	 */
	public static UnsubscribeEvent(event: string) {
		const unsub = this.eventSubscriptions.get(event);
		if (unsub) {
			unsub(); // Call the Unsub function to unsubscribe
			this.eventSubscriptions.delete(event); // Clean up the reference
		}
	}

	/** Quality of Life Functions */

	public static async CheckThemeBeforeReload(
		currentThemeName: string,
		currentThemeHtml: string,
		currentThemeCss: string
	) {
		return await this.command<boolean>("check_if_unsaved", {
			currentThemeName,
			currentThemeHtml,
			currentThemeCss
		});
	}

	/** Youtube Process */

	public static async GetVideo(url: string) {
		// Should follow: https://www.youtube.com/watch?v={id}
		const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
		const match = url.match(regex);
		if (match) {
			return await this.command<Video>("get_video_cmd", {id: match[1]});
		}

		throw new Error("Invalid URL");
	}

	public static async GetAllVideos() {
		return await this.command<Video[]>("get_all_videos", {updateStatus: true});
	}

	public static async StoreVideo(video: Video): Promise<boolean | VideoError> {
		try {
			return await this.command<boolean>("store_new_livestream", {data: video});
		} catch (e: any) {
			throw e as VideoError;
		}
	}

	public static async DeleteVideo(videoId: string) {
		return await this.command<boolean>("delete_video_from_db", {id: videoId});
	}

	public static async StartLinkingAIS() {
		return await this.command<void>("twitch_linking", {});
	}

	/**
	 * Invokes a Tauri command.
	 * @private
	 * @template T
	 * @param {string} command - The name of the command to invoke.
	 * @param {any} args - The arguments to pass to the command.
	 * @returns {Promise<T>} A promise that resolves to the result of the command.
	 */
	private static async command<T>(command: string, args: any): Promise<T> {
		const {invoke} = await import('@tauri-apps/api/core');
		return invoke(command, args);
	}
}
import TauriApi from "@/lib/Tauri";
import React from "react";
import moment from "moment";

function formatPlatformBadge(platform: PlatformMessage<"twitch" | "youtube">["platform"]) {
	switch (platform) {
		case "twitch": {
			return "<img src='/icons/brands/twitch_glitch.svg' alt='twitch' class='w-6 h-6 max-w-[24px] max-h-[24px]'/>";
		}
		case "youtube": {
			return "<img src='/icons/brands/youtube-color.svg' alt='youtube' class='w-6 h-6 max-w-[24px] max-h-[24px]'/>";
		}
	}
}

function returnAllBadges(badges: string[]) {
	return badges.map((badge, index) => {
		return `<img src='${badge}' alt='badge' class='w-6 h-6 max-w-[24px] max-h-[24px]'/>`
	}).join(" ");
}

function formatYoutubeMessage(message: YoutubeResponse) {
	// Check if there's images in the message (usually emotes) and replace them with the correct styling (flex flex-row items-start)
	// Images will be already on  the format: <img id=\"{}\" src=\"{}\" alt=\"{}\" />", emoji_name, emoji_url, emoji_name
	// So we'll split all emojis by the closing tag, set the correct styling and join them back together
	const splitMessage = message.message.split("</img>");
	const formattedMessage = splitMessage.map((msg) => {
		if (msg.includes("<img")) {
			return `<div class=''>${msg}</div>`;
		}
		return msg;
	}).join("</img>");

	// Replace all missing spaces
	const replacedSpaces = formattedMessage.replaceAll("{\" \"}", "");

	return replacedSpaces;
}

function replacePlaceholders(template: string, message: Message["message"], platform: PlatformMessage<"twitch" | "youtube">["platform"]) {
	switch (platform) {
		case "twitch": {
			message = message as TwitchResponse;
			return template
				.replaceAll("{id}", message.id)
				.replaceAll("{user}", message.display_name)
				.replaceAll("{formatedMessage}", message.message)
				.replaceAll("{raw_message}", message.raw_data.raw_message)
				.replaceAll("{color}", message.user_color || "")
				.replaceAll("{profile_picture}", "")
				.replaceAll("{platform}", formatPlatformBadge(platform))
				.replaceAll("{\" \"}", "⠀")
				.replaceAll("{badge_1}", message.user_badges[0] || "")
				.replaceAll("{badge_2}", message.user_badges[1] || "")
				.replaceAll("{badge_3}", message.user_badges[2] || "")
				.replaceAll("{badges}", returnAllBadges(message.user_badges))
				.replaceAll("{timestamp}", moment(message.timestamp).format("HH:mm"))
		}
		case "youtube": {
			message = message as YoutubeResponse;
			return template
				.replaceAll("{id}", message.id)
				.replaceAll("{user}", message.author_name)
				.replaceAll("{formatedMessage}", message.message)
				.replaceAll("{raw_message}", message.message)
				.replaceAll("{color}", "")
				.replaceAll("{profile_picture}", "")
				.replaceAll("{platform}", formatPlatformBadge(platform))
				.replaceAll("{\" \"}", "⠀")
				.replaceAll("{badge_1}", message.author_badges[0] || "")
				.replaceAll("{badge_2}", message.author_badges[1] || "")
				.replaceAll("{badge_3}", message.author_badges[2] || "")
				.replaceAll("{badges}", returnAllBadges(message.author_badges))
				.replaceAll("{timestamp}", moment(Number(message.timestamp) / 1000).format("HH:mm"))

		}
	}
}

function handleConfigChange(key: keyof ConfigState, value: number | boolean | string, setConfig: React.Dispatch<React.SetStateAction<ConfigState>>) {
	setConfig(prevConfig => ({...prevConfig, [key]: value}))
}

function handleCopy(
	dialogMessage: string,
	setCopied: React.Dispatch<React.SetStateAction<boolean>>
) {
	navigator.clipboard.writeText(dialogMessage)
	setCopied(true)
	setTimeout(() => setCopied(false), 2000)
}

function removeComments(html: string): string {
	return html.replace(/<!--[\s\S]*?-->/g, '');
}


function handleWebChatWindow(
	htmlCode: string,
	cssCode: string,
	config: ConfigState,
	setDialogMessage: React.Dispatch<React.SetStateAction<string>>,
	setShowConfirmDialog: React.Dispatch<React.SetStateAction<boolean>>,
	setStartWebsocket: React.Dispatch<React.SetStateAction<boolean>>,
	webChatWindowShown: boolean,
	setWebChatWindowShown: React.Dispatch<React.SetStateAction<boolean>>,
	startWebsocket: boolean
) {
	if (!startWebsocket) {
		const cleanedCssCode = cssCode.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove comments
		const base64CssCode = btoa(cleanedCssCode); // Encode to Base64

		const cleanedHtmlCode = removeComments(htmlCode); // Remove comments
		const base64HtmlCode = btoa(cleanedHtmlCode); // Encode to Base64

		// Get the configuration from the editor
		const scaling = config.scaling;
		const scalingValue = config.scalingValue;
		const fadeOut = config.fadeOut;
		const messageRemoveTimer = config.messageRemoveTimer;
		const maxWidth = config.maxWidth;
		const maxHeight = config.maxHeight;
		const currentWidth = config.currentWidth;
		const currentHeight = config.currentHeight;
		const maxMessages = config.maxMessages;
		const messageTransition = config.messageTransition;

		// If any of the boolean values are false, ignore them
		let configString = "";
		if (scaling) configString += `scaling=${scalingValue}&`;
		if (fadeOut) configString += `fadeOut=${fadeOut}&`;

		// Add the max width and height
		configString += `maxWidth=${maxWidth}&maxHeight=${maxHeight}&`;
		// Add the current width and height
		configString += `currentWidth=${currentWidth}&currentHeight=${currentHeight}`;
		// Add the max messages and removal timer
		configString += `&maxMessages=${maxMessages}&removalTimer=${messageRemoveTimer}`;
		// Add the message transition
		configString += `&messageTransition=${messageTransition}`;

		const url = `webchat?htmlTemplate=${encodeURIComponent(base64HtmlCode)}&css=${base64CssCode}&${configString}`;

		const port = process.env.NODE_ENV === "production" ? "9889" : "3000";
		const fullUrl = `http://127.0.0.1:${port}/${url}`;
		setDialogMessage(fullUrl);
		setShowConfirmDialog(true);

	} else {
		TauriApi.DisconnectTwitchWebsocket();
	}

	if (webChatWindowShown) {
		TauriApi.CloseWebChatWindow();
		setWebChatWindowShown(false);
	}

	setStartWebsocket(!startWebsocket);
}

export {
	formatPlatformBadge,
	replacePlaceholders,
	handleConfigChange,
	handleCopy,
	removeComments,
	handleWebChatWindow,
};
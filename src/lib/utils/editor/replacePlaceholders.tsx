import moment from "moment";

function formatPlatformBadge(platform: Chat.PlatformMessage<"twitch" | "youtube">["platform"]) {
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
	return badges.map((badge) => {
		return `<img src='${badge}' alt='badge' class='w-6 h-6 max-w-[24px] max-h-[24px]'/>`
	}).join(" ");
}

//@eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatYoutubeMessage(message: Chat.YoutubeResponse) {
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

function replacePlaceholders(template: string, message: Chat.Message["message"], platform: Chat.PlatformMessage<"twitch" | "youtube">["platform"]) {
	switch (platform) {
		case "twitch": {
			message = message as Chat.TwitchResponse;
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
			message = message as Chat.YoutubeResponse;
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


export {
	formatPlatformBadge,
	replacePlaceholders
};

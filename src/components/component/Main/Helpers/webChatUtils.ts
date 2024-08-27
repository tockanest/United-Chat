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

function replacePlaceholders(template: string, message: Message["message"], platform: PlatformMessage<"twitch" | "youtube">["platform"]) {
	return template
		.replaceAll("{id}", message.id)
		.replaceAll("{user}", message.display_name)
		.replaceAll("{formatedMessage}", message.message.substring(0, 100))
		.replaceAll("{raw_message}", message.raw_data.raw_message)
		.replaceAll("{color}", message.user_color || "")
		.replaceAll("{profile_picture}", "")
		.replaceAll("{platform}", formatPlatformBadge(platform))
		.replaceAll("{\" \"}", "⠀")
		.replaceAll("{badges}", message.user_badges?.join(" ") || "");
}


export {formatPlatformBadge, replacePlaceholders};
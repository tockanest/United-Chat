// src/utils/validation.ts

/**
 * Validates a Twitch URL to ensure it follows the expected format.
 * Valid formats:
 * - https://www.twitch.tv/channelname
 * - http://www.twitch.tv/channelname
 * - twitch.tv/channelname
 * - www.twitch.tv/channelname
 */
export function validateTwitchUrl(url: string): boolean {
	// Channel name requirements based on Twitch guidelines:
	// - Length: 4-25 characters
	// - Characters allowed: a-z, A-Z, 0-9, _
	const channelRegex = /^[a-zA-Z0-9_]{4,25}$/;
	
	try {
		// Handle case where user just input the channel name
		if (channelRegex.test(url)) {
			return true;
		}
		
		// Parse the URL
		const urlObj = new URL(url.toLowerCase());
		
		// Check if it's a Twitch domain
		if (!urlObj.hostname.endsWith('twitch.tv')) {
			return false;
		}
		
		// Extract channel name from path (remove leading slash)
		const channelName = urlObj.pathname.slice(1);
		
		// Validate channel name format
		return channelRegex.test(channelName);
	} catch {
		// If URL parsing fails, try one more pattern match
		const fallbackRegex = /^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]{4,25})$/i;
		return fallbackRegex.test(url);
	}
}

// Example usage:
/*
validateTwitchUrl('https://www.twitch.tv/example') // true
validateTwitchUrl('http://twitch.tv/example_123') // true
validateTwitchUrl('twitch.tv/ex') // false (too short)
validateTwitchUrl('https://twitch.tv/example!') // false (invalid character)
validateTwitchUrl('https://nottwich.tv/example') // false (wrong domain)
validateTwitchUrl('example_channel') // true (just channel name)
*/
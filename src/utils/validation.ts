import {TWITCH_URL_REGEX} from "@/utils/constants";

export const validateTwitchUrl = (url: string): boolean => {
	return TWITCH_URL_REGEX.test(url);
};

export const extractChannelName = (url: string): string => {
	const match = url.match(TWITCH_URL_REGEX);
	return match ? match[1] : '';
};
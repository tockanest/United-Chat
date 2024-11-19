import {useCallback, useEffect, useState} from 'react';
import {isRegistered} from "@tauri-apps/plugin-deep-link";
import {LOCAL_STORAGE_KEYS} from "@/utils/constants";
import {extractChannelName} from "@/utils/validation";
import TauriApi from "@/lib/Tauri";

export const useTwitchAuth = () => {
	const [isLinking, setIsLinking] = useState(false);
	const [alreadyLinked, setAlreadyLinked] = useState(false);
	const [error, setError] = useState<string | null>(null);
	
	useEffect(() => {
		const checkRegistration = async () => {
			try {
				const isDeepLinkRegistered = await isRegistered("unitedchat");
				const isTwitchLinked = localStorage.getItem(LOCAL_STORAGE_KEYS.TWITCH_LINKED) === 'true';
				
				if (isTwitchLinked && isDeepLinkRegistered) {
					setAlreadyLinked(true);
					await TauriApi.FinishFrontendSetup();
				}
			} catch (err) {
				setError('Failed to check registration status');
				console.error('Registration check failed:', err);
			}
		};
		
		checkRegistration();
	}, []);
	
	const handleLinkAccount = useCallback(async () => {
		setIsLinking(true);
		setError(null);
		
		try {
			const authUrl = await TauriApi.StartLinking();
			if (authUrl) {
				await TauriApi.OpenUrl(authUrl);
				
				TauriApi.ListenEvent("splashscreen::twitch_auth", (event: TwitchAuthEvent) => {
					if (event.payload) {
						setAlreadyLinked(true);
						localStorage.setItem(LOCAL_STORAGE_KEYS.TWITCH_LINKED, 'true');
						TauriApi.FinishFrontendSetup();
					} else {
						setIsLinking(false);
						setError('Authentication failed');
					}
				});
			}
		} catch (err) {
			setIsLinking(false);
			setError('Failed to start linking process');
			console.error('Linking failed:', err);
		}
	}, [TauriApi]);
	
	const skipLinking = useCallback(async (url: string) => {
		try {
			const channelName = extractChannelName(url);
			const success = await TauriApi.SkipLinking(url, channelName);
			
			if (success) {
				setAlreadyLinked(true);
				localStorage.setItem(LOCAL_STORAGE_KEYS.TWITCH_LINKED, 'true');
				await TauriApi.FinishFrontendSetup();
				return true;
			}
			throw new Error('Failed to skip linking');
		} catch (err) {
			setError('Failed to skip linking process');
			console.error('Skip linking failed:', err);
			return false;
		}
	}, [TauriApi]);
	
	return {
		isLinking,
		alreadyLinked,
		error,
		handleLinkAccount,
		skipLinking
	};
};
// src/providers/linked.tsx
'use client';

import { isRegistered } from "@tauri-apps/plugin-deep-link";
import { createContext, useContext, useEffect, useState } from 'react';
import { TauriAPI } from '../lib/tauri';

const STORAGE_KEY = 'united-chat:twitch-linked' as const;

export const LAYOUT_TOKEN = Symbol('layout-token');

interface LinkedState {
	isLinking: boolean;
	alreadyLinked: boolean;
	error: string | null;
	isInitialized: boolean;
}

interface LinkedContextType {
	state: LinkedState;
	handleLinkAccount: () => Promise<void>;
	skipLinking: (url: string, username: string) => Promise<boolean>;
	finishSetup: (token: symbol) => Promise<boolean>;
}

const LinkedContext = createContext<LinkedContextType | undefined>(undefined);

export function LinkedProvider({ children }: { children: React.ReactNode }) {
	const [state, setState] = useState<LinkedState>({
		isLinking: false,
		alreadyLinked: false,
		error: null,
		isInitialized: false
	});

	useEffect(() => {
		const checkRegistration = async () => {
			try {
				const isDeepLinkRegistered = await isRegistered("unitedchat");
				const isTwitchLinked = localStorage.getItem(STORAGE_KEY) === 'true';

				setState(prev => ({
					...prev,
					alreadyLinked: isTwitchLinked && isDeepLinkRegistered,
					isInitialized: true
				}));
			} catch (err) {
				setState(prev => ({
					...prev,
					error: 'Failed to check registration status',
					isInitialized: true
				}));
				console.error('Registration check failed:', err);
			}
		};

		checkRegistration();
	}, []);

	const handleLinkAccount = async () => {
		setState(prev => ({
			...prev,
			isLinking: true,
			error: null
		}));

		try {
			const authUrl = await TauriAPI.Auth.startTwitchAuth();
			if (authUrl) {
				await TauriAPI.Shell.OpenUrl(authUrl);

				await TauriAPI.Events.listenToEvent<Streams.TwitchAuthEvent>(
					"splashscreen::twitch_auth",
					async (event) => {
						if (event.payload) {
							setState(prev => ({ ...prev, alreadyLinked: true }));
							localStorage.setItem(STORAGE_KEY, 'true');
							await TauriAPI.Auth.finishSetup();
						} else {
							setState(prev => ({
								...prev,
								isLinking: false,
								error: 'Authentication failed'
							}));
						}
					}
				);
			}
		} catch (err) {
			setState(prev => ({
				...prev,
				isLinking: false,
				error: 'Failed to start linking process'
			}));
			console.error('Linking failed:', err);
		}
	};

	const skipLinking = async (url: string, username: string): Promise<boolean> => {
		try {
			const success = await TauriAPI.Auth.skipTwitchAuth(url, username);

			if (success) {
				setState(prev => ({ ...prev, alreadyLinked: true }));
				localStorage.setItem(STORAGE_KEY, 'true');
				await TauriAPI.Auth.finishSetup();
				return true;
			}
			throw new Error('Failed to skip linking');
		} catch (err) {
			setState(prev => ({
				...prev,
				error: 'Failed to skip linking process'
			}));
			console.error('Skip linking failed:', err);
			return false;
		}
	};

	const finishSetup = async (token: symbol) => {
		if (token !== LAYOUT_TOKEN) {
			throw new Error("finishSetup can only be called from layout.tsx");
		}

		return await TauriAPI.Auth.finishSetup();
	};

	useEffect(() => {
		return () => {
			TauriAPI.Events.unsubscribeFromEvent("splashscreen::twitch_auth");
		};
	}, []);

	return (
		<LinkedContext.Provider value={{ state, handleLinkAccount, skipLinking, finishSetup }}>
			{children}
		</LinkedContext.Provider>
	);
}

export function useLinked() {
	const context = useContext(LinkedContext);
	if (context === undefined) {
		throw new Error('useLinked must be used within a LinkedProvider');
	}
	return context;
}
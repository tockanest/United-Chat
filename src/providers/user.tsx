'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { TauriAPI } from '../lib/tauri';

interface UserContextType {
	user: User.Information | null;
	refreshUser: () => Promise<void>;
	isLoading: boolean;
	error: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function UserProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User.Information | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	const refreshUser = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);
			const userData = await TauriAPI.Auth.getUserInfo();

			if (!userData.success) {
				throw new Error(userData.reason);
			}

			setUser(userData.user);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user data';
			setError(errorMessage);

			// Show error toast only for non-auth related errors
			if (errorMessage !== 'Setup was skipped, there\'s no user linked.' &&
				errorMessage !== 'Twitch auth not found') {
				toast.error('Error fetching user data', {
					description: errorMessage,
				});
			}
		} finally {
			setIsLoading(false);
		}
	}, [router]);

	// Initial user fetch
	useEffect(() => {
		refreshUser();
	}, [refreshUser]);

	// Periodic refresh
	useEffect(() => {
		// Only set up refresh interval if we have a user
		if (!user) return;

		const intervalId = setInterval(refreshUser, USER_REFRESH_INTERVAL);

		return () => clearInterval(intervalId);
	}, [user, refreshUser]);

	const value = {
		user,
		refreshUser,
		isLoading,
		error
	};

	return (
		<UserContext.Provider value={value}>
			{children}
		</UserContext.Provider>
	);
}

export function useUser() {
	const context = useContext(UserContext);
	if (context === undefined) {
		throw new Error('useUser must be used within a UserProvider');
	}
	return context;
}
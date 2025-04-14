// src/app/layout.tsx
'use client';

import { ReactScan } from '@/lib/utils/react-scan';
import { LAYOUT_TOKEN, LinkedProvider, useLinked } from '@/providers/linked';
import { ThemeProvider } from "@/providers/theme";
import { UserProvider } from '@/providers/user';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Public_Sans } from "next/font/google";
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Toaster } from "sonner";
import '../../public/styles/global.css';
function AuthContent({ children }: { children: React.ReactNode }) {
	const { state, finishSetup } = useLinked();
	const router = useRouter();
	const pathname = usePathname();

	// Wait for initialization before any redirects
	useEffect(() => {
		if (!state.isInitialized) return;

		const handleAuth = async () => {
			try {
				if (state.alreadyLinked) {
					if (pathname === '/auth') {
						await finishSetup(LAYOUT_TOKEN);
						router.replace("/");
					}
				} else {
					const allowedPaths = ['/mock-chat']; // Paths that don't need auth
					if (!allowedPaths.includes(pathname) && pathname !== '/auth') {
						router.replace('/auth');
					}
				}
			} catch (error) {
				// If there's an error during setup, redirect to auth
				if (pathname !== '/auth') {
					router.replace('/auth');
				}
			}
		};

		handleAuth();
	}, [state.isInitialized, state.alreadyLinked, pathname, router, finishSetup]);

	// Show loading state while initializing
	if (!state.isInitialized) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	// Always render auth page
	if (pathname === '/auth') {
		return children;
	}

	// Don't render if not authenticated, except for allowed paths
	if (!state.alreadyLinked) {
		const allowedPaths = ['/mock-chat'];
		if (allowedPaths.includes(pathname)) {
			return children;
		}
		return null;
	}

	// Render authenticated content
	return (
		<UserProvider>
			{children}
		</UserProvider>
	);
}

const publicSans = Public_Sans({
	subsets: ['latin'],
	display: 'swap',
	variable: '--font-public-sans'
});

const queryClient = new QueryClient();

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// For all other paths, use the normal authentication flow
	return (
		<html
			lang="en"
		>
			<body
				suppressHydrationWarning={true}
				className={`${publicSans.variable} font-sans antialiased`}
			>
				<QueryClientProvider client={queryClient}>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						disableTransitionOnChange
						storageKey="united-chat-theme"
					>
						<ReactScan />
						<LinkedProvider>
							<AuthContent>{children}</AuthContent>
						</LinkedProvider>
						<Toaster richColors closeButton position="top-right" />
					</ThemeProvider>
				</QueryClientProvider>
			</body>
		</html>
	);
}
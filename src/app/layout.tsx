// src/app/layout.tsx
'use client';

import { ReactScan } from "@/lib/utils/react-scan"
import { LAYOUT_TOKEN, LinkedProvider, useLinked } from '@/providers/linked';
import { UserProvider } from '@/providers/user';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Public_Sans } from "next/font/google";
import '../../public/styles/global.css';

function AuthContent({ children }: { children: React.ReactNode }) {
	const { state, finishSetup } = useLinked();
	const router = useRouter();
	const pathname = usePathname();

	// Wait for initialization before any redirects
	useEffect(() => {
		if (!state.isInitialized) return;

		if (state.alreadyLinked) {
			if (pathname === '/auth') {
				finishSetup(LAYOUT_TOKEN).then(() => {
					router.replace("/")
				})
			}
		} else if (pathname !== '/auth') {
			router.replace('/auth');
		}
	}, [state.isInitialized, state.alreadyLinked, pathname, router]);

	// Show nothing while initializing
	if (!state.isInitialized) {
		return null;
	}

	// Always render auth page
	if (pathname === '/auth') {
		return <>{children}</>;
	}

	// Don't render if not authenticated
	if (!state.alreadyLinked) {
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

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<ReactScan />
			<body className={`${publicSans.variable} font-sans antialiased`}>
				<LinkedProvider>
					<AuthContent>{children}</AuthContent>
				</LinkedProvider>
			</body>
		</html>
	);
}
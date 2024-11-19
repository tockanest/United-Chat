import {Inter} from 'next/font/google'

const inter = Inter({subsets: ['latin'], variable: '--font-sans'})

export const metadata = {
	title: 'United Chat',
	description: 'An application that allows you to merge your YouTube and Twitch chats into one window.',
}

export default function RootLayout({children}: { children: React.ReactNode }) {
	return (
		<html lang="en">
		<body className={inter.variable}>{children}</body>
		</html>
	)
}
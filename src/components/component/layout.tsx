import {Inter} from 'next/font/google'

const inter = Inter({subsets: ['latin'], variable: '--font-sans'})

export const metadata = {
	title: 'Tailwind Code Editor',
	description: 'A code editor with Tailwind CSS support',
}

export default function RootLayout({
	                                   children,
                                   }: {
	children: React.ReactNode
}) {
	return (
		<html lang="en">
		<body className={inter.variable}>{children}</body>
		</html>
	)
}
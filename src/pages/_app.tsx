import type {AppProps} from 'next/app'

import '../../public/styles/globals.css'
import ThemeProvider from "@/components/component/ThemeProvider";
import {Inter} from "next/font/google";

const inter = Inter({subsets: ['latin']})

export default function App({Component, pageProps}: AppProps) {
	return (
		<main className={inter.className}>
			<ThemeProvider/>
			<Component {...pageProps} />
		</main>
	)
}
"use client"

export default function ThemeProvider() {
	if (typeof window === "undefined") return null
	
	let theme = localStorage.getItem("theme")
	
	if (!theme) {
		const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)")
		if (prefersDarkScheme.matches) {
			document.documentElement.setAttribute("data-theme", "dark")
			localStorage.setItem("theme", "dark")
			theme = "dark"
		} else {
			document.documentElement.setAttribute("data-theme", "light")
			localStorage.setItem("theme", "light")
			theme = "light"
		}
	}
	
	document.documentElement.setAttribute("data-theme", theme)
	return;
}
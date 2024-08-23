"use client"

export default function ThemeProvider() {
    if (typeof window === "undefined") return null

    const theme = localStorage.getItem("theme")

    if (!theme) {
        document.documentElement.setAttribute("data-theme", "dark")
        localStorage.setItem("theme", "dark")
    }

    document.documentElement.setAttribute("data-theme", theme as string)
    return;
}
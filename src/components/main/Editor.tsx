// src/app/editor/page.tsx
'use client';

import Editor from '@/components/editor/editor';
import { TauriAPI } from '@/lib/tauri';
import { useEffect, useState } from 'react';

export default function EditorPage(
) {
	const [htmlCode, setHtmlCode] = useState<string>('');
	const [cssCode, setCssCode] = useState<string>('/* Add your custom CSS here */');
	const [previewPosition, setPreviewPosition] = useState<'right' | 'bottom'>('right');
	const [theme, setTheme] = useState<string>('default');
	const [isStarted, setIsStarted] = useState(false);
	const [availableThemes, setAvailableThemes] = useState<string[]>([]);

	useEffect(() => {
		// Load theme on mount
		const storedTheme = localStorage.getItem('chatTheme') || 'default';
		setTheme(storedTheme);

		// Get available themes
		TauriAPI.Theme.getAvailableThemes().then(themes => {
			setAvailableThemes(themes.map(theme => theme[0]));
		});

		// Load initial theme data
		TauriAPI.Theme.getTheme(storedTheme).then(themeData => {
			setHtmlCode(themeData.html_code);
			setCssCode(themeData.css_code);
		});
	}, []);

	const handleThemeChange = async (newTheme: string) => {
		setTheme(newTheme);
		localStorage.setItem('chatTheme', newTheme);
		const themeData = await TauriAPI.Theme.getTheme(newTheme);
		setHtmlCode(themeData.html_code);
		setCssCode(themeData.css_code);
	};

	const handleSave = async () => {
		try {
			await TauriAPI.Theme.saveTheme(theme, htmlCode, cssCode);
			// Could add a toast notification here
		} catch (error) {
			console.error('Failed to save theme:', error);
		}
	};

	const handleStart = async () => {
		try {
			if (!isStarted) {
				await TauriAPI.Chat.startUnitedChat();
				setIsStarted(true);
			} else {
				await TauriAPI.Chat.stopUnitedChat();
				setIsStarted(false);
			}
		} catch (error) {
			console.error('Failed to toggle chat:', error);
		}
	};

	return (
		<Editor
			htmlCode={htmlCode}
			cssCode={cssCode}
			setHtmlCode={setHtmlCode}
			setCssCode={setCssCode}
			previewPosition={previewPosition}
			setPreviewPosition={setPreviewPosition}
			theme={theme}
			onThemeChange={handleThemeChange}
			onSave={handleSave}
			onStart={handleStart}
			isStarted={isStarted}
			availableThemes={availableThemes}
		/>
	);
}
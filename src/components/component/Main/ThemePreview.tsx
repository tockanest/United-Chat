import React, {useEffect, useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {replacePlaceholders} from "@/components/component/Main/Helpers/webChatUtils";

interface ThemePreviewProps {
	theme: ChatTheme;
	isSelected: boolean;
	onSelect: (id: string) => void;
}

export function ThemePreview({theme, isSelected, onSelect}: ThemePreviewProps) {
	const [tailwindCSS, setTailwindCSS] = useState<string>('');
	
	useEffect(() => {
		// Load Tailwind CSS once
		fetch('/styles/tailwind_complete.css')
			.then(response => response.text())
			.then(css => setTailwindCSS(css))
			.catch(error => console.error('Error loading Tailwind CSS:', error));
	}, []);
	
	const mockMessage = {
		platform: "twitch",
		message: {
			id: "123456",
			display_name: "TestUser",
			message: "This is a test message with custom styling! 🎨",
			raw_data: {
				raw_message: "This is a test message",
				raw_emotes: ''
			},
			user_color: "#FF0000",
			user_badges: ["moderator", "subscriber"],
			timestamp: Date.now(),
			emotes: [],
			tags: []
		}
	};
	
	return (
		<Card
			className={`cursor-pointer transition-all duration-200 ${
				isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
			}`}
			onClick={() => onSelect(theme.id)}
		>
			<CardHeader className="pb-2">
				<CardTitle className="text-lg font-medium">
					{theme.name.charAt(0).toUpperCase() + theme.name.slice(1).toLowerCase()}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="relative rounded-md overflow-hidden bg-background/50 p-4">
					<div
						className="preview-container w-full max-h-[200px] overflow-y-auto border border-border rounded-md bg-black"
					>
						<div className="theme-preview-wrapper p-2">
							{/* Injected Tailwind CSS */}
							<script src="/styles/tailwind_complete.css"></script>
							{/* User's custom CSS */}
							<style>{theme.css}</style>
							{/* Content */}
							<div
								className="theme-preview"
								dangerouslySetInnerHTML={{
									__html: replacePlaceholders(theme.html, mockMessage.message, "twitch")
								}}
							/>
						</div>
					</div>
					{isSelected && (
						<div className="absolute top-2 right-2">
              <span
	              className="inline-flex items-center rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                Selected
              </span>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
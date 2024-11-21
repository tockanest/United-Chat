import React from 'react';
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {RefreshCw} from "lucide-react";
import {ThemePreview} from "@/components/component/Main/ThemePreview";

interface ChatThemeManagerProps {
	chatThemes: ChatTheme[];
	selectedChatTheme: string;
	onThemeSelect: (id: string) => void;
	onRefresh: () => void;
}

export function ChatThemeManager(
	{
		chatThemes,
		selectedChatTheme,
		onThemeSelect,
		onRefresh
	}: ChatThemeManagerProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>Chat Theme Management</span>
					<Button variant="outline" size="sm" onClick={onRefresh}>
						<RefreshCw className="h-4 w-4 mr-2"/>
						Refresh Themes
					</Button>
				</CardTitle>
				<CardDescription>
					Select and preview chat themes. Each theme can be customized with its own HTML and CSS.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{chatThemes.length === 0 ? (
						<div className="col-span-full text-center py-8">
							<p className="text-muted-foreground">No themes available. Create a new theme to get started.</p>
						</div>
					) : (
						chatThemes.map((theme) => (
							<ThemePreview
								key={theme.id}
								theme={theme}
								isSelected={selectedChatTheme === theme.id}
								onSelect={onThemeSelect}
							/>
						))
					)}
				</div>
			</CardContent>
		</Card>
	);
}
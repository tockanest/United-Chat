import React from 'react';
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Twitch, Youtube} from "lucide-react";

interface AccountLinkingProps {
	youtubeConnected: boolean;
	twitchConnected: boolean;
	onYouTubeClick: () => void;
	onTwitchClick: () => void;
}

export function AccountLinking(
	{
		youtubeConnected,
		twitchConnected,
		onYouTubeClick,
		onTwitchClick
	}: AccountLinkingProps) {
	return (
		<Card className="mb-4">
			<CardHeader>
				<CardTitle>Account Linking</CardTitle>
				<CardDescription>Connect your Twitch and YouTube accounts</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center">
						<Youtube className="mr-2 h-6 w-6"/>
						<span>YouTube</span>
					</div>
					<Button onClick={onYouTubeClick}>
						{youtubeConnected ? 'Disconnect' : 'Connect'}
					</Button>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex items-center">
						<Twitch className="mr-2 h-6 w-6"/>
						<span>Twitch</span>
					</div>
					<Button onClick={onTwitchClick}>
						{twitchConnected ? 'Disconnect' : 'Connect'}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
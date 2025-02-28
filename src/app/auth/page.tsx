// src/app/auth/page.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useLinked } from '@/providers/linked';
import { retrieveTwitchChannelName, validateTwitchUrl } from '@/lib/utils/validation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2Icon, TwitchIcon } from 'lucide-react';

export default function LoginPage() {
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);
	const [showStreamerUrlDialog, setShowStreamerUrlDialog] = useState(false);
	const [streamerUrl, setStreamerUrl] = useState('');
	const [urlError, setUrlError] = useState('');

	const { state, handleLinkAccount, skipLinking } = useLinked();

	const handleStreamerUrlSubmit = async () => {
		if (validateTwitchUrl(streamerUrl)) {
			setUrlError('');
			const success = await skipLinking(streamerUrl, retrieveTwitchChannelName(streamerUrl)!);
			if (!success) {
				setUrlError('Failed to process the URL. Please try again.');
				setShowStreamerUrlDialog(true);
			}
			setShowStreamerUrlDialog(false);
		} else {
			setUrlError('Please enter a valid Twitch channel URL');
		}
	};

	// Validate the URL while typing
	const handleStreamerUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		if (validateTwitchUrl(value)) {
			setUrlError('');
		} else {
			setUrlError('Please enter a valid Twitch channel URL');
		}
	};

	return (
		<div
			className="min-h-screen bg-linear-to-b from-background to-foreground/10 flex flex-col items-center justify-center p-4">
			{/* Logo */}
			<Image src="/icons/logo.svg" alt="United Chat Logo" width={128} height={128} className="w-32 h-32 mb-8" />

			<Card className="w-full max-w-md">
				<CardHeader className="space-y-1 flex flex-col items-center">
					<CardTitle className="text-2xl font-bold">Welcome to United Chat</CardTitle>
					<CardDescription>
						Connect your Twitch account to get started
					</CardDescription>
					{state.error && (
						<p className="text-sm text-destructive mt-2">{state.error}</p>
					)}
				</CardHeader>
				<CardContent className="space-y-4">
					<Button
						onClick={handleLinkAccount}
						disabled={state.isLinking}
						className="w-full bg-[#9146FF] hover:bg-[#7c2cff] text-white cursor-pointer"
						size="lg"
					>
						{state.isLinking ? (
							<>
								<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
								Connecting...
							</>
						) : (
							<>
								<TwitchIcon className="mr-2 h-5 w-5" />
								Connect with Twitch
							</>
						)}
					</Button>

					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-background px-2 text-muted-foreground">
								Or continue without account
							</span>
						</div>
					</div>

					<Button
						variant="outline"
						onClick={() => setShowConfirmDialog(true)}
						className="w-full cursor-pointer"
						size="lg"
						disabled={state.isLinking}
					>
						Skip Authentication
					</Button>
				</CardContent>
			</Card>

			<AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Continue without account?</AlertDialogTitle>
						<AlertDialogDescription>
							Some features might be limited when using United Chat without a Twitch account.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="cursor-pointer">Go Back</AlertDialogCancel>
						<AlertDialogAction className="bg-[#9146FF] hover:bg-[#7c2cff] text-white cursor-pointer" onClick={() => {
							setShowConfirmDialog(false);
							setShowStreamerUrlDialog(true);
						}}>
							Continue
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={showStreamerUrlDialog} onOpenChange={setShowStreamerUrlDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Enter Channel URL</AlertDialogTitle>
						<AlertDialogDescription>
							Please provide the Twitch channel URL you want to connect to.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="flex flex-col gap-4 py-4">
						<div className="flex flex-col gap-2">
							<Label htmlFor="channel-url">
								Channel URL
							</Label>
							<Input
								id="channel-url"
								value={streamerUrl}
								onChange={(e) => {
									handleStreamerUrlChange(e);
									setStreamerUrl(e.target.value);
								}}
								placeholder="https://www.twitch.tv/channelname"
							/>
						</div>
						{urlError && (
							<p className="text-sm text-destructive">
								{urlError}
							</p>
						)}
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={state.isLinking}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={streamerUrl.length === 0 || state.isLinking || urlError !== ''}
							className="bg-[#9146FF] hover:bg-[#7c2cff] text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={handleStreamerUrlSubmit}
						>
							{state.isLinking ? (
								<>
									<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
									Connecting...
								</>
							) : (
								'Connect'
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
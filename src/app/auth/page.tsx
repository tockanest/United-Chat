// src/app/auth/page.tsx
'use client';

import { SiTwitch } from "@icons-pack/react-simple-icons";
import { AlertCircle, Loader2Icon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { retrieveTwitchChannelName, validateTwitchUrl } from '../../lib/utils/validation';
import { useLinked } from '../../providers/linked';

export default function LoginPage() {
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);
	const [showStreamerUrlDialog, setShowStreamerUrlDialog] = useState(false);
	const [streamerUrl, setStreamerUrl] = useState('');
	const [urlError, setUrlError] = useState('');
	const router = useRouter();

	const { state, handleLinkAccount, skipLinking } = useLinked();

	useEffect(() => {
		// Show error toast if there's an error
		if (state.error) {
			toast.error(state.error, {
				description: "Please try again or contact support if the issue persists.",
			});
		}
	}, [state.error]);

	const handleStreamerUrlSubmit = async () => {
		if (!validateTwitchUrl(streamerUrl)) {
			setUrlError('Please enter a valid Twitch channel URL');
			return;
		}

		try {
			setUrlError('');
			const channelName = retrieveTwitchChannelName(streamerUrl);
			if (!channelName) {
				throw new Error('Invalid channel name');
			}

			const success = await skipLinking(streamerUrl, channelName);
			if (!success) {
				throw new Error('Failed to process the URL');
			}

			setShowStreamerUrlDialog(false);
			toast.success('Successfully connected to channel', {
				description: `You are now connected to ${channelName}'s channel`,
			});
			router.push('/');
		} catch (error) {
			setUrlError('Failed to process the URL. Please try again.');
			toast.error('Connection failed', {
				description: error instanceof Error ? error.message : 'Please try again.',
			});
		}
	};

	const handleStreamerUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setStreamerUrl(value);
		setUrlError(validateTwitchUrl(value) ? '' : 'Please enter a valid Twitch channel URL');
	};

	return (
		<div className="min-h-screen bg-linear-to-b from-background to-foreground/10 flex flex-col items-center justify-center p-4">
			<Image
				src="/icons/logo-dark.svg"
				alt="United Chat Logo"
				width={128}
				height={128}
				className="w-32 h-32 mb-8"
				priority // Prioritize logo loading
			/>

			<Card className="w-full max-w-md">
				<CardHeader className="space-y-1 flex flex-col items-center">
					<CardTitle className="text-2xl font-bold">Welcome to United Chat</CardTitle>
					<CardDescription>
						Connect your Twitch account to get started
					</CardDescription>
					{state.error && (
						<div className="flex items-center gap-2 text-destructive mt-2">
							<AlertCircle className="h-4 w-4" />
							<p className="text-sm">{state.error}</p>
						</div>
					)}
				</CardHeader>
				<CardContent className="space-y-4">
					<Button
						onClick={handleLinkAccount}
						disabled={state.isLinking}
						className="w-full bg-[#9146FF] hover:bg-[#7c2cff] text-white cursor-pointer transition-colors"
						size="lg"
					>
						{state.isLinking ? (
							<>
								<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
								Connecting...
							</>
						) : (
							<>
								<SiTwitch className="mr-2 h-5 w-5" />
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
						className="w-full cursor-pointer transition-colors"
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
							You can always connect your account later.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="cursor-pointer">Go Back</AlertDialogCancel>
						<AlertDialogAction
							className="bg-[#9146FF] hover:bg-[#7c2cff] text-white cursor-pointer transition-colors"
							onClick={() => {
								setShowConfirmDialog(false);
								setShowStreamerUrlDialog(true);
							}}
						>
							Continue
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={showStreamerUrlDialog}
				onOpenChange={(open) => {
					if (!open) {
						setStreamerUrl('');
						setUrlError('');
					}
					setShowStreamerUrlDialog(open);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Enter Channel URL</AlertDialogTitle>
						<AlertDialogDescription>
							Please provide the Twitch channel URL you want to connect to.
							Example: https://www.twitch.tv/channelname
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="flex flex-col gap-4 py-4">
						<div className="flex flex-col gap-2">
							<Label htmlFor="channel-url">Channel URL</Label>
							<Input
								id="channel-url"
								value={streamerUrl}
								onChange={handleStreamerUrlChange}
								placeholder="https://www.twitch.tv/channelname"
								className={urlError ? 'border-destructive' : ''}
								disabled={state.isLinking}
							/>
						</div>
						{urlError && (
							<div className="flex items-center gap-2 text-destructive">
								<AlertCircle className="h-4 w-4" />
								<p className="text-sm">{urlError}</p>
							</div>
						)}
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={state.isLinking}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={streamerUrl.length === 0 || state.isLinking || urlError !== ''}
							className="bg-[#9146FF] hover:bg-[#7c2cff] text-white cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
// src/app/auth/page.tsx
'use client';

import {useState} from 'react';
import {useLinked} from '@/providers/linked';
import {validateTwitchUrl} from '@/lib/utils/validation';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
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
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Loader2Icon, TwitchIcon} from 'lucide-react';

export default function LoginPage() {
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);
	const [showStreamerUrlDialog, setShowStreamerUrlDialog] = useState(false);
	const [streamerUrl, setStreamerUrl] = useState('');
	const [urlError, setUrlError] = useState('');
	
	const {state, handleLinkAccount, skipLinking} = useLinked();
	
	const handleStreamerUrlSubmit = async () => {
		if (validateTwitchUrl(streamerUrl)) {
			setUrlError('');
			setShowStreamerUrlDialog(false);
			const success = await skipLinking(streamerUrl);
			if (!success) {
				setUrlError('Failed to process the URL. Please try again.');
				setShowStreamerUrlDialog(true);
			}
		} else {
			setUrlError('Please enter a valid Twitch channel URL');
		}
	};
	
	return (
		<div
			className="min-h-screen bg-gradient-to-b from-background to-foreground/10 flex flex-col items-center justify-center p-4">
			{/* Logo */}
			<svg className="w-32 h-32 mb-8" viewBox="0 0 512 512">
				<circle cx="256" cy="256" r="250" fill="#1a1a1a"/>
				<path
					d="M180 180 Q140 180 140 220 L140 300 Q140 340 180 340 L220 340 L240 380 L260 340 L300 340 Q340 340 340 300 L340 220 Q340 180 300 180 Z"
					fill="#9146FF"/>
				<path
					d="M200 160 Q160 160 160 200 L160 280 Q160 320 200 320 L240 320 L260 360 L280 320 L320 320 Q360 320 360 280 L360 200 Q360 160 320 160 Z"
					fill="#FF0000"/>
				<circle cx="256" cy="256" r="180" fill="none" stroke="white" strokeWidth="24" strokeDasharray="20,10"/>
				<path d="M256 196 L286 256 L256 316 L226 256 Z" fill="white"/>
				<circle cx="206" cy="256" r="8" fill="white"/>
				<circle cx="306" cy="256" r="8" fill="white"/>
			</svg>
			
			<Card className="w-full max-w-md">
				<CardHeader className="space-y-1">
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
						className="w-full bg-[#9146FF] hover:bg-[#7c2cff] text-white"
						size="lg"
					>
						{state.isLinking ? (
							<>
								<Loader2Icon className="mr-2 h-4 w-4 animate-spin"/>
								Connecting...
							</>
						) : (
							<>
								<TwitchIcon className="mr-2 h-5 w-5"/>
								Connect with Twitch
							</>
						)}
					</Button>
					
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t"/>
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
						className="w-full"
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
						<AlertDialogCancel>Go Back</AlertDialogCancel>
						<AlertDialogAction onClick={() => {
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
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="channel-url" className="text-right">
								Channel URL
							</Label>
							<Input
								id="channel-url"
								value={streamerUrl}
								onChange={(e) => setStreamerUrl(e.target.value)}
								className="col-span-3"
								placeholder="https://www.twitch.tv/channelname"
							/>
						</div>
						{urlError && (
							<p className="text-sm text-destructive col-start-2 col-span-3">
								{urlError}
							</p>
						)}
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleStreamerUrlSubmit}>
							Connect
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
import {FC, useState} from 'react';

import {Loader2Icon, TwitchIcon} from 'lucide-react';
import {useTwitchAuth} from '@/hooks/useTwitchAuth';
import {validateTwitchUrl} from '@/utils/validation';
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
	AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";

function LoadingState() {
	return null;
}

const SplashScreen: FC = () => {
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);
	const [showStreamerUrlDialog, setShowStreamerUrlDialog] = useState(false);
	const [streamerUrl, setStreamerUrl] = useState('');
	const [urlError, setUrlError] = useState('');
	
	const {
		isLinking,
		alreadyLinked,
		error,
		handleLinkAccount,
		skipLinking
	} = useTwitchAuth();
	
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
	
	if (alreadyLinked) {
		return <LoadingState/>;
	}
	
	return (
		<div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-purple-500 to-indigo-500">
			<Card className="w-96">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
						<TwitchIcon className="h-6 w-6"/>
						Twitch Config
					</CardTitle>
					<CardDescription>Link your Twitch account to get started</CardDescription>
					{error && <p className="text-sm text-red-500 mt-2">{error}</p>}
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<Button
						onClick={handleLinkAccount}
						disabled={isLinking}
						className="w-full"
					>
						{isLinking ? (
							<>
								<Loader2Icon className="mr-2 h-4 w-4 animate-spin"/>
								Linking...
							</>
						) : (
							'Link Twitch Account'
						)}
					</Button>
					<Button
						variant="outline"
						onClick={() => setShowConfirmDialog(true)}
						className="w-full"
						disabled={isLinking}
					>
						Continue without account
					</Button>
				</CardContent>
			</Card>
			
			<AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you sure?</AlertDialogTitle>
						<AlertDialogDescription>
							Continuing without linking your Twitch account may limit some features of the application.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
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
						<AlertDialogTitle>Enter Streamer URL</AlertDialogTitle>
						<AlertDialogDescription>
							Please provide the Twitch channel URL you want to listen to.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="streamer-url" className="text-right">
								URL
							</Label>
							<Input
								id="streamer-url"
								value={streamerUrl}
								onChange={(e: any) => setStreamerUrl(e.target.value)}
								className="col-span-3"
								placeholder="https://www.twitch.tv/channelname"
							/>
						</div>
						{urlError && <p className="text-sm text-red-500">{urlError}</p>}
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleStreamerUrlSubmit}>Submit</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default SplashScreen;
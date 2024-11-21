import React from 'react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";

interface LinkingDialogsProps {
	startLinkingTwitchAlert: boolean;
	startLinkingYtAlert: boolean;
	logoutAlert: boolean;
	showYtChannelDialog: boolean;
	newLiveStream: { url: string };
	isLoading: boolean;
	onTwitchAlertChange: (value: boolean) => void;
	onYtAlertChange: (value: boolean) => void;
	onLogoutAlertChange: (value: boolean) => void;
	onYtChannelDialogChange: (value: boolean) => void;
	onNewLiveStreamChange: (value: { url: string }) => void;
	onStartLinkingTwitch: () => void;
	onStartLinkingYt: () => void;
	onLogout: () => void;
	onAddChannel: () => void;
}

export function LinkingDialogs(
	{
		startLinkingTwitchAlert,
		startLinkingYtAlert,
		logoutAlert,
		showYtChannelDialog,
		newLiveStream,
		isLoading,
		onTwitchAlertChange,
		onYtAlertChange,
		onLogoutAlertChange,
		onYtChannelDialogChange,
		onNewLiveStreamChange,
		onStartLinkingTwitch,
		onStartLinkingYt,
		onLogout,
		onAddChannel
	}: LinkingDialogsProps) {
	return (
		<>
			<AlertDialog open={startLinkingTwitchAlert} onOpenChange={onTwitchAlertChange}>
				<AlertDialogContent className="sm:max-w-[425px]">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-2xl">
							Link Twitch Account
						</AlertDialogTitle>
						<AlertDialogDescription className="text-center">
							To link your Twitch account, the app will close this window and go back to the splashscreen
							to connect to Twitch.<br/>
							Are you sure you want to continue?<br/><br/>
							Any unsaved changes will be lost!
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction onClick={() => onTwitchAlertChange(false)}>
							Close
						</AlertDialogAction>
						<AlertDialogAction onClick={onStartLinkingTwitch}>
							Open
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			
			<AlertDialog open={showYtChannelDialog} onOpenChange={onYtChannelDialogChange}>
				<AlertDialogContent className={"sm:max-w-[720px]"}>
					<AlertDialogHeader/>
				</AlertDialogContent>
			</AlertDialog>
			
			<Dialog open={startLinkingYtAlert} onOpenChange={onYtAlertChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Link your YouTube</DialogTitle>
					</DialogHeader>
					<DialogDescription>
						To link your YouTube account, you can use your channel URL<br/><br/>
						Why? It's easier than using OAuth and I don't have the time to implement it. Sorry.
					</DialogDescription>
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="url" className="text-right">
								Channel URL
							</Label>
							<Input
								id="url"
								value={newLiveStream.url}
								placeholder={"https://www.youtube.com/channel/..."}
								onChange={(e) => onNewLiveStreamChange({
									...newLiveStream,
									url: e.target.value
								})}
								className="col-span-3"
							/>
						</div>
					</div>
					<Button onClick={onAddChannel} disabled={isLoading}>
						{isLoading ? 'Adding...' : 'Add Channel'}
					</Button>
				</DialogContent>
			</Dialog>
			
			<AlertDialog open={logoutAlert} onOpenChange={onLogoutAlertChange}>
				<AlertDialogContent className="sm:max-w-[425px]">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-2xl">
							Unlink Twitch Account
						</AlertDialogTitle>
						<AlertDialogDescription className="text-center">
							Are you sure you want to unlink your Twitch account?<br/>
							You will either need to log in again or use the app without a linked Twitch
							account.<br/><br/>
							Any unsaved changes will be lost, but everything else will be saved.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction onClick={() => onLogoutAlertChange(false)}>
							Close
						</AlertDialogAction>
						<AlertDialogAction onClick={onLogout}>
							Open
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {CheckIcon, CopyIcon, LinkIcon} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import {handleCopy} from "@/components/component/Main/Helpers/webChatUtils";
import TauriApi from "@/lib/Tauri";
import React, {useState} from "react";

export type AlertsProps = {
	showConfirmDialog: boolean;
	setShowConfirmDialog: React.Dispatch<React.SetStateAction<boolean>>;
	dialogMessage: string;
	setWebChatWindowShown: React.Dispatch<React.SetStateAction<boolean>>;
	showSaveDialog: boolean;
	setShowSaveDialog: React.Dispatch<React.SetStateAction<boolean>>;
	htmlCode: string;
	cssCode: string;
	setNewTheme: React.Dispatch<React.SetStateAction<boolean>>;
	triggerReloadAlert: boolean;
	setTriggerReloadAlert: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Alerts(
	{
		showConfirmDialog,
		setShowConfirmDialog,
		dialogMessage,
		setWebChatWindowShown,
		showSaveDialog,
		setShowSaveDialog,
		htmlCode,
		cssCode,
		setNewTheme,
		triggerReloadAlert,
		setTriggerReloadAlert
	}: AlertsProps
) {
	const [copied, setCopied] = useState(false)
	const [themeName, setThemeName] = useState<string>("")

	return (
		<>
			<AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
				<AlertDialogContent className="sm:max-w-[425px]">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-2xl">Use this URL!</AlertDialogTitle>
						<AlertDialogDescription className="text-center">
							Use the URL below to view the chat in a browser.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="bg-secondary p-3 rounded-md">
						<div className="relative flex items-center">
							<LinkIcon
								className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
							<Input
								value={dialogMessage}
								className="pl-9 pr-12 bg-gray-500 text-center font-medium"
								readOnly
							/>
							<Button
								size="sm"
								variant="ghost"
								className={cn(
									"absolute right-1 top-1/2 -translate-y-1/2",
									copied && "text-green-500"
								)}
								onClick={() => {
									handleCopy(dialogMessage, setCopied)
								}}
							>
								{copied ? <CheckIcon className="h-4 w-4"/> : <CopyIcon className="h-4 w-4"/>}
							</Button>
						</div>
					</div>
					<AlertDialogFooter>
						<AlertDialogAction onClick={() => setShowConfirmDialog(false)}>
							Close
						</AlertDialogAction>
						<AlertDialogAction onClick={() => {
							setShowConfirmDialog(false)
							setWebChatWindowShown(true)
							TauriApi.OpenWebChatWindow(dialogMessage)
						}}>
							Open
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
				<AlertDialogContent className="sm:max-w-[425px]">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-2xl">Save Theme</AlertDialogTitle>
						<AlertDialogDescription className="text-center">
							Enter a name for the theme to save
						</AlertDialogDescription>
					</AlertDialogHeader>
					<Input
						className="w-full"
						placeholder="Theme name"
						value={themeName}
						onChange={(e) => setThemeName(e.target.value)}
					/>
					<AlertDialogFooter>
						<AlertDialogAction onClick={() => setShowSaveDialog(false)}>
							Cancel
						</AlertDialogAction>
						<AlertDialogAction onClick={() => {
							setShowSaveDialog(false)
							TauriApi.SaveTheme(themeName, htmlCode, cssCode).then((result) => {
								if (result) {
									setNewTheme(true)
								}
							})
						}}>
							Save
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={triggerReloadAlert} onOpenChange={setTriggerReloadAlert}>
				<AlertDialogContent className="sm:max-w-[425px]">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-2xl">Reload Page</AlertDialogTitle>
						<AlertDialogDescription className="text-center">
							Are you sure you want to reload the page?<br/>
							All unsaved changes will be lost. No take backs!
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction onClick={() => setTriggerReloadAlert(false)}>
							Cancel
						</AlertDialogAction>
						<AlertDialogAction onClick={() => {
							setTriggerReloadAlert(false)
							window.location.reload();
						}}>
							Reload
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
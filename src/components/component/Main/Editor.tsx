import React, {useEffect, useState} from "react";
import {getLayoutIcon, getSeparatorStyle} from "@/components/component/Main/Helpers/MainFrame";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Button} from "@/components/ui/button";
import {AlertCircle, CheckIcon, CopyIcon, LayoutIcon, LinkIcon, Pause, Play, SaveIcon} from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import {html} from "@codemirror/lang-html";
import {dracula} from "@uiw/codemirror-theme-dracula";
import {css} from "@codemirror/lang-css";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {Input} from "@/components/ui/input";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {
	handleQuickResize,
	handleQuickResizeBlur,
	handleResize,
	handleResizeEnd,
	handleResizeStart,
	useResizeRefs
} from "@/components/component/Main/Helpers/resizeUtils";
import TauriApi from "@/lib/Tauri";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {cn} from "@/lib/utils";
import ConfigDropdown from "@/components/component/Editor/ConfigDropdown";
import {replacePlaceholders} from "@/components/component/Main/Helpers/webChatUtils";

type EditorProps = {
	setPreviewPosition: React.Dispatch<React.SetStateAction<PreviewPosition>>,
	previewPosition: PreviewPosition,
	editorSize: number,
	setEditorSize: React.Dispatch<React.SetStateAction<number>>,
	showPreview: boolean,
	user: UserInformation | null,
}

function removeComments(html: string): string {
	return html.replace(/<!--[\s\S]*?-->/g, '');
}

export default function Editor(
	{
		setPreviewPosition,
		previewPosition,
		editorSize,
		setEditorSize,
		showPreview
	}: EditorProps
) {

	const [isResizing, setIsResizing] = useState<boolean>(false);
	const [editorSelected, setEditorSelected] = useState<string>('html');
	const [quickResizeValue, setQuickResizeValue] = useState<string>("15");
	const [pendingResize, setPendingResize] = useState<boolean>(false);

	const [htmlCode, setHtmlCode] = useState<string>("");
	const [cssCode, setCssCode] = useState<string>('/* Add your custom CSS here */');
	const [combinedCode, setCombinedCode] = useState<string>("");
	const [messages, setMessages] = useState<PlatformMessage<"twitch" | "youtube">[]>([]);

	const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
	const [dialogMessage, setDialogMessage] = useState<string>("");
	const [copied, setCopied] = useState(false)
	const [webChatWindowShown, setWebChatWindowShown] = useState<boolean>(false);

	const [config, setConfig] = useState<ConfigState>({
		scaling: false,
		scalingValue: 1,
		fadeOut: false,
		messageRemoveTimer: 5,
		maxMessages: 10,
		maxWidth: 800,
		maxHeight: 600,
		currentWidth: 800,
		currentHeight: 600,
	});


	useEffect(() => {
		const configString = localStorage.getItem("chatConfig");
		const config = configString ? JSON.parse(configString) : null;
		if (config) {
			setConfig(config);
		}
	}, [])

	useEffect(() => {
		localStorage.setItem("chatConfig", JSON.stringify(config));
	}, [config])

	const handleConfigChange = (key: keyof ConfigState, value: number | boolean) => {
		setConfig(prevConfig => ({...prevConfig, [key]: value}))
	}

	const {resizeRef, editorRef, previewRef, containerRef} = useResizeRefs();

	const [startWebsocket, setStartWebsocket] = useState<boolean>(false);

	const renderPreviewHeader = () => (
		<div className="flex items-center space-x-2 px-4 py-2 border-b">
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="relative">
							<Input
								type="number"
								min={15}
								max={100}
								value={quickResizeValue}
								onChange={(event) => {
									handleQuickResize(event, setQuickResizeValue, setPendingResize);
								}}
								onBlur={() => {
									handleQuickResizeBlur(quickResizeValue, setEditorSize, setPendingResize, pendingResize);
								}}
								className={`w-20 ${pendingResize ? 'border-yellow-500' : ''}`}
								placeholder="Size %"
							/>
							{pendingResize && (
								<AlertCircle
									className="w-4 h-4 text-yellow-500 absolute right-2 top-1/2 transform -translate-y-1/2"/>
							)}
						</div>
					</TooltipTrigger>
					<TooltipContent>
						<p>Enter a value between 15 and 100 to resize the preview.</p>
						<p>Changes will apply when you leave the input field.</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm">
						<LayoutIcon className="h-4 w-4 mr-2"/>
						{getLayoutIcon(previewPosition)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem onSelect={() => setPreviewPosition('right')}>
						Right {previewPosition === 'right' && '✓'}
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => setPreviewPosition('bottom')}>
						Bottom {previewPosition === 'bottom' && '✓'}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);

	useEffect(() => {
		const handleGlobalMouseMove = (e: MouseEvent) => {
			if (isResizing) {
				handleResize(e, isResizing, containerRef, editorRef, previewRef, previewPosition);
			}
		};

		const handleGlobalMouseUp = () => {
			if (isResizing) {
				handleResizeEnd(isResizing, setIsResizing, editorRef, containerRef, previewPosition, setEditorSize, setQuickResizeValue, editorSize);
			}
		};

		document.addEventListener('mousemove', handleGlobalMouseMove);
		document.addEventListener('mouseup', handleGlobalMouseUp);

		return () => {
			document.removeEventListener('mousemove', handleGlobalMouseMove);
			document.removeEventListener('mouseup', handleGlobalMouseUp);
		};
	}, [isResizing, handleResize, handleResizeEnd]);

	useEffect(() => {
		const formattedMessages = messages.map(msg => replacePlaceholders(htmlCode, msg.message, msg.platform)).join('');
		setCombinedCode(`
      <html lang="en">
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            ${cssCode};
            .message { display: flex; flex-direction: row; margin: 0; padding: 0; }
            .chat-container { display: flex; flex-direction: column; gap: 0; }
          </style>
          <title>UnitedChat - Iframe</title>
        </head>
        <body class="chat-container w-full">
          ${formattedMessages}
        </body>
      </html>
    `);
	}, [htmlCode, cssCode, messages]);

	useEffect(() => {
		const editorTheme = localStorage.getItem("chatTheme") || "default";
		TauriApi.GetEditorTheme(editorTheme).then((theme) => {
			setHtmlCode(theme);
		});
	}, []);

	useEffect(() => {
		if (startWebsocket) {
			TauriApi.ConnectTwitchWebsocket();
			const eventListener = (data: { payload: TwitchResponse }) => {
				const newMessage = {
					platform: "twitch",
					message: {
						...data.payload,
						timestamp: Date.now()
					}
				};
				setMessages((prevMessages) => [...prevMessages, newMessage as PlatformMessage<"twitch" | "youtube">]);
			};

			// Register the event listener
			TauriApi.ListenEvent("chat-data::twitch", eventListener);
		} else {
			TauriApi.UnsubscribeEvent("chat-data::twitch");
		}

		return () => {
			TauriApi.UnsubscribeEvent("chat-data::twitch");
		};
	}, [startWebsocket])


	useEffect(() => {
		const cleanupInterval = setInterval(() => {
			const now = Date.now();

			// Check if a message is older than 10 seconds
			setMessages((prevMessages) => prevMessages.filter((msg) => now - msg.message.timestamp < 10000));
		}, 1000);

		return () => clearInterval(cleanupInterval);
	}, []);

	const handleCopy = () => {
		navigator.clipboard.writeText(dialogMessage)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}


	return (
		<main className="flex-grow flex overflow-hidden">
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
								onClick={handleCopy}
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
							TauriApi.OpenWebChatWindow(dialogMessage);
						}}>
							Open
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<div ref={containerRef}
			     className={`flex ${previewPosition === 'bottom' || previewPosition === 'top' ? 'flex-col' : 'flex-row'} w-full h-full resize-container`}>
				{(previewPosition === 'top' || previewPosition === 'left') && showPreview && (
					<>
						<div
							ref={previewRef}
							style={{[previewPosition === 'left' ? 'width' : 'height']: `${100 - editorSize}%`}}
							className="h-full w-full"
						>
							<iframe
								srcDoc={combinedCode}
								title="preview"
								className="w-full h-full border-0"
							/>
						</div>
						<div
							ref={resizeRef}
							className={getSeparatorStyle(previewPosition)}
							onMouseDown={(e) => handleResizeStart(e, setIsResizing)}
						>
							<div
								className={previewPosition === 'left' ? "h-8 w-1 bg-gray-400 rounded-full" : "w-8 h-1 bg-gray-400 rounded-full"}></div>
						</div>
					</>
				)}
				<div
					ref={editorRef}
					style={{
						[previewPosition === 'left' || previewPosition === 'right' ? 'width' : 'height']: `${editorSize}%`
					}}
					className="flex-grow overflow-auto min-w-0 min-h-0"
				>
					<Tabs defaultValue="html" className="flex-grow flex flex-col">
						<div className="flex justify-between items-center px-4 py-2 border-b">
							<TabsList className="grid w-[200px] h-[50px] grid-cols-2 p-2">
								<TabsTrigger
									value="html"
									className="px-4 py-2 text-sm font-medium"
									onClick={() => setEditorSelected('html')}
								>
									HTML
								</TabsTrigger>
								<TabsTrigger
									value="css"
									className="px-4 py-2 text-sm font-medium"
									onClick={() => setEditorSelected('css')}
								>
									CSS
								</TabsTrigger>
							</TabsList>
							<div className={"flex items-center space-x-2"}>
								<Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
									<SaveIcon className="h-4 w-4 mr-2"/>
									Save
								</Button>
								<Button
									onClick={() => {
										if (!startWebsocket) {
											const cleanedCssCode = cssCode.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove comments
											const base64CssCode = btoa(cleanedCssCode); // Encode to Base64

											const cleanedHtmlCode = removeComments(htmlCode); // Remove comments
											const base64HtmlCode = btoa(cleanedHtmlCode); // Encode to Base64

											// Get the configuration from the editor
											const scaling = config.scaling;
											const scalingValue = config.scalingValue;
											const fadeOut = config.fadeOut;
											const messageRemoveTimer = config.messageRemoveTimer;
											const maxWidth = config.maxWidth;
											const maxHeight = config.maxHeight;
											const currentWidth = config.currentWidth;
											const currentHeight = config.currentHeight;
											const maxMessages = config.maxMessages;

											// If any of the boolean values are false, ignore them
											let configString = "";
											if (scaling) configString += `scaling=${scalingValue}&`;
											if (fadeOut) configString += `fadeOut=${fadeOut}&`;
											console.log(fadeOut)

											// Add the max width and height
											configString += `maxWidth=${maxWidth}&maxHeight=${maxHeight}&`;
											// Add the current width and height
											configString += `currentWidth=${currentWidth}&currentHeight=${currentHeight}`;
											// Add the max messages
											configString += `&maxMessages=${maxMessages}&removalTimer=${messageRemoveTimer}`;

											const url = `webchat?htmlTemplate=${encodeURIComponent(base64HtmlCode)}&css=${base64CssCode}&${configString}`;

											const port = process.env.NODE_ENV === "production" ? "9889" : "3000";
											const fullUrl = `http://localhost:${port}/${url}`;
											setDialogMessage(fullUrl);
											setShowConfirmDialog(true);

										}

										if (webChatWindowShown) {
											TauriApi.CloseWebChatWindow();
											setWebChatWindowShown(false);
										}

										setStartWebsocket(!startWebsocket);
									}}
									size={"sm"}
									className={`${startWebsocket ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"} text-white`}>
									{
										startWebsocket ? (
											<>
												<Pause className={"h-4 w-4 mr-2"}/>
												Stop
											</>
										) : (
											<>
												<Play className={"h-4 w-4 mr-2"}/>
												Start
											</>
										)
									}
								</Button>
								<ConfigDropdown onConfigChange={handleConfigChange} config={config}/>
							</div>
						</div>
						<TabsContent value="html"
						             className={`flex-grow flex overflow-hidden p-0 h-screen ${editorSelected !== "html" ? "hidden" : ""}`}>
							<CodeMirror
								value={htmlCode}
								extensions={[html()]}
								onChange={(value) => setHtmlCode(value)}
								theme={dracula}
								className={`flex-grow h-full w-fit max-w-full`}
								height="100%"
							/>
						</TabsContent>
						<TabsContent value="css"
						             className={`flex-grow flex overflow-hidden p-0 h-screen ${editorSelected !== "css" ? "hidden" : ""}`}>
							<CodeMirror
								value={cssCode}
								extensions={[css()]}
								onChange={(value) => setCssCode(value)}
								theme={dracula}
								className="flex-grow h-full"
								height="100%"
							/>
						</TabsContent>
					</Tabs>
				</div>
				{(previewPosition === 'right' || previewPosition === 'bottom') && showPreview && (
					<>
						<div
							ref={resizeRef}
							className={getSeparatorStyle(previewPosition)}
							onMouseDown={(e) => handleResizeStart(e, setIsResizing)}
						>
							<div
								className={previewPosition === 'right' ? "h-8 w-1 bg-gray-400 rounded-full" : "w-8 h-1 bg-gray-400 rounded-full"}></div>
						</div>
						<div
							ref={previewRef}
							style={{[previewPosition === 'right' ? 'width' : 'height']: `${100 - editorSize}%`}}
							className="h-full w-full flex flex-col"
						>
							{renderPreviewHeader()}
							<iframe
								srcDoc={combinedCode}
								title="preview"
								className="w-full h-full"
							/>
						</div>
					</>
				)}
			</div>
		</main>
	);
}
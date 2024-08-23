import React, {useEffect, useState} from "react";
import {getLayoutIcon, getSeparatorStyle} from "@/components/component/Main/Helpers/MainFrame";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Button} from "@/components/ui/button";
import {AlertCircle, LayoutIcon, SaveIcon} from "lucide-react";
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

const messagesData: Omit<Message['message'], 'timestamp'>[] = [
	{
		platform: "twitch",
		user: "user1",
		formated_message: "Hello, this is a test message.",
		raw_message: "Hello, this is a test message.",
		color: "#FF0000",
		badges: ["badge1"],
		emotes: ["emote1"]
	},
	{
		platform: "youtube",
		user: "user2",
		formated_message: "Hi, this is another test message.",
		raw_message: "Hi, this is another test message.",
		color: "#00FF00",
		badges: ["badge2"],
		emotes: ["emote2"]
	}
];


type EditorProps = {
	setPreviewPosition: React.Dispatch<React.SetStateAction<PreviewPosition>>,
	previewPosition: PreviewPosition,
	editorSize: number,
	setEditorSize: React.Dispatch<React.SetStateAction<number>>,
	showPreview: boolean,
	user: UserInformation | null,
}

export default function Editor(
	{
		setPreviewPosition,
		previewPosition,
		editorSize,
		setEditorSize,
		showPreview,
		user
	}: EditorProps
) {
	const [htmlCode, setHtmlCode] = useState<string>(
		`<!-- You can use the most common bindings on this editor -->
<!-- As an example: "CRTL + /" creates this comment line -->
<!-- You can use common CSS inline styling OR Tailwindcss, it's up to you. -->
<!-- Slashes as comments will get rendered since this is an HTML editor -->
<div class="flex flex-col items-start justify-center bg-gray-100 m-2 bg-transparent text-white">
    {platform} - {badges} {user}: {formatedMessage}
</div>

<!-- Imagination is your limit, do whatever you want. -->
<!-- After you're done and like what you're seeing, click "Save" to save the theme -->
<!-- if you don't, you'll lose everything. (PS: AutoSaving is planned) -->`
	);

	const [cssCode, setCssCode] = useState<string>('/* Add your custom CSS here */');
	const [isResizing, setIsResizing] = useState<boolean>(false);
	const [editorSelected, setEditorSelected] = useState<string>('html');
	const [quickResizeValue, setQuickResizeValue] = useState<string>("15");
	const [pendingResize, setPendingResize] = useState<boolean>(false);
	const [combinedCode, setCombinedCode] = useState<string>("");
	const [messages, setMessages] = useState<Message[]>([]);

	const {resizeRef, editorRef, previewRef, containerRef} = useResizeRefs();


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
								onBlur={(event) => {
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

		const handleGlobalMouseUp = (e: MouseEvent) => {
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


	const replacePlaceholders = (template: string, message: Message["message"]) => {
		return template
			.replaceAll("{user}", message.user)
			.replaceAll("{formatedMessage}", message.formated_message)
			.replaceAll("{raw_message}", message.raw_message)
			.replaceAll("{color}", message.color || "")
			.replaceAll("{platform}", message.platform)
			.replaceAll("{badges}", message.badges?.join(" ") || "");
	};

	useEffect(() => {
		const formattedMessages = messages.map(msg => replacePlaceholders(htmlCode, msg.message)).join('');
		setCombinedCode(`
      <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            ${cssCode}
            .message { display: flex; flex-direction: row; margin: 0; padding: 0; }
            .chat-container { display: flex; flex-direction: column; gap: 0; }
          </style>
        </head>
        <body class="chat-container w-full">
          ${formattedMessages}
        </body>
      </html>
    `);
	}, [htmlCode, cssCode, messages]);

	useEffect(() => {
		let messageIndex = 0;

		const interval = setInterval(() => {
			const newMessage = {
				...messagesData[messageIndex],
				message: {...messagesData[messageIndex], timestamp: Date.now()}
			};
			setMessages((prevMessages) => [...prevMessages, newMessage]);
			messageIndex = (messageIndex + 1) % messagesData.length;
		}, 5000);

		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		const cleanupInterval = setInterval(() => {
			const now = Date.now();

			// Check if message is older than 10 seconds
			setMessages((prevMessages) => prevMessages.filter((msg) => now - msg.message.timestamp < 10000));
		}, 1000);

		return () => clearInterval(cleanupInterval);
	}, []);

	return (
		<main className="flex-grow flex overflow-hidden">
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
							<Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
								<SaveIcon className="h-4 w-4 mr-2"/>
								Save
							</Button>
						</div>
						<TabsContent value="html"
						             className={`flex-grow flex overflow-hidden p-0 h-screen ${editorSelected !== "html" ? "hidden" : ""}`}>
							<CodeMirror
								value={htmlCode}
								extensions={[html()]}
								onChange={(value) => setHtmlCode(value)}
								theme={dracula}
								className={`flex-grow h-full `}
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
								className="w-full h-full border-0 chat-container"
							/>
						</div>
					</>
				)}
			</div>
		</main>
	);
}
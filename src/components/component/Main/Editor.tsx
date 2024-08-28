import React, {useEffect, useState} from "react";
import {getSeparatorStyle} from "@/components/component/Main/Helpers/MainFrame";
import {
	handleResize,
	handleResizeEnd,
	handleResizeStart,
	useResizeRefs
} from "@/components/component/Main/Helpers/resizeUtils";
import TauriApi from "@/lib/Tauri";
import {replacePlaceholders} from "@/components/component/Main/Helpers/webChatUtils";
import PreviewHeader from "@/components/component/Editor/PreviewHeader";
import EditorHeader from "@/components/component/Editor/EditorHeader";
import randomMessageObject from "@/lib/mocks/editor_messages";

type EditorProps = {
	setPreviewPosition: React.Dispatch<React.SetStateAction<PreviewPosition>>,
	previewPosition: PreviewPosition,
	editorSize: number,
	setEditorSize: React.Dispatch<React.SetStateAction<number>>,
	showPreview: boolean,
	user: UserInformation | null,
	showSaveDialog: boolean,
	setShowSaveDialog: React.Dispatch<React.SetStateAction<boolean>>
}


export default function Editor(
	{
		setPreviewPosition,
		previewPosition,
		editorSize,
		setEditorSize,
		showPreview,
		showSaveDialog,
		setShowSaveDialog,
	}: EditorProps
) {

	const [isResizing, setIsResizing] = useState<boolean>(false);
	const [quickResizeValue, setQuickResizeValue] = useState<string>("15");
	const [pendingResize, setPendingResize] = useState<boolean>(false);

	const [htmlCode, setHtmlCode] = useState<string>("");
	const [cssCode, setCssCode] = useState<string>('/* Add your custom CSS here */');
	const [combinedCode, setCombinedCode] = useState<string>("");
	const [messages, setMessages] = useState<PlatformMessage<"twitch" | "youtube">[]>([]);

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


	const {resizeRef, editorRef, previewRef, containerRef} = useResizeRefs();
	const [startWebsocket, setStartWebsocket] = useState<boolean>(false);


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
			setHtmlCode(theme.html_code);
			setCssCode(theme.css_code);
		});

		if (!startWebsocket) {
			const messageInterval = setInterval(() => {
				const newMessage = randomMessageObject();
				setMessages((prevMessages) => [...prevMessages, newMessage]);
			}, 5000);

			const cleanupInterval = setInterval(() => {
				const now = Date.now();

				// Check if a message is older than 10 seconds
				setMessages((prevMessages) => prevMessages.filter((msg) => now - msg.message.timestamp < 10000));
			}, 1000);


			return () => {
				clearInterval(messageInterval);
				clearInterval(cleanupInterval);
			}
		}

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
					<EditorHeader
						config={config}
						setConfig={setConfig}
						setHtmlCode={setHtmlCode}
						setCssCode={setCssCode}
						cssCode={cssCode}
						htmlCode={htmlCode}
						showSaveDialog={showSaveDialog}
						setShowSaveDialog={setShowSaveDialog}
						startWebsocket={startWebsocket}
						setStartWebsocket={setStartWebsocket}
					/>
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
							<PreviewHeader
								quickResizeValue={quickResizeValue}
								setQuickResizeValue={setQuickResizeValue}
								setEditorSize={setEditorSize}
								setPendingResize={setPendingResize}
								pendingResize={pendingResize}
								previewPosition={previewPosition}
								setPreviewPosition={setPreviewPosition}
							/>
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
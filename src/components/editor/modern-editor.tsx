'use client';

import React, {useEffect, useState} from 'react';
import CodeMirror from '@uiw/react-codemirror';
import {html} from '@codemirror/lang-html';
import {css} from '@codemirror/lang-css';
import {dracula} from '@uiw/codemirror-theme-dracula';

import {ResizableHandle, ResizablePanel, ResizablePanelGroup,} from "@/components/ui/resizable";

import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";

import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Separator} from '@/components/ui/separator';

import {
	Code2,
	EyeIcon,
	FileJson,
	LayoutPanelLeft,
	LayoutPanelTop,
	Loader2,
	MonitorPlay,
	PaintBucket,
	Play,
	RefreshCw,
	Save,
	Settings2,
} from 'lucide-react';
import {replacePlaceholders} from "@/lib/utils/editor/replacePlaceholders";
import randomMessageObject from "@/lib/utils/editor/mock_messages";

interface EditorProps {
	htmlCode: string;
	cssCode: string;
	setHtmlCode: (code: string) => void;
	setCssCode: (code: string) => void;
	previewPosition: 'right' | 'bottom';
	setPreviewPosition: (position: 'right' | 'bottom') => void;
	theme: string;
	onThemeChange: (theme: string) => void;
	onSave: () => void;
	onStart: () => void;
	isStarted: boolean;
	availableThemes: string[];
	showPreview: boolean;
	setShowPreview: (showPreview: boolean) => void;
}

export function ModernEditor(
	{
		htmlCode,
		cssCode,
		setHtmlCode,
		setCssCode,
		previewPosition,
		setPreviewPosition,
		theme,
		onThemeChange,
		onSave,
		onStart,
		isStarted,
		availableThemes,
		showPreview,
		setShowPreview
	}: EditorProps) {
	const [previewScale, setPreviewScale] = useState(100);
	const [combinedCode, setCombinedCode] = useState<string>("");
	const [mockMessages, setMockMessages] = useState<Chat.PlatformMessage<"twitch" | "youtube">[]>([]);
	
	const [config, setConfig] = useState<Editor.ConfigState>({
		scaling: false,
		scalingValue: 1,
		fadeOut: false,
		messageRemoveTimer: 5,
		maxMessages: 10,
		maxWidth: 800,
		maxHeight: 600,
		currentWidth: 800,
		currentHeight: 600,
		messageTransition: "none"
	});
	
	useEffect(() => {
		const messages = mockMessages.map(msg => replacePlaceholders(htmlCode, msg.message, msg.platform)).join('');
		
		const getStyle = async () => {
			return await (await fetch("/styles/webchat_transitions.css")).text()
		}
		
		getStyle().then((style) => {
			setCombinedCode(`
      <html lang="en">
        <head>
          <script src="/styles/tailwind_complete.css" data-tailwind="disable-warning"></script>
          <style>
            ${cssCode};
            ${style}
            .message { display: flex; flex-direction: row; margin: 0; padding: 0; }
            .chat-container { display: flex; flex-direction: column; gap: 0; }
          </style>
          <title>UnitedChat - Iframe</title>
        </head>
        <body class="chat-container w-full">
          ${messages}
        </body>
      </html>
    `);
		})
	}, [htmlCode, cssCode, mockMessages]);
	
	useEffect(() => {
		if (!isStarted) {
			const messageInterval = setInterval(() => {
				const newMessage = randomMessageObject();
				setMockMessages((prevMessages) => [...prevMessages, newMessage]);
			}, 5000);
			
			const cleanupInterval = setInterval(() => {
				const now = Date.now();
				
				// Check if a message is older than 10 seconds
				setMockMessages((prevMessages) => prevMessages.filter((msg) => now - Number(msg.message.timestamp) < 10000));
			}, 1000);
			
			
			return () => {
				clearInterval(messageInterval);
				clearInterval(cleanupInterval);
			}
		}
	}, [isStarted]);
	
	return (
		<div className="h-screen flex flex-col">
			<div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="flex items-center justify-between p-4">
					<Select value={theme} onValueChange={onThemeChange}>
						<SelectTrigger className="w-[180px]">
							<PaintBucket className="h-4 w-4 mr-2"/>
							<SelectValue placeholder="Select theme"/>
						</SelectTrigger>
						<SelectContent>
							{availableThemes.map((themeName) => (
								<SelectItem key={themeName} value={themeName}>
									{themeName}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					
					<div className="flex items-center space-x-4">
						<Button
							variant={showPreview ? "secondary" : "outline"}
							size="sm"
							onClick={() => setShowPreview(!showPreview)}
						>
							<EyeIcon className="h-4 w-4 mr-2"/>
							Preview
						</Button>
						
						<Button
							variant={previewPosition === 'right' ? "secondary" : "outline"}
							size="sm"
							onClick={() => setPreviewPosition(previewPosition === 'right' ? 'bottom' : 'right')}
						>
							{previewPosition === 'right' ? (
								<LayoutPanelLeft className="h-4 w-4"/>
							) : (
								<LayoutPanelTop className="h-4 w-4"/>
							)}
						</Button>
						
						<Separator orientation="vertical" className="h-6"/>
						
						<Button variant="secondary" size="sm" onClick={onSave}>
							<Save className="h-4 w-4 mr-2"/>
							Save
						</Button>
						
						<Button
							variant={isStarted ? "secondary" : "default"}
							size="sm"
							onClick={onStart}
						>
							{isStarted ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin"/>
									Running
								</>
							) : (
								<>
									<Play className="h-4 w-4 mr-2"/>
									Start
								</>
							)}
						</Button>
						
						<Button variant="outline" size="icon">
							<Settings2 className="h-4 w-4"/>
						</Button>
					</div>
				</div>
			</div>
			
			<ResizablePanelGroup
				direction={previewPosition === 'right' ? 'horizontal' : 'vertical'}
				className="flex-1"
			>
				<ResizablePanel defaultSize={60} minSize={30}>
					<Tabs defaultValue="html" className="h-full flex flex-col">
						<div className="border-b px-4 py-2">
							<TabsList>
								<TabsTrigger value="html" className="flex items-center gap-2">
									<FileJson className="h-4 w-4"/>
									HTML
								</TabsTrigger>
								<TabsTrigger value="css" className="flex items-center gap-2">
									<Code2 className="h-4 w-4"/>
									CSS
								</TabsTrigger>
							</TabsList>
						</div>
						
						<TabsContent value="html" className="flex-1 p-0 overflow-auto mb-[3rem]">
							<CodeMirror
								value={htmlCode}
								height="100%"
								theme={dracula}
								extensions={[html()]}
								onChange={setHtmlCode}
								className="h-full"
							/>
						</TabsContent>
						<TabsContent value="css" className="flex-1 p-0">
							<CodeMirror
								value={cssCode}
								height="100%"
								theme={dracula}
								extensions={[css()]}
								onChange={setCssCode}
								className="h-full"
							/>
						</TabsContent>
					</Tabs>
				</ResizablePanel>
				
				{showPreview && (
					<>
						<ResizableHandle/>
						<ResizablePanel defaultSize={40} minSize={30}>
							<div className="h-full flex flex-col">
								<div
									className="border-b p-2 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
									<div className="flex items-center space-x-2">
										<MonitorPlay className="h-4 w-4 text-muted-foreground"/>
										<span className="text-sm font-medium">Preview</span>
									</div>
									<div className="flex items-center space-x-2">
										<Label htmlFor="scale" className="text-sm">
											Scale:
										</Label>
										<Input
											id="scale"
											type="number"
											value={previewScale}
											onChange={(e) => setPreviewScale(Number(e.target.value))}
											className="w-20 h-8"
											min={50}
											max={150}
										/>
										<Button variant="ghost" size="icon" className="h-8 w-8">
											<RefreshCw className="h-4 w-4"/>
										</Button>
									</div>
								</div>
								<div className="flex-1 overflow-auto">
									<iframe
										srcDoc={combinedCode}
										className="w-full h-full border-0"
										style={{
											transform: `scale(${previewScale / 100})`,
											transformOrigin: 'top left',
										}}
									/>
								</div>
							</div>
						</ResizablePanel>
					</>
				)}
			</ResizablePanelGroup>
		</div>
	);
}
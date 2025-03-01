'use client';

import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { dracula } from '@uiw/codemirror-theme-dracula';
import CodeMirror from '@uiw/react-codemirror';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup, } from "@/components/ui/resizable";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

import randomMessageObject from "@/lib/utils/editor/mock_messages";
import { replacePlaceholders } from "@/lib/utils/editor/replacePlaceholders";
import {
	Code2,
	EyeIcon,
	EyeOffIcon,
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
}

export default function Editor(
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
	}: EditorProps) {
	const [previewScale, setPreviewScale] = useState(100);
	const [combinedCode, setCombinedCode] = useState<string>("");
	const [mockMessages, setMockMessages] = useState<Chat.PlatformMessage<"twitch" | "youtube">[]>([]);
	const [showPreview, setShowPreview] = useState(true);
	const [editorSize, setEditorSize] = useState(85);

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


	const handlePreviewScaleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setPreviewScale(Number(e.target.value));
	}, []);

	const handlePreviewToggle = useCallback(() => {
		setShowPreview(!showPreview);
	}, [showPreview]);

	const handlePositionToggle = useCallback(() => {
		setPreviewPosition(previewPosition === 'right' ? 'bottom' : 'right');
	}, [previewPosition, setPreviewPosition]);

	// Memoize the CodeMirror instances
	const htmlEditor = useMemo(() => (
		<CodeMirror
			value={htmlCode}
			height="100%"
			theme={dracula}
			extensions={[html()]}
			onChange={setHtmlCode}
			className="h-full"
		/>
	), [htmlCode, setHtmlCode]);

	const cssEditor = useMemo(() => (
		<CodeMirror
			value={cssCode}
			height="100%"
			theme={dracula}
			extensions={[css()]}
			onChange={setCssCode}
			className="h-full"
		/>
	), [cssCode, setCssCode]);

	// Memoize the theme selector
	const themeSelector = useMemo(() => (
		<Select value={theme} onValueChange={onThemeChange}>
			<SelectTrigger className="w-[180px]">
				<PaintBucket className="h-4 w-4 mr-2" />
				<SelectValue placeholder="Select theme" />
			</SelectTrigger>
			<SelectContent>
				{availableThemes.map((themeName) => (
					<SelectItem key={themeName} value={themeName}>
						{themeName.slice(0, 1).toUpperCase() + themeName.slice(1)}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	), [theme, onThemeChange, availableThemes]);

	// Memoize the preview iframe
	const previewIframe = useMemo(() => (
		<iframe
			srcDoc={combinedCode}
			className="w-full h-full border-0"
			style={{
				transform: `scale(${previewScale / 100})`,
				transformOrigin: 'top left',
			}}
		/>
	), [combinedCode, previewScale]);

	useEffect(() => {
		const messages = mockMessages.map(msg => replacePlaceholders(htmlCode, msg.message, msg.platform)).join('');

		const getStyle = async () => {
			return await (await fetch("/styles/webchat_transitions.css")).text()
		}

		getStyle().then((style) => {
			setCombinedCode(
				`
			<html lang="en">
				<head>
					<script src="/styles/tailwind.js" data-tailwind="disable-warning"></script>
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
    	`
			);
		})
	}, [htmlCode, cssCode, mockMessages]);

	const header = useMemo(() => (
		<div className="border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
			<div className="flex items-center justify-between p-4">
				{themeSelector}

				<div className="flex items-center space-x-4">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									className="cursor-pointer"
									variant={showPreview ? "secondary" : "outline"}
									size="sm"
									onClick={handlePreviewToggle}
								>
									{
										showPreview ? (
											<EyeIcon className="h-4 w-4 mr-2" />
										) : (
											<EyeOffIcon className="h-4 w-4 mr-2" />
										)
									}
									Preview
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="">
								Toggle preview
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									className="cursor-pointer"
									variant={previewPosition === 'right' ? "secondary" : "outline"}
									size="sm"
									onClick={handlePositionToggle}
								>
									{previewPosition === 'right' ? (
										<LayoutPanelLeft className="h-4 w-4" />
									) : (
										<LayoutPanelTop className="h-4 w-4" />
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="">
								Change preview position to {previewPosition === 'right' ? 'bottom' : 'right'}
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<Separator orientation="vertical" className="h-6" />

					<Button variant="secondary" className="cursor-pointer" size="sm" onClick={onSave}>
						<Save className="h-4 w-4 mr-2" />
						Save
					</Button>

					<Button
						variant={isStarted ? "secondary" : "default"}
						className="cursor-pointer"
						size="sm"
						onClick={onStart}
					>
						{isStarted ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Running
							</>
						) : (
							<>
								<Play className="h-4 w-4 mr-2" />
								Start
							</>
						)}
					</Button>

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline" size="icon">
											<Settings2 className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent className="w-96">
										<DropdownMenuLabel>Chat Settings</DropdownMenuLabel>
										<DropdownMenuSeparator />

										<DropdownMenuGroup>
											<DropdownMenuLabel className="text-sm">Message Settings</DropdownMenuLabel>
											<DropdownMenuItem className="grid grid-cols-2 items-center gap-4 focus:bg-transparent" onClick={(e) => e.preventDefault()}>
												<Label htmlFor="maxMessages">Max Messages</Label>
												<Input
													id="maxMessages"
													type="number"
													value={config.maxMessages}
													onChange={(e) => setConfig({ ...config, maxMessages: Number(e.target.value) })}
													min={1}
													max={100}
													className="h-8"
												/>
											</DropdownMenuItem>
											<DropdownMenuItem className="grid grid-cols-2 items-center gap-4 focus:bg-transparent" onClick={(e) => e.preventDefault()}>
												<Label htmlFor="messageTimer">Remove Timer (s)</Label>
												<Input
													id="messageTimer"
													type="number"
													value={config.messageRemoveTimer}
													onChange={(e) => setConfig({ ...config, messageRemoveTimer: Number(e.target.value) })}
													min={1}
													max={60}
													className="h-8"
												/>
											</DropdownMenuItem>
											<DropdownMenuItem className="grid grid-cols-2 items-center gap-4 focus:bg-transparent" onClick={(e) => e.preventDefault()}>
												<Label htmlFor="transition">Message Transition</Label>
												<Select
													value={config.messageTransition}
													onValueChange={(value) => {
														setConfig({ ...config, messageTransition: value as Editor.AvailableMessageTransitions })
													}}
												>
													<SelectTrigger id="transition" className="h-8">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="none">None</SelectItem>
														<SelectItem value="slide-from-right">Slide from right</SelectItem>
														<SelectItem value="slide-from-bottom">Slide from bottom</SelectItem>
														<SelectItem value="typewriter">Typewriter</SelectItem>
													</SelectContent>
												</Select>
											</DropdownMenuItem>
										</DropdownMenuGroup>

										<DropdownMenuSeparator />

										<DropdownMenuGroup>
											<div className="flex items-center justify-between px-2 py-1.5">
												<DropdownMenuLabel className="text-sm p-0">Scaling</DropdownMenuLabel>
												<Button
													variant="ghost"
													size="sm"
													className="h-8 px-2"
													onClick={() => setConfig({ ...config, scaling: !config.scaling })}
												>
													{config.scaling ? "Disable" : "Enable"}
												</Button>
											</div>
											{config.scaling && (
												<DropdownMenuItem className="grid grid-cols-2 items-center gap-4 focus:bg-transparent" onClick={(e) => e.preventDefault()}>
													<Label htmlFor="scalingValue">Scale Factor</Label>
													<Input
														id="scalingValue"
														type="number"
														value={config.scalingValue}
														onChange={(e) => setConfig({ ...config, scalingValue: Number(e.target.value) })}
														min={0.1}
														max={2}
														step={0.1}
														className="h-8"
													/>
												</DropdownMenuItem>
											)}
										</DropdownMenuGroup>

										<DropdownMenuSeparator />

										<DropdownMenuGroup>
											<DropdownMenuLabel className="text-sm">Size Constraints</DropdownMenuLabel>
											<DropdownMenuItem className="grid grid-cols-2 items-center gap-4 focus:bg-transparent" onClick={(e) => e.preventDefault()}>
												<Label htmlFor="maxWidth">Max Width (px)</Label>
												<Input
													id="maxWidth"
													type="number"
													value={config.maxWidth}
													onChange={(e) => setConfig({ ...config, maxWidth: Number(e.target.value) })}
													min={200}
													max={2000}
													className="h-8"
												/>
											</DropdownMenuItem>
											<DropdownMenuItem className="grid grid-cols-2 items-center gap-4 focus:bg-transparent" onClick={(e) => e.preventDefault()}>
												<Label htmlFor="maxHeight">Max Height (px)</Label>
												<Input
													id="maxHeight"
													type="number"
													value={config.maxHeight}
													onChange={(e) => setConfig({ ...config, maxHeight: Number(e.target.value) })}
													min={200}
													max={2000}
													className="h-8"
												/>
											</DropdownMenuItem>
										</DropdownMenuGroup>

										<DropdownMenuSeparator />

										<DropdownMenuGroup>
											<DropdownMenuLabel className="text-sm">Additional Settings</DropdownMenuLabel>
											<DropdownMenuItem className="flex items-center justify-between focus:bg-transparent" onClick={(e) => e.preventDefault()}>
												<Label htmlFor="fadeOut">Message Fade Out</Label>
												<Button
													variant="ghost"
													size="sm"
													className="h-8 px-2"
													onClick={() => setConfig({ ...config, fadeOut: !config.fadeOut })}
												>
													{config.fadeOut ? "Disable" : "Enable"}
												</Button>
											</DropdownMenuItem>
										</DropdownMenuGroup>
									</DropdownMenuContent>
								</DropdownMenu>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="">
								Settings
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>
		</div>
	), [themeSelector, showPreview, previewPosition, isStarted, handlePositionToggle, handlePreviewToggle, config, setConfig, onSave, onStart]);

	useEffect(() => {
		if (!isStarted) {
			const messageInterval = setInterval(() => {
				const newMessage = randomMessageObject();
				setMockMessages((prevMessages) => [...prevMessages, newMessage]);
			}, 5000);

			const cleanupInterval = setInterval(() => {
				const now = Date.now();
				setMockMessages((prevMessages) =>
					prevMessages.filter((msg) => now - Number(msg.message.timestamp) < 10000)
				);
			}, 1000);

			return () => {
				clearInterval(messageInterval);
				clearInterval(cleanupInterval);
			}
		}
	}, [isStarted]);

	return (
		<div className="h-screen flex flex-col">
			{header}

			<ResizablePanelGroup
				direction={previewPosition === 'right' ? 'horizontal' : 'vertical'}
				className="flex-1"
			>
				<ResizablePanel defaultSize={60} minSize={30}>
					<Tabs defaultValue="html" className="h-full flex flex-col">
						<div className="border-b px-4 py-2">
							<TabsList>
								<TabsTrigger value="html" className="flex items-center gap-2">
									<FileJson className="h-4 w-4" />
									HTML
								</TabsTrigger>
								<TabsTrigger value="css" className="flex items-center gap-2">
									<Code2 className="h-4 w-4" />
									CSS
								</TabsTrigger>
							</TabsList>
						</div>

						<TabsContent value="html" className="flex-1 p-0 overflow-auto mb-[3rem]">
							{htmlEditor}
						</TabsContent>
						<TabsContent value="css" className="flex-1 p-0">
							{cssEditor}
						</TabsContent>
					</Tabs>
				</ResizablePanel>

				{showPreview && (
					<>
						<ResizableHandle />
						<ResizablePanel defaultSize={40} minSize={30}>
							<div className="h-full flex flex-col">
								<div className="border-b p-2 flex items-center justify-between bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
									<div className="flex items-center space-x-2">
										<MonitorPlay className="h-4 w-4 text-muted-foreground" />
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
											onChange={handlePreviewScaleChange}
											className="w-20 h-8"
											min={50}
											max={150}
										/>
										<Button variant="ghost" size="icon" className="h-8 w-8">
											<RefreshCw className="h-4 w-4" />
										</Button>
									</div>
								</div>
								<div className="flex-1 overflow-auto">
									{previewIframe}
								</div>
							</div>
						</ResizablePanel>
					</>
				)}
			</ResizablePanelGroup>
		</div>
	);
}
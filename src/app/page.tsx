// src/app/page.tsx
'use client';

import Panel from '@/components/editor/Panel';
import Header from '../components/main/Header';
import EditorHeader from '../components/editor/Header';
import { useUser } from '../providers/user';
import { useEffect, useRef } from 'react';
import { BaseTauriClient } from '@/lib/tauri/base';
import { focusStateConfig, useCleanupManager } from '@/lib/stores/config';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { getAllWindows, getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function MainPage() {
	const { user } = useUser();
	const focusCallbackRef = useRef<(event: { event: string, payload: "Unknown" | "Focused" | "Unfocused" }) => void | null>(null);
	const { focusState, setConfigValue } = focusStateConfig();
	const { cleanupWindows, resetWindowState, finishCleanup, isCleanupStarted } = useCleanupManager();

	useEffect(() => {
		// Start the focus event emitter
		BaseTauriClient.StartWFE();

		// Create a stable callback function
		focusCallbackRef.current = (event: { event: string, payload: "Unknown" | "Focused" | "Unfocused" }) => {
			switch (event.payload) {
				case "Focused":
					setConfigValue(["window", "focusState"], "focused");
					break;
				case "Unfocused":
					setConfigValue(["window", "focusState"], "unfocused");
					break;
				default:
					break;
			}
		};

		// Subscribe to the event with our stable callback
		BaseTauriClient.EventSubscribe("focus-event", focusCallbackRef.current);

		// Cleanup function to unsubscribe when component unmounts
		return () => {
			if (focusCallbackRef.current) {
				BaseTauriClient.UnsubscribeEvent("focus-event", focusCallbackRef.current);
			}
		};
	}, []);

	useEffect(() => {
		const initializeWindows = async () => {
			const windows = await getAllWindows();

			// If only the main window is open, reset window states
			if (windows.length === 1) {
				await resetWindowState();
				finishCleanup(); // Finish cleanup after initialization
			} else {
				// Close any extra windows
				for (const window of windows) {
					if (window.label !== "main") {
						await window.destroy();
					}
				}
				await resetWindowState();
				finishCleanup(); // Finish cleanup after initialization
			}
		};

		initializeWindows();
	}, [resetWindowState, finishCleanup]);

	useEffect(() => {
		const window = getCurrentWindow();

		window?.onCloseRequested(async (e) => {
			if (isCleanupStarted) {
				e.preventDefault();
				return;
			}

			e.preventDefault();
			await cleanupWindows();

			// Set the main window to a square before closing
			window.setSize(new LogicalSize(600, 600));
			await window?.destroy();
		});
	}, [isCleanupStarted, cleanupWindows]);

	return (
		<>
			{
				isCleanupStarted ? (
					// Show a loading screen
					<div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
						<Card className="w-full max-w-md shadow-lg">
							<CardHeader className="text-center">
								<CardTitle className="text-2xl font-bold">App Cleanup in Progress</CardTitle>
								<CardDescription>The application is undergoing cleanup to prepare for a shutdown</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="flex justify-center">
									<div className="relative h-24 w-24">
										<Loader2 className="h-24 w-24 animate-spin text-slate-400" />
										<div className="absolute inset-0 flex items-center justify-center">
											<span className="text-sm font-medium text-slate-600">Cleaning</span>
										</div>
									</div>
								</div>

								<div className="space-y-3 text-center">
									<p className="text-sm text-slate-600">
										We're currently cleaning up some things and will be shutting down shortly. This process ensures all data
										is properly saved and resources are released.
									</p>
									<p className="text-sm font-medium text-slate-700">
										The application will be temporarily unavailable. Thank you for your patience.
									</p>
								</div>

								<div className="rounded-lg bg-slate-100 p-3">
									<p className="text-xs text-slate-500">
										This is a normal procedure. The application will shutdown once the process is complete.
										No action is required on your part.
									</p>

								</div>
								<div className="rounded-lg bg-red-100 p-3">
									<p className="text-xs text-red-500">
										You can force the app to shutdown only with the task manager. This is not recommended since it can cause unexpected behavior.
									</p>
								</div>
							</CardContent>
						</Card>
					</div>
				) : (
					<div className="h-screen flex flex-col">
						<Header
							user={user}
						/>
						{
							focusState === "focused" ? (
								<div className="flex-1 overflow-hidden">
									<EditorHeader />
									<Panel />
								</div>
							) : (
								<div className="flex-1 overflow-hidden">
									<div className="flex flex-col items-center justify-center h-full p-4">
										<h1 className="text-2xl font-bold mb-4">Chat is not focused</h1>
										<Accordion type="multiple" defaultValue={["info", "how-to", "disable"]} className="w-full max-w-2xl">
											<AccordionItem value="info">
												<AccordionTrigger>Why is this here?</AccordionTrigger>
												<AccordionContent>
													<p className="text-sm text-gray-500">
														This is a placeholder for the chat when it is not focused. It is used to prevent resources from being used when the editor is not in focus.
													</p>
												</AccordionContent>
											</AccordionItem>
											<AccordionItem value="how-to">
												<AccordionTrigger>How do I focus the chat?</AccordionTrigger>
												<AccordionContent>
													<p className="text-sm text-gray-500">
														You can focus the chat by clicking on the chat window by clicking on the button below.
														<br />
														You do not need to do this, since the app will automatically return to the Editor when it is focused again.
														<br />
														However, if something happens and it doesn't return to the Editor even if you focus it, you can click on the button below to force it to return to the Editor.
													</p>
												</AccordionContent>
											</AccordionItem>
											<AccordionItem value="disable">
												<AccordionTrigger>Can I disable this?</AccordionTrigger>
												<AccordionContent>
													<p className="text-sm text-gray-500">
														Yes, you can disable this by going to the configuration of the app, at the <span className="font-bold">Events</span> tab and unchecking the <span className="font-bold">Auto Focus</span> event.
														<br />
														Should you do this? Honestly? No.
														<br />
														Why? You might not want to disable this since, if it gets disabled, the Preview and Editor will use resources even when the app is not in focus.
													</p>
												</AccordionContent>
											</AccordionItem>
										</Accordion>
										<Button
											className="mt-4"
											onClick={() => setConfigValue(["window", "focusState"], "focused")}
										>
											Focus Chat Manually
										</Button>
									</div>
								</div>
							)
						}
					</div>
				)
			}
		</>
	);
}
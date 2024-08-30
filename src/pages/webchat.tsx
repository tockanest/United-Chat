import {useCallback, useEffect, useRef, useState} from "react";
import {useRouter} from "next/router";
import moment from "moment";
import {replacePlaceholders} from "@/components/component/Main/Helpers/webChatUtils";

// I MADE THIS WORK!! I'M SO HAPPY THAT I COULD ACTUALLY KISS SOMEONE
// unfortunately, I'm alone in my room, so I'll just kiss my dog instead

export default function WebChat() {
	const router = useRouter();
	const {
		htmlTemplate,
		fadeOut,
		removalTimer,
		maxMessages,
		currentWidth,
		currentHeight,
		maxWidth,
		maxHeight,
		scaling,
		scalingValue,
		isDebug
	} = router.query;

	const decodedHtmlTemplate = htmlTemplate ? atob(decodeURIComponent(htmlTemplate as string)) : '';
	const removalTimeSeconds = Number(removalTimer)
	const fadeOutEnabled = fadeOut === "true"; // Determine if fade-out is enabled
	const messagesLimit = Number(maxMessages)
	const width = Number(currentWidth)
	const height = Number(currentHeight)
	const divMaxWidth = Number(maxWidth)
	const divMaxHeight = Number(maxHeight)
	const scalingEnabled = scaling === "true"; // Determine if scaling is enabled
	const scalingFactor = Number(scalingValue)

	const debug = isDebug === "true"; // Determine if debug mode is enabled

	const [messages, setMessages] = useState<Message[]>([]);

	const fadeQueueRef = useRef<Set<string>>(new Set()); // Cache for fade-out messages
	const [messagesToRemove, setMessagesToRemove] = useState<Set<string>>(new Set());

	// Function to process the fade-out queue
	const processFadeOutQueue = useCallback(async () => {
		// Remove expired messages immediately if queue length exceeds 15
		if (fadeQueueRef.current.size > messagesLimit) {
			console.log("Queue length exceeded 15, removing expired messages immediately");
			const now = moment();
			fadeQueueRef.current.forEach(id => {
				const message = messages.find(msg => msg.message.id === id);
				if (message && now.diff(moment(message.message.timestamp), 'seconds') >= removalTimeSeconds) {
					setMessages(prevMessages => prevMessages.filter(msg => msg.message.id !== id));
					fadeQueueRef.current.delete(id);
				}
			});
		}

		// @ts-ignore: Process fading out for messages in the queue
		for (const id of fadeQueueRef.current) {
			if (!fadeOutEnabled) continue; // Skip if fade-out is disabled

			const messageElement = document.getElementById(id);

			if (messageElement) {
				messageElement.classList.add('fade-out');

				await new Promise<void>(resolve => {
					const handleTransitionEnd = () => {
						messageElement.removeEventListener('transitionend', handleTransitionEnd);
						resolve();
						// Mark message as fully faded out
						setMessages(prevMessages => prevMessages.map(msg =>
							msg.message.id === id ? {...msg, fullyFadedOut: true} : msg
						));
					};
					messageElement.addEventListener('transitionend', handleTransitionEnd);
				});

				// Remove the message after fade-out transition
				setMessages(prevMessages => prevMessages.filter(msg => msg.message.id !== id));
				fadeQueueRef.current.delete(id);
			}

			// Delay before processing the next item
			await new Promise(resolve => setTimeout(resolve, 2000)); // +2s delay
		}
	}, [messages]);


	useEffect(() => {
		if (messagesToRemove.size > 0) {
			setMessages(prevMessages => prevMessages.filter(msg => !messagesToRemove.has(msg.message.id)));
			// Clear messagesToRemove after updating messages
			setMessagesToRemove(new Set());
		}
	}, [messagesToRemove]);

	useEffect(() => {
		if (debug) {
			console.log("Debug mode enabled, skipping message cleanup");
			return;
		}
		const cleanupInterval = setInterval(() => {
			const now = moment();

			setMessages(prevMessages => prevMessages.filter(msg => {
				if (msg.message.timestamp) {
					if (!fadeOutEnabled) {
						const messageTime = moment(msg.message.timestamp);
						const shouldBeRemoved = now.diff(messageTime, 'seconds') >= removalTimeSeconds;

						return !shouldBeRemoved; // Keep message if it shouldn't be removed yet
					} else if (fadeOutEnabled) {
						const messageTime = moment(msg.message.timestamp);
						const shouldFadeOut = now.diff(messageTime, 'seconds') >= removalTimeSeconds;

						if (shouldFadeOut && !msg.fadingOut) {
							fadeQueueRef.current.add(msg.message.id);
							processFadeOutQueue();
							return {...msg, fadingOut: true};
						}
					}
				}
				return msg;
			}));
		}, 1000);

		return () => {
			clearInterval(cleanupInterval);
		};
	}, [fadeOutEnabled, removalTimeSeconds, processFadeOutQueue]);

	useEffect(() => {
		// Check if total messages exceed 15 and remove the oldest if necessary
		if (messages.length > messagesLimit) {
			console.log("Total messages exceeded 15, removing the oldest message immediately");
			const oldestMessageId = messages[0].message.id; // Assuming messages are ordered by timestamp
			setMessages(prevMessages => prevMessages.slice(1)); // Remove the oldest message
			fadeQueueRef.current.delete(oldestMessageId); // Also remove from fade queue if present
		}
	}, [messages]); // Run this effect whenever the message array changes

	useEffect(() => {
		const ws = new WebSocket('ws://localhost:9888');

		ws.onopen = () => {
			console.log('WebSocket connection established');
		};

		ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
			const newMessage: Message = {
				platform: data.platform,
				message: {
					...data.data
				}
			};
			console.log("New message")
			setMessages(prevMessages => [...prevMessages, newMessage as Message]);
		};

		ws.onclose = () => {
			console.log('WebSocket connection closing');
		};

		return () => {
			ws.close();
		};
	}, [decodedHtmlTemplate]);

	return (
		<div
			className={`
				flex flex-col
				${width ? `w-${width}` : ''}
				${height ? `h-${height}` : ''}
				${maxHeight ? `max-h-${divMaxHeight}` : ''}
				${maxWidth ? `max-w-${divMaxWidth}` : ''}
			`}
			{
				...scalingEnabled && scalingFactor ? {
					style: {
						transform: `scale(${scalingFactor})`
					}
				} : {}
			}
		>
			<style>
				{`
                .fade-out {
                    opacity: 0;
                    transition: opacity 3s ease-out;
                }
            `}
			</style>
			<script src="https://cdn.tailwindcss.com"></script>
			{messages.map((msg, index) => (
				<div
					key={index}
					className={
						`
							message 
							${msg.fullyFadedOut ? 'fade-out' : ''}
							flex items-start
							${width ? `w-${width}` : ''}
							${height ? `h-${height}` : ''}
							${maxHeight ? `max-h-${divMaxHeight}` : ''}
							${maxWidth ? `max-w-${divMaxWidth}` : ''}
						`
					}

					dangerouslySetInnerHTML={{__html: replacePlaceholders(decodedHtmlTemplate, msg.message, msg.platform)}}>

				</div>
			))}
		</div>
	);
}

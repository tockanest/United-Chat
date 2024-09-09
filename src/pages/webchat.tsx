import {useCallback, useEffect, useRef, useState} from "react";
import {useRouter} from "next/router";
import moment from "moment";
import {replacePlaceholders} from "@/components/component/Main/Helpers/webChatUtils";

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

	const [messages, setMessages] = useState<Message[]>([]);

	const fadeQueueRef = useRef<Set<string>>(new Set()); // Cache for fade-out messages
	const [messagesToRemove, setMessagesToRemove] = useState<Set<string>>(new Set());

	// Function to process the fade-out queue
	const processFadeOutQueue = useCallback(async () => {
		// Remove expired messages immediately if queue length exceeds 15
		if (fadeQueueRef.current.size > messagesLimit) {
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

		const cleanupInterval = setInterval(() => {
			const now = moment();

			setMessages(prevMessages => prevMessages.filter(msg => {
				if (msg.message.timestamp) {
					if (!fadeOutEnabled) {
						const messageTime = moment(msg.message.timestamp);
						const shouldBeRemoved = now.diff(messageTime, 'seconds') >= removalTimeSeconds;

						return !shouldBeRemoved; // Keep message if it shouldn't be removed yet
					} else if (fadeOutEnabled) {
						let messageTime: moment.Moment | null = null;
						if (msg.platform === "twitch") {
							messageTime = moment(msg.message.timestamp);
						} else if (msg.platform === "youtube") {
							// Youtube uses uSec timestamp and this might cause the message to not be displayed for long enough
							// Adding 5 seconds to the timestamp to make sure the message is displayed for at least 5 seconds
							messageTime = moment(Number(msg.message.timestamp) / 1000);
						}
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

			setMessages(prevMessages => [...prevMessages, newMessage as Message]);
		};

		ws.onclose = () => {
			console.log('WebSocket connection closing');
		};

		document.body.style.backgroundColor = 'transparent';

		return () => {
			ws.close();
		};
	}, [decodedHtmlTemplate]);

	return (
		<div
			className={`
				bg-transparent
				flex flex-col
				
							${maxHeight ? `max-h-[${divMaxHeight}px]` : ''}
							${maxWidth ? `max-w-[${divMaxWidth}px]` : ''}
			`}
			{
				...scalingEnabled && scalingFactor ? {
					style: {
						transform: `scale(${scalingFactor})`
					}
				} : {}
			}
		>
			<script src="/styles/tailwind_complete.css"></script>
			<style>
				{`
                .fade-out {
                    opacity: 0;
                    transition: opacity 3s ease-out;
                }
            `}
			</style>
			<div className="bg-transparent">
				{messages.map((msg, index) => (
					<div
						key={index}
						className={
							`
							message 
							${msg.fullyFadedOut ? 'fade-out' : ''}
							flex items-start
						`
						}
						dangerouslySetInnerHTML={{__html: replacePlaceholders(decodedHtmlTemplate, msg.message, msg.platform)}}>
					</div>
				))}
			</div>
		</div>
	);
}
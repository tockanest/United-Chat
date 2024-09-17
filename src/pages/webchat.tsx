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
		messageTransition,
		isDebug
	} = router.query;

	const decodedHtmlTemplate = htmlTemplate ? atob(decodeURIComponent(htmlTemplate as string)) : '';
	const removalTimeSeconds = Number(removalTimer);
	const fadeOutEnabled = fadeOut === "true";
	const messagesLimit = Number(maxMessages);
	const width = Number(currentWidth);
	const height = Number(currentHeight);
	const divMaxWidth = Number(maxWidth);
	const divMaxHeight = Number(maxHeight);
	const scalingEnabled = scaling === "true";
	const scalingFactor = Number(scalingValue);
	const transition = messageTransition as string;

	const [messages, setMessages] = useState<Message[]>([]);
	const fadeQueueRef = useRef<Set<string>>(new Set());
	const [messagesToRemove, setMessagesToRemove] = useState<Set<string>>(new Set());
	const [animationsCss, setAnimationsCss] = useState<string>('');

	const processFadeOutQueue = useCallback(async () => {
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

		for (const id of fadeQueueRef.current) {
			if (!fadeOutEnabled) continue;
			const messageElement = document.getElementById(id);

			if (messageElement) {
				messageElement.classList.add('fade-out');

				await new Promise<void>(resolve => {
					const handleTransitionEnd = () => {
						messageElement.removeEventListener('transitionend', handleTransitionEnd);
						resolve();
						setMessages(prevMessages => prevMessages.map(msg =>
							msg.message.id === id ? {...msg, fullyFadedOut: true} : msg
						));
					};
					messageElement.addEventListener('transitionend', handleTransitionEnd);
				});

				setMessages(prevMessages => prevMessages.filter(msg => msg.message.id !== id));
				fadeQueueRef.current.delete(id);
			}

			await new Promise(resolve => setTimeout(resolve, 2000));
		}
	}, [messages, fadeOutEnabled, messagesLimit, removalTimeSeconds]);

	useEffect(() => {
		if (messagesToRemove.size > 0) {
			setMessages(prevMessages => prevMessages.filter(msg => !messagesToRemove.has(msg.message.id)));
			setMessagesToRemove(new Set());
		}
	}, [messagesToRemove]);

	useEffect(() => {
		const cleanupInterval = setInterval(() => {
			const now = moment();

			setMessages(prevMessages => prevMessages.filter(msg => {
				if (!msg.message.timestamp) return msg;

				const messageTime = msg.platform === "youtube"
					? moment(Number(msg.message.timestamp) / 1000)
					: moment(msg.message.timestamp);

				const shouldFadeOut = fadeOutEnabled && now.diff(messageTime, 'seconds') >= removalTimeSeconds;

				if (shouldFadeOut && !msg.fadingOut) {
					fadeQueueRef.current.add(msg.message.id);
					processFadeOutQueue();
					return {...msg, fadingOut: true};
				}

				const shouldBeRemoved = !fadeOutEnabled && now.diff(messageTime, 'seconds') >= removalTimeSeconds;
				return !shouldBeRemoved;
			}));
		}, 1000);

		return () => {
			clearInterval(cleanupInterval);
		};
	}, [fadeOutEnabled, removalTimeSeconds, processFadeOutQueue]);

	useEffect(() => {
		if (messages.length > messagesLimit) {
			const oldestMessageId = messages[0].message.id;
			setMessages(prevMessages => prevMessages.slice(1));
			fadeQueueRef.current.delete(oldestMessageId);
		}
	}, [messages, messagesLimit]);

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

		fetch('/styles/webchat_transitions.css')
			.then(res => res.text())
			.then(css => setAnimationsCss(css));

		return () => {
			ws.close();
		};
	}, [decodedHtmlTemplate]);

	return (
		<div
			className={`bg-transparent flex flex-col w-[${width}px] h-[${height}px] max-h-[${divMaxHeight}px] max-w-[${divMaxWidth}px] overflow-y-auto `}
			{...scalingEnabled && scalingFactor ? {style: {transform: `scale(${scalingFactor})`}} : {}}
		>
			<script src="/styles/tailwind_complete.css"></script>
			<style>{animationsCss}</style>
			<div
				id={"message-container"}
				className="bg-transparent">
				{messages.map((msg, index) => (
					<div
						key={index}
						className={`message ${msg.fullyFadedOut ? 'fade-out' : ''} flex items-start ${
							transition === 'slide in' ? 'slide-from-right' :
								transition === 'slide bottom' ? 'slide-from-bottom' :
									transition === "typewriter" ? "typewriter" : ''
						}`}
						dangerouslySetInnerHTML={{__html: replacePlaceholders(decodedHtmlTemplate, msg.message, msg.platform)}}
					/>
				))}
			</div>
		</div>
	);
}
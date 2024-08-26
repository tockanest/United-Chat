import {useEffect, useRef, useState} from "react";
import {useRouter} from "next/router";


export default function WebChat() {
	const router = useRouter();
	const {htmlTemplate} = router.query;
	// Decode the HTML template from the query string
	const decodedHtmlTemplate = htmlTemplate ? atob(decodeURIComponent(htmlTemplate as string)) : '';

	const [messages, setMessages] = useState<Message[]>([]);
	const [formattedHtml, setFormattedHtml] = useState<string>('');
	const [lastMessageIndex, setLastMessageIndex] = useState<number>(0);

	const [start, setStart] = useState<boolean>(false);

	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	// This is not working, why is this not working?
	// I hate myself and every once of my being and this code.
	// I hope you have a good day, I'm going to go cry in a corner now.
	// TODO: Please fix this code ASAP, this needs to be fixed since it's a main functionality of the app.


	useEffect(() => {
		// Check if everything is up and running
		if (decodedHtmlTemplate) {
			setStart(true);
		}

		const cleanupInterval = setInterval(() => {
			const now = Date.now();

			// Check if a message is older than 10 seconds
			setMessages((prevMessages) => prevMessages.filter((msg) => {
				if(msg.message.timestamp) {
					return now - msg.message.timestamp < 10000;
				}
			}));
		}, 1000);

		return () => clearInterval(cleanupInterval);
	}, []);

	useEffect(() => {
		const ws = new WebSocket('ws://127.0.0.1:9001');

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
			setMessages((prevMessages) => [...prevMessages, newMessage as Message]);
		};

		ws.onclose = () => {
			console.log('WebSocket connection closing');
		};

		return () => {
			ws.close();
		};
	}, [start])

	function formatPlatformBadge(platform: PlatformMessage<"twitch" | "youtube">["platform"]) {
		switch (platform) {
			case "twitch": {
				return "<img src='/icons/brands/twitch_glitch.svg' alt='twitch' class='w-6 h-6 max-w-[24px] max-h-[24px]'/>";
			}
			case "youtube": {
				return "<img src='/icons/brands/youtube-color.svg' alt='youtube' class='w-6 h-6 max-w-[24px] max-h-[24px]'/>";
			}
		}
	}

	function replacePlaceholders(template: string, message: Message["message"], platform: PlatformMessage<"twitch" | "youtube">["platform"]) {
		return template
			.replaceAll("{user}", message.display_name)
			.replaceAll("{formatedMessage}", message.message.substring(0, 35))
			.replaceAll("{raw_message}", message.raw_data.raw_message)
			.replaceAll("{color}", message.user_color || "")
			.replaceAll("{profile_picture}", "")
			.replaceAll("{platform}", formatPlatformBadge(platform))
			.replaceAll("{\" \"}", "⠀")
			.replaceAll("{badges}", message.user_badges?.join(" ") || "");
	}

	useEffect(() => {
		const formattedMessages = messages.map(msg => replacePlaceholders(decodedHtmlTemplate, msg.message, msg.platform)).join('');
		setFormattedHtml(formattedMessages);
	}, [messages]);


	return (
		<div className="w-full h-full" style={{transform: "scale(1.2)", transformOrigin: "top left"}}>
			<div className="bg-transparent" dangerouslySetInnerHTML={{__html: formattedHtml}}/>
		</div>
	);
}
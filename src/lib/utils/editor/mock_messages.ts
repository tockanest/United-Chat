import twitchBadges from "@/../public/badges/twitch_badges.json";

const phrases = [
	"Hey, what's up? Just dropping by to say hi!",
	"Your streams are the best! Keep 'em coming!",
	"So much fun chatting with you! Thanks for the laughs!",
	"What's up, my favorite streamer?",
	"Great job today! You're on fire!",
	"Love your content! Can't get enough!",
	"How's the stream going? Hope it's going well!",
	"Just tuning in! What's the latest?",
	"Keep it up! You're doing great!",
	"Your energy is infectious! Thanks for the boost!",
	"So glad I found you! Great choice of game today!",
	"Loving the vibes! You're so positive!",
	"Your streams are the highlight of my day!",
	"Keep streaming! Can't wait for the next one!",
	"So happy to support you! Thanks for all you do!",
	"Your passion shines through! It's inspiring!",
	"You're amazing! Such talent!",
	"Liking the new setup! Looks awesome!",
	"Your skills are impressive! Keep practicing!",
	"So grateful for your content! It's so entertaining!",
	"You're making waves! Keep rocking this space!",
	"Great choice of music! It really adds to the atmosphere!",
	"Your dedication is inspiring! Thanks for all your hard work!",
	"So much fun watching you play! Thanks for the entertainment!",
	"Keep doing what you're doing! You're killing it!",
	"Your enthusiasm is contagious! Thanks for sharing!",
	"So glad I stumbled upon your channel! Great find!",
	"Loving the banter! You're hilarious!",
	"Your creativity is boundless! Such original ideas!",
	"Keep pushing boundaries! That's why we love you!",
	"So happy to be part of your community! Thanks for creating!",
	"Your positivity is uplifting! Thanks for brightening my day!",
	"Great job balancing gameplay and chat! You're a pro!",
	"Your authenticity shines through! We appreciate you!",
	"So excited for your next project! Can't wait to see it!",
	"Your humor is spot-on! Always good for a laugh!",
	"The way you engage with viewers is fantastic! Thanks for the interaction!",
	"Your passion for gaming is evident! It shows in everything you do!",
	"Keep spreading joy! You're making a difference!",
	"Your unique style is refreshing! We love it!",
	"Great job handling tough situations! You're a pro!",
	"Your generosity is admirable! Thanks for giving back!",
	"So happy to see you thriving! Congratulations!",
	"Your ability to connect with others is remarkable! Thanks for being approachable!",
	"Keep innovating! Your ideas inspire us!",
	"Your kindness towards others is beautiful! Thanks for setting an example!",
	"So glad I'm part of your journey! Thanks for sharing your story!",
	"Your resilience is impressive! Thanks for persevering!",
	"Great job staying true to yourself! Authenticity rocks!",
	"Your impact goes beyond just gaming! Thanks for being a positive influence!"
];

const randomUsernames = [
	"GamingGuru3000",
	"PixelPwnz",
	"StreamSensation",
	"NinjaNerd99",
	"CyberCrafter",
	"GlitchyGamer",
	"PixelPerfect",
	"ByteBrawler",
	"DigitalDynamo",
	"CircuitSlayer",
	"NeonNomad",
	"QuantumQuake",
	"FiberFrenzy",
	"SiliconSavant",
	"MicroMaverick",
	"NanoNinja",
	"TechTitanium",
	"SiliconSlayer",
	"CircuitCrusader",
	"DigitalDynamite",
	"QuantumQuestor",
	"FiberFusion",
	"SiliconSpecter",
	"MicroMaestro",
	"NanoNemesis",
	"TechTsunami",
	"SiliconStorm",
	"CircuitCatalyst",
	"DigitalDominion",
	"QuantumQuasar",
	"TechTitan",
	"SiliconSorcerer",
	"CircuitConstructor",
	"DigitalDynamo",
	"QuantumQuake",
	"FiberFlux",

];

function randomIds() {
	// Combine timestamp with random string for better uniqueness
	const timestamp = Date.now().toString(36);
	const randomPart = Math.random().toString(36).substring(2, 10);
	return `${timestamp}-${randomPart}`;
}

function userBadges() {
	const badges = twitchBadges.data.map((badge) => badge.versions[0].image_url_4x);

	// Randomly select between 0 and 3 badges
	const numBadges = Math.floor(Math.random() * 4); // 0 to 3
	const shuffledBadges = [...badges].sort(() => Math.random() - 0.5);

	return shuffledBadges.slice(0, numBadges);
}

function randomMessage() {
	return phrases[Math.floor(Math.random() * phrases.length)];
}

function randomUsername() {
	return randomUsernames[Math.floor(Math.random() * randomUsernames.length)];
}

function randomPlatform() {
	return Math.random() > 0.5 ? "twitch" : "youtube";
}

function randomColorHex() {
	return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

export default function randomMessageObject(): Chat.Message {
	const badges = userBadges();

	const platform = randomPlatform();

	switch (platform) {
		case "twitch": {
			return {
				platform: "twitch",
				message: {
					id: randomIds(),
					timestamp: Date.now(),
					display_name: randomUsername(),
					user_color: randomColorHex(),
					user_badges: badges,
					message: randomMessage(),
					emotes: [],
					raw_data: {
						raw_message: randomMessage(),
						raw_emotes: ""
					},
					tags: []
				}
			};
		}
		case "youtube": {
			return {
				platform: "youtube",
				message: {
					id: randomIds(),
					author_id: randomIds(),
					author_name: randomUsername(),
					author_badges: badges,
					message: randomMessage(),
					message_emotes: [],
					timestamp: Math.floor(new Date().getTime() * 1000).toString(),
					tracking_params: ""
				}
			};
		}
	}
}
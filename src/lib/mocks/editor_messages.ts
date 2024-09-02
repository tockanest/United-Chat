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
	"QuantumQuasar"
];

function randomIds() {
	return Math.random().toString(36).substring(2, 15);
}

function userBadges() {
	const badges = [
		"https://static-cdn.jtvnw.net/badges/v1/7833bb6e-d20d-48ff-a58d-67fe827a4f84/3",
		"https://static-cdn.jtvnw.net/badges/v1/9ef7e029-4cdf-4d4d-a0d5-e2b3fb2583fe/3",
		"https://static-cdn.jtvnw.net/badges/v1/2cbc339f-34f4-488a-ae51-efdf74f4e323/3",
		"https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/3",
		"https://static-cdn.jtvnw.net/badges/v1/ed917c9a-1a45-4340-9c64-ca8be4348c51/3"
	];

	// Select maximum of 3 badges
	const maxBadges = 3;
	return badges.slice(0, Math.min(maxBadges, badges.length));
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

export default function randomMessageObject(): Message {
	const badges = userBadges();

	return {
		platform: randomPlatform(),
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
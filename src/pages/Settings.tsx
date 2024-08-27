import React, {useEffect, useState} from 'react'
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import {
	Check,
	ChevronLeft,
	MinusCircle,
	PaintBucket,
	Plus,
	PlusCircle,
	Trash2,
	Twitch,
	X,
	Youtube as YoutubeIcon
} from 'lucide-react'

// Placeholder function to fetch user themes from backend
const fetchUserThemes = async () => {
	return new Promise<string[]>((resolve) => {
		setTimeout(() => {
			resolve(['Default', 'Neon', 'Minimalist', 'Retro']);
		}, 1000);
	});
};

type UnitedChatSettingsProps = {
	setPage: React.Dispatch<React.SetStateAction<string>>,
	user: UserInformation | null
}

export default function UnitedChatSettings(
	{
		setPage,
		user
	}: UnitedChatSettingsProps
) {
	const [theme, setTheme] = useState<"Light" | "Dark" | "">("");
	const [videoChannels, setVideoChannels] = useState<string[]>([])
	const [newChannel, setNewChannel] = useState('')
	const [bulkAddLinks, setBulkAddLinks] = useState('')
	const [isTwitchLinked, setIsTwitchLinked] = useState(false)
	const [isYoutubeLinked, setIsYoutubeLinked] = useState(false)
	const [chatThemes, setChatThemes] = useState<string[]>([])
	const [defaultChatTheme, setDefaultChatTheme] = useState('Default')

	useEffect(() => {
		fetchUserThemes().then((themes) => {
			setChatThemes(themes);
			if (!themes.includes(defaultChatTheme)) {
				setDefaultChatTheme(themes[0] || 'Default');
			}
		});

		if (user) {
			setIsTwitchLinked(true);
		}

		const theme = localStorage.getItem("theme");
		if (theme) return setTheme(theme as "Light" | "Dark" | "");
		return setTheme("")

	}, []);

	const addChannel = () => {
		if (newChannel) {
			setVideoChannels([...videoChannels, newChannel])
			setNewChannel('')
		}
	}

	const removeChannel = (index: number) => {
		const updatedChannels = videoChannels.filter((_, i) => i !== index)
		setVideoChannels(updatedChannels)
	}

	const handleBulkAdd = () => {
		const newChannels = bulkAddLinks.split(',').map(link => link.trim())
		setVideoChannels([...videoChannels, ...newChannels])
		setBulkAddLinks('')
	}

	const handleBulkDelete = () => {
		setVideoChannels([])
	}

	const removeChatTheme = (theme: string) => {
		if (theme === 'Default') return; // Prevent removal of the Default theme
		const updatedThemes = chatThemes.filter(t => t !== theme)
		setChatThemes(updatedThemes)
		if (defaultChatTheme === theme) {
			setDefaultChatTheme('Default')
		}
	}

	return (
		<div className="container mx-auto p-4">
			<Tabs defaultValue="chat-settings" className="w-full">
				<TabsList>
					<Button variant={"link"} onClick={() => {
						setPage('editor')
					}}>
						<ChevronLeft className="h-4 w-4 mr-2"/>
					</Button>
					<TabsTrigger value="chat-settings">Chat Settings</TabsTrigger>
					<TabsTrigger value="app-config">App Configuration</TabsTrigger>
				</TabsList>

				<TabsContent value="chat-settings">
					<Card>
						<CardHeader>
							<CardTitle>United Chat Settings</CardTitle>
							<CardDescription>Manage your YouTube channels, chat themes, and platform
								integrations.</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-6">
								<div>
									<h3 className="text-lg font-semibold mb-2">Platform Integrations</h3>
									<div className="flex space-x-4">
										<Button
											variant={isTwitchLinked ? "destructive" : "default"}
											onClick={() => setIsTwitchLinked(!isTwitchLinked)}
										>
											<Twitch className="h-4 w-4 mr-2"/>
											{isTwitchLinked ? 'Unlink Twitch' : 'Link Twitch'}
										</Button>
										<Button
											variant={isYoutubeLinked ? "destructive" : "default"}
											onClick={() => setIsYoutubeLinked(!isYoutubeLinked)}
										>
											<YoutubeIcon className="h-4 w-4 mr-2"/>
											{isYoutubeLinked ? 'Unlink YouTube' : 'Link YouTube'}
										</Button>
									</div>
								</div>

								<div>
									<h3 className="text-lg font-semibold mb-2">YouTube Channels</h3>
									<div className="space-y-4">
										<div>
											<Label htmlFor="add-channel">Add Video Channel</Label>
											<div className="flex mt-1">
												<Input
													id="add-channel"
													value={newChannel}
													onChange={(e) => setNewChannel(e.target.value)}
													placeholder="Enter YouTube channel URL"
												/>
												<Button onClick={addChannel} className="ml-2">
													<PlusCircle className="h-4 w-4 mr-2"/>
													Add
												</Button>
											</div>
										</div>

										<ul className="space-y-2">
											{videoChannels.map((channel, index) => (
												<li key={index}
												    className="flex items-center justify-between bg-gray-100 p-2 rounded">
													<span>{channel}</span>
													<Button variant="ghost" size="sm"
													        onClick={() => removeChannel(index)}>
														<MinusCircle className="h-4 w-4"/>
													</Button>
												</li>
											))}
										</ul>

										<div className="flex space-x-2">
											<Dialog>
												<DialogTrigger asChild>
													<Button variant="destructive">
														<Trash2 className="h-4 w-4 mr-2"/>
														Bulk Delete
													</Button>
												</DialogTrigger>
												<DialogContent>
													<DialogHeader>
														<DialogTitle>Confirm Bulk Delete</DialogTitle>
														<DialogDescription>
															Are you sure you want to delete all video channels? This
															action cannot be undone.
														</DialogDescription>
													</DialogHeader>
													<DialogFooter>
														<Button variant="outline" onClick={() => {
														}}>Cancel</Button>
														<Button variant="destructive" onClick={handleBulkDelete}>Delete
															All</Button>
													</DialogFooter>
												</DialogContent>
											</Dialog>

											<Dialog>
												<DialogTrigger asChild>
													<Button variant="outline">
														<Plus className="h-4 w-4 mr-2"/>
														Bulk Add
													</Button>
												</DialogTrigger>
												<DialogContent>
													<DialogHeader>
														<DialogTitle>Bulk Add Channels</DialogTitle>
														<DialogDescription>
															Enter multiple YouTube channel URLs separated by commas.
														</DialogDescription>
													</DialogHeader>
													<Input
														value={bulkAddLinks}
														onChange={(e) => setBulkAddLinks(e.target.value)}
														placeholder="https://youtube.com/channel1, https://youtube.com/channel2, ..."
													/>
													<DialogFooter>
														<Button variant="outline" onClick={() => {
														}}>Cancel</Button>
														<Button onClick={handleBulkAdd}>Add Channels</Button>
													</DialogFooter>
												</DialogContent>
											</Dialog>
										</div>
									</div>
								</div>

								<div>
									<h3 className="text-lg font-semibold mb-2">Chat Themes</h3>
									<div className="grid grid-cols-2 gap-2">
										{chatThemes.map((theme) => (
											<div key={theme} className="flex items-center">
												<Button
													variant={theme === defaultChatTheme ? "default" : "outline"}
													className="flex-grow justify-between"
													onClick={() => setDefaultChatTheme(theme)}
												>
													{theme}
													{theme === defaultChatTheme && (
														<Check className="h-4 w-4 ml-2"/>
													)}
												</Button>
												{theme !== 'Default' && (
													<Button
														variant="ghost"
														size="icon"
														onClick={() => removeChatTheme(theme)}
														className="ml-2"
													>
														<X className="h-4 w-4"/>
													</Button>
												)}
											</div>
										))}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="app-config">
					<Card>
						<CardHeader>
							<CardTitle>App Configuration</CardTitle>
							<CardDescription>Manage general app settings and appearance.</CardDescription>
						</CardHeader>
						<CardContent>
							<div>
								<h3 className="text-lg font-semibold mb-2">App Themes</h3>
								<div className="grid grid-cols-3 gap-2">
									{['Light', 'Dark', 'System'].map((theme) => (
										<Button onClick={() => {
											setTheme(theme.toLowerCase() as "Light" | "Dark" | "")
											document.documentElement.setAttribute("data-theme", theme.toLocaleLowerCase());
											console.log(document.documentElement.getAttribute("data-theme"));
											localStorage.setItem("theme", theme.toLowerCase());
										}} key={theme} variant="outline">
											<PaintBucket className="h-4 w-4 mr-2"/>
											{theme}
										</Button>
									))}
								</div>
							</div>
							{/* Add more app-specific settings here */}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	)
}
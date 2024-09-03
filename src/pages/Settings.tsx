import {useEffect, useState} from 'react'
import {Button} from "@/components/ui/button"
import {Checkbox} from "@/components/ui/checkbox"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table"
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Edit, RefreshCw, Trash2, Twitch, Youtube} from "lucide-react"
import {useToast} from "@/hooks/use-toast"
import {Toaster} from "@/components/ui/toaster"
import TauriApi from "@/lib/Tauri"
import moment from "moment";

type LiveStream = {
	id: string
	name: string
	scheduledTime: string | null
	status: 'live' | 'scheduled' | 'replay'
}

type ChatTheme = {
	id: string
	name: string
	preview: string
}

export default function AppSettings() {
	const {toast} = useToast()
	const [liveStreams, setLiveStreams] = useState<LiveStream[]>([])
	const [selectedStreams, setSelectedStreams] = useState<string[]>([])
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
	const [newLiveStream, setNewLiveStream] = useState({url: ''})
	const [isLoading, setIsLoading] = useState(false)

	const [appTheme, setAppTheme] = useState('system')

	const [chatThemes, setChatThemes] = useState<ChatTheme[]>([
		{id: '1', name: 'Default', preview: '/placeholder.svg?height=100&width=200'},
		{id: '2', name: 'Neon', preview: '/placeholder.svg?height=100&width=200'},
		{id: '3', name: 'Minimalist', preview: '/placeholder.svg?height=100&width=200'},
	])
	const [selectedChatTheme, setSelectedChatTheme] = useState('1')

	const [youtubeConnected, setYoutubeConnected] = useState(false)
	const [twitchConnected, setTwitchConnected] = useState(false)

	const handleSelectAll = () => {
		if (selectedStreams.length === liveStreams.length) {
			setSelectedStreams([])
		} else {
			setSelectedStreams(liveStreams.map(stream => stream.id))
		}
	}

	const handleSelectStream = (id: string) => {
		if (selectedStreams.includes(id)) {
			setSelectedStreams(selectedStreams.filter(streamId => streamId !== id))
		} else {
			setSelectedStreams([...selectedStreams, id])
		}
	}

	const handleRemoveSelected = () => {
		const newStreams = liveStreams.filter(stream => !selectedStreams.includes(stream.id) || stream.status === 'live')
		setLiveStreams(newStreams)
		setSelectedStreams([])
	}

	const handleAddNewLive = async () => {
		setIsLoading(true)
		try {
			const video = await TauriApi.GetVideo(newLiveStream.url)
			const storeVideo = await TauriApi.StoreVideo(video)

			if (!storeVideo) {
				return toast({
					title: "Error",
					description: "An error occurred while adding the live stream.",
					variant: "destructive",
				})
			}

			setLiveStreams([
				...liveStreams,
				{
					id: video.video_id,
					name: video.video_name,
					scheduledTime: video.scheduled_start_time,
					status: video.stream_type,
				}
			])

			toast({
				title: "Success",
				description: "New live stream added successfully.",
			})

			setIsAddDialogOpen(false)
		} catch (err) {
			console.log(err)
			toast({
				title: "Error",
				description: (typeof err === 'string' ? err : err as string) || "An error occurred.",
				variant: "destructive",
			})
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		const fetchLiveStreams = async () => {
			const streams = await TauriApi.GetAllVideos();
			console.log(streams)
			setLiveStreams(streams.map(stream => ({
				id: stream.video_id,
				name: stream.video_name,
				// Format unix timestamp to human-readable date
				scheduledTime: stream.scheduled_start_time ? moment.unix(parseInt(stream.scheduled_start_time)).format('L, hh:mm') : null,
				status: stream.stream_type,
			})))
		}

		fetchLiveStreams()
	}, []);

	return (
		<div className="container mx-auto p-4">
			<h1 className="text-2xl font-bold mb-4">App Settings</h1>

			<Tabs defaultValue="functionality" className="w-full">
				<TabsList>
					<TabsTrigger value="functionality">Functionality Settings</TabsTrigger>
					<TabsTrigger value="ui">UI Settings</TabsTrigger>
				</TabsList>
				<TabsContent value="functionality">
					<Card className="mb-4">
						<CardHeader>
							<CardTitle>YouTube Live Management</CardTitle>
							<CardDescription>Manage your YouTube live streams</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="mb-4 flex justify-between items-center">
								<div>
									<Button variant="outline" className="mr-2" onClick={handleRemoveSelected}
									        disabled={selectedStreams.length === 0}>
										Remove Selected
									</Button>
									<Button variant="outline" className="mr-2" disabled={selectedStreams.length === 0}>
										Mass Edit
									</Button>
									<Button variant="outline" disabled={selectedStreams.length === 0}>
										Mass Update
									</Button>
								</div>
								<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
									<DialogTrigger asChild>
										<Button>
											<Youtube className="mr-2 h-4 w-4"/>
											Add New Live
										</Button>
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>Add New YouTube Live</DialogTitle>
										</DialogHeader>
										<div className="grid gap-4 py-4">
											<div className="grid grid-cols-4 items-center gap-4">
												<Label htmlFor="url" className="text-right">
													Live URL
												</Label>
												<Input
													id="url"
													value={newLiveStream.url}
													onChange={(e) => setNewLiveStream({
														...newLiveStream,
														url: e.target.value
													})}
													className="col-span-3"
												/>
											</div>
										</div>
										<Button onClick={handleAddNewLive} disabled={isLoading}>
											{isLoading ? 'Adding...' : 'Add Live'}
										</Button>
									</DialogContent>
								</Dialog>
							</div>

							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-[50px]">
											<Checkbox
												checked={selectedStreams.length === liveStreams.length}
												onCheckedChange={handleSelectAll}
											/>
										</TableHead>
										<TableHead>Video Name</TableHead>
										<TableHead>Scheduled Time</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{liveStreams.map((stream) => (
										<TableRow key={stream.id}>
											<TableCell>
												<Checkbox
													checked={selectedStreams.includes(stream.id)}
													onCheckedChange={() => handleSelectStream(stream.id)}
												/>
											</TableCell>
											<TableCell>{stream.name}</TableCell>
											<TableCell>{stream.scheduledTime || 'Not scheduled'}</TableCell>
											<TableCell>
												<span className={`px-2 py-1 rounded-full text-xs font-semibold
												${stream.status === 'live' ? 'bg-green-100 text-green-800' :
													stream.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
														'bg-gray-100 text-gray-800'}`}>
												{stream.status.charAt(0).toUpperCase() + stream.status.slice(1)}
												</span>
											</TableCell>
											<TableCell className="text-right">
												<Button variant="ghost" size="icon" className="mr-2">
													<Edit className="h-4 w-4"/>
												</Button>
												<Button variant="ghost" size="icon" className="mr-2">
													<RefreshCw className="h-4 w-4"/>
												</Button>
												<Button variant="ghost" size="icon" disabled={stream.status === 'live'}>
													<Trash2 className="h-4 w-4"/>
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>

					<Card className="mb-4">
						<CardHeader>
							<CardTitle>Twitch and YouTube Account Linking</CardTitle>
							<CardDescription>Connect your Twitch and YouTube accounts</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center">
									<Youtube className="mr-2 h-6 w-6"/>
									<span>YouTube</span>
								</div>
								<Button onClick={() => setYoutubeConnected(!youtubeConnected)}>
									{youtubeConnected ? 'Disconnect' : 'Connect'}
								</Button>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center">
									<Twitch className="mr-2 h-6 w-6"/>
									<span>Twitch</span>
								</div>
								<Button onClick={() => setTwitchConnected(!twitchConnected)}>
									{twitchConnected ? 'Disconnect' : 'Connect'}
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Chat Theme Management</CardTitle>
							<CardDescription>Customize the appearance of chat windows</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-3 gap-4">
								{chatThemes.map((theme) => (
									<Card
										key={theme.id}
										className={`cursor-pointer ${
											selectedChatTheme === theme.id ? 'border-primary' : 'border-border'
										}`}
										onClick={() => setSelectedChatTheme(theme.id)}
									>
										<CardHeader>
											<CardTitle>{theme.name}</CardTitle>
										</CardHeader>
										<CardContent>
											<img src={theme.preview} alt={`${theme.name} theme preview`}
											     className="w-full h-auto rounded"/>
										</CardContent>
									</Card>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="ui">
					<Card>
						<CardHeader>
							<CardTitle>App Theme Customization</CardTitle>
							<CardDescription>Choose a theme for the app interface</CardDescription>
						</CardHeader>
						<CardContent>
							<Select value={appTheme} onValueChange={setAppTheme}>
								<SelectTrigger className="w-[180px]">
									<SelectValue placeholder="Select a theme"/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="system">System</SelectItem>
									<SelectItem value="light">Light</SelectItem>
									<SelectItem value="dark">Dark</SelectItem>
								</SelectContent>
							</Select>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
			<Toaster/>
		</div>
	)
}
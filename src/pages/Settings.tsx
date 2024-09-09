import React, {Dispatch, SetStateAction, useEffect, useState} from 'react'
import {Button} from "@/components/ui/button"
import {Checkbox} from "@/components/ui/checkbox"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table"
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {ChevronLeft, Edit, RefreshCw, Trash2, Twitch, Youtube} from "lucide-react"
import {useToast} from "@/hooks/use-toast"
import {Toaster} from "@/components/ui/toaster"
import TauriApi from "@/lib/Tauri"
import moment from "moment"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@/components/ui/alert-dialog"

type LiveStream = {
	id: string
	name: string
	scheduledTime: string | null
	status: 'live' | 'scheduled' | 'offline'
}

type ChatTheme = {
	id: string
	name: string
	preview: string
}

export default function AppSettings(
	{
		setPage,
		user
	}: {
		setPage: Dispatch<SetStateAction<string>>
		user: UserInformation | null
	}
) {
	const {toast} = useToast()
	const [liveStreams, setLiveStreams] = useState<LiveStream[]>([])
	const [selectedStreams, setSelectedStreams] = useState<string[]>([])
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
	const [newLiveStream, setNewLiveStream] = useState({url: ''})
	const [isLoading, setIsLoading] = useState(false)
	const [showConfirmDialog, setShowConfirmDialog] = useState(false)
	const [pendingVideo, setPendingVideo] = useState<any>(null)

	const [appTheme, setAppTheme] = useState('system')

	const [chatThemes, setChatThemes] = useState<ChatTheme[]>([
		{id: '1', name: 'Default', preview: '/placeholder.svg?height=100&width=200'},
		{id: '2', name: 'Neon', preview: '/placeholder.svg?height=100&width=200'},
		{id: '3', name: 'Minimalist', preview: '/placeholder.svg?height=100&width=200'},
	])
	const [selectedChatTheme, setSelectedChatTheme] = useState('1')

	const [youtubeConnected, setYoutubeConnected] = useState(false)
	const [twitchConnected, setTwitchConnected] = useState(false)
	const [startLinkingAlert, setStartLinkingAlert] = useState(false)
	const [logoutAlert, setLogoutAlert] = useState(false)

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
		const streamsToRemove = liveStreams.filter(stream => selectedStreams.includes(stream.id))
		const idsToRemove = streamsToRemove.map(stream => stream.id)

		idsToRemove.forEach(async (id) => {
			const removeStream = await TauriApi.DeleteVideo(id)
			if (!removeStream) {
				return toast({
					title: "Error",
					description: "An error occurred while removing the live stream.",
					variant: "destructive",
				})
			}
		})

		setLiveStreams(liveStreams.filter(stream => !idsToRemove.includes(stream.id)))
		setSelectedStreams([])
	}

	const handleAddNewLive = async () => {
		setIsLoading(true)
		try {
			const video = await TauriApi.GetVideo(newLiveStream.url)

			const liveStreamsCount = liveStreams.filter(stream => stream.status === 'live').length
			if (video.stream_type === 'live' && liveStreamsCount > 0) {
				setPendingVideo(video)
				setShowConfirmDialog(true)
				return
			}

			await addVideoToStreams(video)
		} catch (err: any) {
			console.log(err)
			toast({
				title: "Error",
				description: (typeof err === 'string' ? err : err.error as string) || "An error occurred.",
				variant: "destructive",
			})
		} finally {
			setIsLoading(false)
		}
	}

	const addVideoToStreams = async (video: any) => {

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
		setNewLiveStream({url: ''})
	}

	const handleConfirmAddLive = async () => {
		if (pendingVideo) {
			await addVideoToStreams(pendingVideo)
			setPendingVideo(null)
		}
		setShowConfirmDialog(false)
	}

	useEffect(() => {
		const liveStreamsCount = liveStreams.filter(stream => stream.status === 'live').length

		if (liveStreamsCount > 1) {
			toast({
				title: "Warning",
				description: "You have more than one live stream running at the same time. You should not have more than one live stream running at the same time to avoid issues.",
				variant: "destructive",
			})
		}
	}, [liveStreams])

	useEffect(() => {
		const fetchLiveStreams = async () => {
			try {
				const streams = await TauriApi.GetAllVideos()
				console.log(streams)
				setLiveStreams(streams.map(stream => ({
					id: stream.video_id,
					name: stream.video_name,
					scheduledTime: stream.scheduled_start_time ? moment.unix(parseInt(stream.scheduled_start_time)).format('L, hh:mm') : null,
					status: stream.stream_type,
				})))
			} catch (e) {
				if (typeof e === "string") {
					toast({
						title: "Error",
						description: `An error occurred while fetching live streams: ${e}`,
						variant: "destructive",
					})
				}
			}
		}

		fetchLiveStreams()

		if (user) {
			setTwitchConnected(true)
		}
	}, [])

	return (
		<div className="container mx-auto p-4">
			<AlertDialog open={startLinkingAlert} onOpenChange={setStartLinkingAlert}>
				<AlertDialogContent className="sm:max-w-[425px]">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-2xl">
							Link Twitch Account
						</AlertDialogTitle>
						<AlertDialogDescription className="text-center">
							To link your Twitch account, the app will close this window and go back to the splashscreen
							to connect to Twitch.<br/>
							Are you sure you want to continue?<br/><br/>
							Any unsaved changes will be lost!
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction onClick={() => {
							setStartLinkingAlert(false)
						}}>
							Close
						</AlertDialogAction>
						<AlertDialogAction onClick={() => {
							window.localStorage.setItem("twitch_linked", "false")
							TauriApi.StartLinkingAIS();
						}}>
							Open
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<AlertDialog open={logoutAlert} onOpenChange={setLogoutAlert}>
				<AlertDialogContent className="sm:max-w-[425px]">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-2xl">
							Unlink Twitch Account
						</AlertDialogTitle>
						<AlertDialogDescription className="text-center">
							Are you sure you want to unlink your Twitch account?<br/>
							You will either need to log in again or use the app without a linked Twitch
							account.<br/><br/>
							Any unsaved changes will be lost, but everything else will be saved.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction onClick={() => {
							setStartLinkingAlert(false)
						}}>
							Close
						</AlertDialogAction>
						<AlertDialogAction onClick={() => {
							window.localStorage.setItem("twitch_linked", "false")
							TauriApi.Logout();
						}}>
							Open
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<Tabs defaultValue="functionality" className="w-full">
				<TabsList>
					<Button variant={"link"} onClick={() => {
						setPage('editor')
					}}>
						<ChevronLeft className="h-4 w-4 mr-2"/>
					</Button>
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
					                            ${
						                        stream.status === 'live' ? 'bg-green-100 text-green-800' :
							                        stream.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
								                        stream.status === 'offline' ? 'bg-yellow-100 text-red-500' : 'bg-gray-100 text-gray-800'
					                        }
				                            `}
					                        >
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
								<Button onClick={() => {
									if (!user) {
										// 	Show the user that the app is going back to the splashscreen to connect to Twitch
										setStartLinkingAlert(true)
									} else {
										// 	Logout the user
										// 	Show the user that the app is going back to the splashscreen to connect to Twitch
										setLogoutAlert(true)
									}
								}}>
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
							<Select
								value={appTheme}
								onValueChange={(value) => {
									setAppTheme(value);
									document.documentElement.setAttribute("data-theme", value);
									window.localStorage.setItem('theme', value);
								}}
							>
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
			<AlertDialog open={showConfirmDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm Adding Live Stream</AlertDialogTitle>
						<AlertDialogDescription>
							There is already a live stream running. Are you sure you want to add another one?<br/><br/>
							Adding another stream may cause issues such as:
							<ul className="list-disc pl-4">
								<li>Chat messages may not be displayed correctly</li>
								<li>Performance may be impacted</li>
								<li>Other unknown issues</li>
							</ul>
							<br/>
							Please make sure you know what you are doing before continuing.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirmAddLive}>Confirm</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<Toaster/>
		</div>
	)
}
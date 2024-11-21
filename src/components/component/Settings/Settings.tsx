import {Dispatch, SetStateAction, useEffect, useState} from 'react';
import {Button} from "@/components/ui/button";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {ChevronLeft} from "lucide-react";
import {useToast} from "@/hooks/use-toast";
import TauriApi from "@/lib/Tauri";
import moment from "moment";
import {
	handleAddNewChannel,
	handleRemoveSelected,
	handleSelectAll,
	handleSelectStream
} from "@/components/component/Main/Helpers/settingsUtils";
import {YouTubeManagement} from './YouTubeManagement';
import {AccountLinking} from './AccountLinking';
import {ChatThemeManager} from './ChatThemeManager';
import {AppTheme} from './AppTheme';
import {LinkingDialogs} from './LinkingDialogs';
import {ChatTheme, LiveStream} from "@/types/streams";
import {AvailableThemes} from "@/types/editor";

interface AppSettingsProps {
	setPage: Dispatch<SetStateAction<string>>;
	user: UserInformation | null;
}

export default function AppSettings({setPage, user}: AppSettingsProps) {
	const {toast} = useToast();
	
	// State management
	const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
	const [selectedStreams, setSelectedStreams] = useState<string[]>([]);
	const [newLiveStream, setNewLiveStream] = useState({url: ''});
	const [isLoading, setIsLoading] = useState(false);
	const [showYtChannelDialog, setShowYtChannelDialog] = useState(false);
	const [appTheme, setAppTheme] = useState('system');
	const [chatThemes, setChatThemes] = useState<ChatTheme[]>([]);
	const [selectedChatTheme, setSelectedChatTheme] = useState('1');
	const [youtubeConnected, setYoutubeConnected] = useState(false);
	const [twitchConnected, setTwitchConnected] = useState(false);
	const [startLinkingTwitchAlert, setStartLinkingTwitchAlert] = useState(false);
	const [startLinkingYtAlert, setStartLinkingYtAlert] = useState(false);
	const [logoutAlert, setLogoutAlert] = useState(false);
	
	// Handlers
	const handleThemeChange = (value: string) => {
		if (value === "system") {
			value = window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light";
		}
		
		setAppTheme(value);
		document.documentElement.setAttribute("data-theme", value);
		window.localStorage.setItem('theme', value);
	};
	
	const handleYouTubeClick = () => {
		if (!youtubeConnected) {
			setStartLinkingYtAlert(true);
		} else {
			setLogoutAlert(true);
		}
	};
	
	const handleTwitchClick = () => {
		if (!user) {
			setStartLinkingTwitchAlert(true);
		} else {
			setLogoutAlert(true);
		}
	};
	
	const handleStartLinkingTwitch = () => {
		window.localStorage.setItem("twitch_linked", "false");
		TauriApi.StartLinkingAIS();
	};
	
	const handleLogout = () => {
		window.localStorage.setItem("twitch_linked", "false");
		TauriApi.Logout();
	};
	
	const handleAddChannel = async () => {
		try {
			const c = await handleAddNewChannel(newLiveStream.url)
			console.log(c)
		} catch (e) {
			toast({
				title: "Error",
				description: `${e}`,
				variant: "destructive",
			});
		}
	};
	
	// Effects
	useEffect(() => {
		const liveStreamsCount = liveStreams.filter(stream => stream.status === 'live').length;
		
		if (liveStreamsCount > 1) {
			toast({
				title: "Warning",
				description: "You have more than one live stream running at the same time. To avoid issues, please consider not adding a second running stream.",
				variant: "destructive",
			});
		}
	}, [liveStreams]);
	
	useEffect(() => {
		const initialize = async () => {
			try {
				// Fetch live streams
				const streams = await TauriApi.GetAllVideos();
				setLiveStreams(streams.map(stream => ({
					id: stream.video_id,
					name: stream.video_name,
					scheduledTime: stream.scheduled_start_time
						? moment.unix(parseInt(stream.scheduled_start_time)).format('L, hh:mm')
						: null,
					status: stream.stream_type,
				})));
				
				// Fetch chat themes
				const themes = (await TauriApi.GetAvailableThemes()).map(async ([name]: AvailableThemes[0]) => {
					const getTheme = await TauriApi.GetEditorTheme(name);
					return {
						id: name,
						name: getTheme.name,
						html: getTheme.html_code,
						css: getTheme.css_code,
					};
				});
				
				setChatThemes(await Promise.all(themes));
			} catch (e) {
				if (typeof e === "string") {
					toast({
						title: "Error",
						description: `An error occurred while fetching data: ${e}`,
						variant: "destructive",
					});
				}
			}
		};
		
		initialize();
		if (user) {
			setTwitchConnected(true);
		}
		
		const theme = window.localStorage.getItem('theme') || 'system';
		setAppTheme(theme);
	}, []);
	
	return (
		<div className="container mx-auto p-4">
			<LinkingDialogs
				startLinkingTwitchAlert={startLinkingTwitchAlert}
				startLinkingYtAlert={startLinkingYtAlert}
				logoutAlert={logoutAlert}
				showYtChannelDialog={showYtChannelDialog}
				newLiveStream={newLiveStream}
				isLoading={isLoading}
				onTwitchAlertChange={setStartLinkingTwitchAlert}
				onYtAlertChange={setStartLinkingYtAlert}
				onLogoutAlertChange={setLogoutAlert}
				onYtChannelDialogChange={setShowYtChannelDialog}
				onNewLiveStreamChange={setNewLiveStream}
				onStartLinkingTwitch={handleStartLinkingTwitch}
				onStartLinkingYt={() => {
				}}
				onLogout={handleLogout}
				onAddChannel={handleAddChannel}
			/>
			
			<Tabs defaultValue="functionality" className="w-full">
				<TabsList>
					<Button variant="link" onClick={() => setPage('editor')}>
						<ChevronLeft className="h-4 w-4 mr-2"/>
					</Button>
					<TabsTrigger value="functionality">Functionality Settings</TabsTrigger>
					<TabsTrigger value="ui">UI Settings</TabsTrigger>
				</TabsList>
				
				<TabsContent value="functionality">
					<YouTubeManagement
						liveStreams={liveStreams}
						selectedStreams={selectedStreams}
						handleRemoveSelected={() => handleRemoveSelected(
							selectedStreams,
							setSelectedStreams,
							liveStreams,
							setLiveStreams,
							toast
						)}
						handleSelectAll={() => handleSelectAll(
							selectedStreams,
							setSelectedStreams,
							liveStreams
						)}
						handleSelectStream={(id) => handleSelectStream(
							id,
							selectedStreams,
							setSelectedStreams
						)}
					/>
					
					<AccountLinking
						youtubeConnected={youtubeConnected}
						twitchConnected={twitchConnected}
						onYouTubeClick={handleYouTubeClick}
						onTwitchClick={handleTwitchClick}
					/>
					
					<ChatThemeManager
						chatThemes={chatThemes}
						selectedChatTheme={selectedChatTheme}
						onThemeSelect={(id) => {
							setSelectedChatTheme(id);
							window.localStorage.setItem('selectedChatTheme', id);
						}}
						onRefresh={async () => {
							// Implement refresh functionality
							const themes = (await TauriApi.GetAvailableThemes()).map(async ([name]: AvailableThemes[0]) => {
								const getTheme = await TauriApi.GetEditorTheme(name);
								return {
									id: name,
									name: getTheme.name,
									html: getTheme.html_code,
									css: getTheme.css_code,
								};
							});
							
							setChatThemes(await Promise.all(themes));
						}}
					/>
				</TabsContent>
				
				<TabsContent value="ui">
					<AppTheme
						appTheme={appTheme}
						onThemeChange={handleThemeChange}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
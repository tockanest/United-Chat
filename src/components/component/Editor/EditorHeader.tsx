import React, {useEffect, useState} from "react"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {DropdownMenu, DropdownMenuTrigger} from "@/components/ui/dropdown-menu"
import {Button} from "@/components/ui/button"
import {PaintBucket, Pause, Play, Save} from "lucide-react"
import AvailableThemes from "@/components/component/Editor/AvailableThemes"
import ConfigDropdown from "@/components/component/Editor/ConfigDropdown"
import CodeMirror from "@uiw/react-codemirror"
import {html} from "@codemirror/lang-html"
import {dracula} from "@uiw/codemirror-theme-dracula"
import {css} from "@codemirror/lang-css"
import TauriApi from "@/lib/Tauri"
import {handleConfigChange, handleWebChatWindow} from "@/components/component/Main/Helpers/webChatUtils"
import Alerts from "@/components/component/Editor/Alerts";

export type EditorHeaderProps = {
	htmlCode: string;
	setHtmlCode: React.Dispatch<React.SetStateAction<string>>;
	cssCode: string;
	setCssCode: React.Dispatch<React.SetStateAction<string>>;
	config: ConfigState;
	setConfig: React.Dispatch<React.SetStateAction<ConfigState>>;
	showSaveDialog: boolean;
	setShowSaveDialog: React.Dispatch<React.SetStateAction<boolean>>;
	startWebsocket: boolean;
	setStartWebsocket: React.Dispatch<React.SetStateAction<boolean>>;
	triggerReloadAlert: boolean;
	setTriggerReloadAlert: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function EditorHeader(
	{
		htmlCode,
		setHtmlCode,
		cssCode,
		setCssCode,
		config,
		setConfig,
		showSaveDialog,
		setShowSaveDialog,
		startWebsocket,
		setStartWebsocket,
		triggerReloadAlert,
		setTriggerReloadAlert
	}: EditorHeaderProps
) {
	const [editorSelected, setEditorSelected] = useState<string>('html')

	const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false)
	const [dialogMessage, setDialogMessage] = useState<string>("")
	const [webChatWindowShown, setWebChatWindowShown] = useState<boolean>(false)

	const [theme, setTheme] = useState<string>("default")
	const [newTheme, setNewTheme] = useState<boolean>(false)

	useEffect(() => {
		const theme = localStorage.getItem("chatTheme")
		setTheme(theme || "default")
	}, [])

	useEffect(() => {
		console.log(theme)
		TauriApi.GetEditorTheme(theme).then((result) => {
			if (result) {
				localStorage.setItem("chatTheme", theme)
				setHtmlCode(result.html_code)
				setCssCode(result.css_code)
			}
		})
	}, [theme])

	return (
		<>
			<Alerts
				showConfirmDialog={showConfirmDialog}
				setShowConfirmDialog={setShowConfirmDialog}
				dialogMessage={dialogMessage}
				setWebChatWindowShown={setWebChatWindowShown}
				showSaveDialog={showSaveDialog}
				setShowSaveDialog={setShowSaveDialog}
				htmlCode={htmlCode}
				cssCode={cssCode}
				setNewTheme={setNewTheme}
				triggerReloadAlert={triggerReloadAlert}
				setTriggerReloadAlert={setTriggerReloadAlert}
			/>
			<Tabs defaultValue="html" className="flex-grow flex flex-col">
				<div
					className="flex justify-between items-center px-4 py-2 border-b bg-background shadow-sm transition-all duration-200 ease-in-out hover:shadow-md">
					<div className="flex items-center space-x-4">
						<TabsList
							className="grid w-[200px] h-[40px] grid-cols-2 p-1 bg-muted rounded-md overflow-hidden">
							<TabsTrigger
								value="html"
								className="px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-sm"
								onClick={() => setEditorSelected('html')}
							>
								HTML
							</TabsTrigger>
							<TabsTrigger
								value="css"
								className="px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-sm"
								onClick={() => setEditorSelected('css')}
							>
								CSS
							</TabsTrigger>
						</TabsList>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="flex items-center space-x-1 transition-all duration-200 ease-in-out hover:bg-muted"
								>
									<PaintBucket className="h-4 w-4"/>
									<span>Themes</span>
								</Button>
							</DropdownMenuTrigger>
							<AvailableThemes
								newTheme={newTheme}
								format={"dropdown"}
								selectedTheme={theme}
								setCurrentTheme={setTheme}
							/>
						</DropdownMenu>
					</div>
					<div className="flex items-center space-x-2">
						<Button
							onClick={() => setShowSaveDialog(true)}
							size="sm"
							variant="secondary"
							className="transition-all duration-200 ease-in-out hover:bg-muted"
						>
							<Save className="h-4 w-4 mr-1"/>
							Save
						</Button>
						<Button
							onClick={() => {
								handleWebChatWindow(htmlCode, cssCode, config, setDialogMessage, setShowConfirmDialog, setStartWebsocket, webChatWindowShown, setWebChatWindowShown, startWebsocket)
							}}
							size="sm"
							variant={startWebsocket ? "destructive" : "default"}
							className={`transition-all duration-200 ease-in-out ${startWebsocket ? "bg-red-600 hover:bg-red-700" : "bg-green-500 hover:bg-green-600"}`}
						>
							{startWebsocket ? (
								<>
									<Pause className="h-4 w-4 mr-1"/>
									Stop
								</>
							) : (
								<>
									<Play className="h-4 w-4 mr-1"/>
									Start
								</>
							)}
						</Button>
						<ConfigDropdown
							config={config}
							onConfigChange={(key, value) => handleConfigChange(key, value, setConfig)}
						/>
					</div>
				</div>
				<TabsContent value="html"
				             className={`flex-grow flex overflow-hidden p-0 h-screen ${editorSelected !== "html" ? "hidden" : ""}`}>
					<CodeMirror
						value={htmlCode}
						extensions={[html()]}
						onChange={(value) => setHtmlCode(value)}
						theme={dracula}
						className="flex-grow h-full w-full"
						height="100%"
					/>
				</TabsContent>
				<TabsContent value="css"
				             className={`flex-grow flex overflow-hidden p-0 h-screen ${editorSelected !== "css" ? "hidden" : ""}`}>
					<CodeMirror
						value={cssCode}
						extensions={[css()]}
						onChange={(value) => setCssCode(value)}
						theme={dracula}
						className="flex-grow h-full w-full"
						height="100%"
					/>
				</TabsContent>
			</Tabs>
		</>
	)
}
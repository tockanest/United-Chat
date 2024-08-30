import React, {useEffect, useState} from 'react'
import Tauri from "@/lib/Tauri";
import TauriApi from "@/lib/Tauri";
import Header from "@/components/component/Main/Header";
import {togglePreview} from "@/components/component/Main/Helpers/MainFrame";
import Editor from "@/components/component/Main/Editor";
import UnitedChatSettings from "@/pages/Settings";

export default function UnitedChat() {

	const [htmlCode, setHtmlCode] = useState<string>("");
	const [cssCode, setCssCode] = useState<string>('/* Add your custom CSS here */');
	const [currentPage, setCurrentPage] = useState<string>("editor")

	useEffect(() => {
		Tauri.GetUserInformation().then((user) => {
			if (user) {
				setUser(user)
			}
		})
	}, [])


	const [previewPosition, setPreviewPosition] = useState<PreviewPosition>('right')
	const [editorSize, setEditorSize] = useState<number>(85) // percentage
	const [showPreview, setShowPreview] = useState<boolean>(true)

	const [user, setUser] = useState<UserInformation | null>(null)
	const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false)
	const [triggerReloadAlert, setTriggerReloadAlert] = useState(false);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			switch (e.key) {
				case "s":
					if (e.metaKey || e.ctrlKey) {
						e.preventDefault(); // Prevent the default save (like Cmd+S / Ctrl+S)
						setShowSaveDialog(true);
					}
					break;
				case "p":
					if ((e.metaKey) || (e.ctrlKey)) {
						e.preventDefault(); // Prevent the default print (like Cmd+Shift+P / Ctrl+Shift+P)
						setShowPreview(!showPreview);
					}
					break;
				case "d":
					if ((e.metaKey && e.altKey) || (e.ctrlKey && e.altKey)) {
						e.preventDefault();
						setCurrentPage("settings");
					}
					break;
				case "r":
					if (e.ctrlKey) {
						e.preventDefault();
						const theme = localStorage.getItem('chatTheme') || 'default';
						TauriApi.CheckThemeBeforeReload(theme, htmlCode, cssCode).then((result) => {
							if (result) {
								return setTriggerReloadAlert(true);
							}

							window.location.reload()
						})
					}
					break;
				default:
					break;
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [showPreview, htmlCode, cssCode]);


	return (
		<div className="flex flex-col h-screen">
			<Header
				setPage={setCurrentPage}
				showPreview={showPreview}
				togglePreview={togglePreview}
				user={user}
				setShowPreview={setShowPreview}
				setEditorSize={setEditorSize}
			/>
			{
				currentPage === "editor" && (
					<Editor
						setPreviewPosition={setPreviewPosition}
						previewPosition={previewPosition}
						editorSize={editorSize}
						setEditorSize={setEditorSize}
						showPreview={showPreview}
						user={user}
						showSaveDialog={showSaveDialog}
						setShowSaveDialog={setShowSaveDialog}
						htmlCode={htmlCode}
						cssCode={cssCode}
						setHtmlCode={setHtmlCode}
						setCssCode={setCssCode}
						triggerReloadAlert={triggerReloadAlert}
						setTriggerReloadAlert={setTriggerReloadAlert}
					/>
				) ||
				currentPage === "settings" && (
					<UnitedChatSettings
						setPage={setCurrentPage}
						user={user}
					/>
				)
			}
		</div>
	)
}
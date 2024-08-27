import React, {useEffect, useState} from 'react'
import Tauri from "@/lib/Tauri";
import Header from "@/components/component/Main/Header";
import {togglePreview} from "@/components/component/Main/Helpers/MainFrame";
import Editor from "@/components/component/Main/Editor";
import UnitedChatSettings from "@/pages/Settings";

export default function UnitedChat() {

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

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			switch (e.key) {
				case "s":
					if (e.metaKey || e.ctrlKey) {
						e.preventDefault(); // Prevent the default save (like Cmd+S / Ctrl+S)
						console.log("Save");
						// Your save function here
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
				default:
					break;
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [showPreview])


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
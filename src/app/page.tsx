// src/app/page.tsx
'use client';

import {useState} from 'react';
import {useUser} from '@/providers/user';
import Header from '@/components/main/Header';
import EditorComponent from '@/components/main/Editor';

export default function MainPage() {
	const {user} = useUser();
	const [showPreview, setShowPreview] = useState(true);
	const [editorSize, setEditorSize] = useState(85);
	
	const togglePreview = (
		value: boolean,
		setShowPreview: (value: boolean) => void,
		setEditorSize: (value: number) => void,
		showPreview: boolean
	) => {
		setShowPreview(value);
		setEditorSize(value ? 85 : 100);
	};
	
	return (
		<div className="h-screen flex flex-col">
			<Header
				showPreview={showPreview}
				user={user}
				setShowPreview={setShowPreview}
				setEditorSize={setEditorSize}
			/>
			
			<div className="flex-1 overflow-hidden">
				<EditorComponent
					showPreview={showPreview}
					setShowPreview={setShowPreview}
				/>
			</div>
		</div>
	);
}
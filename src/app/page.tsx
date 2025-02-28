// src/app/page.tsx
'use client';

import {useState} from 'react';
import {useUser} from '@/providers/user';
import Header from '@/components/main/Header';
import EditorComponent from '@/components/main/Editor';

export default function MainPage() {
	const {user} = useUser();

	
	return (
		<div className="h-screen flex flex-col">
			<Header
				user={user}
			/>
			
			<div className="flex-1 overflow-hidden">
				<EditorComponent/>
			</div>
		</div>
	);
}
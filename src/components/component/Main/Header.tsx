'use client'

import React from "react"
import Link from "next/link"
import {EyeIcon, EyeOffIcon, LogOut, Settings, User, LogIn} from "lucide-react"
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar"
import {Button} from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type HeaderProps = {
	setPage: React.Dispatch<React.SetStateAction<string>>
	showPreview: boolean
	togglePreview: (
		value: boolean,
		setShowPreview: (value: boolean) => void,
		setEditorSize: (value: number) => void,
		showPreview: boolean
	) => void
	user: { login: string; internal_info: { profile_image_url: string; broadcaster_type: string } } | null
	setShowPreview: React.Dispatch<React.SetStateAction<boolean>>
	setEditorSize: React.Dispatch<React.SetStateAction<number>>
}

export default function Header({
	                               setPage,
	                               setEditorSize,
	                               setShowPreview,
	                               showPreview,
	                               togglePreview,
	                               user,
                               }: HeaderProps) {
	const logout = () => {
		localStorage.setItem("twitch_linked", "false")
		// Assuming TauriApi.Logout() is available in the global scope
		// @ts-ignore
		TauriApi.Logout()
	}
	
	return (
		<header className="border-b px-6 h-14 flex items-center justify-between w-full bg-background">
			<div className="flex items-center gap-8">
				<h1 className="text-xl font-semibold">United Chat</h1>
				<nav className="hidden sm:block">
					<ul className="flex gap-6">
						<li>
							<Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
								Docs
							</Link>
						</li>
						<li>
							<Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
								Examples
							</Link>
						</li>
					</ul>
				</nav>
			</div>
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => togglePreview(!showPreview, setShowPreview, setEditorSize, showPreview)}
					title={showPreview ? "Hide Preview" : "Show Preview"}
				>
					{showPreview ? <EyeOffIcon className="h-4 w-4"/> : <EyeIcon className="h-4 w-4"/>}
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
							<Avatar className="h-8 w-8">
								<AvatarImage src={user?.internal_info.profile_image_url || "/placeholder.svg"}
								             alt={user?.login || "User"}/>
								<AvatarFallback>{user?.login.charAt(0).toUpperCase() || "U"}</AvatarFallback>
							</Avatar>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent className="w-56" align="end" forceMount>
						<DropdownMenuLabel className="font-normal">
							<div className="flex flex-col space-y-1">
								<p className="text-sm font-medium leading-none">{user?.login || "Anonymous"}</p>
								<p className="text-xs leading-none text-muted-foreground">
									{
										//@ts-ignore
										user?.internal_info.broadcaster_type.charAt(0).toUpperCase() + user?.internal_info.broadcaster_type.slice(1) ||
										"Anonymous"}
								</p>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator/>
						<DropdownMenuGroup>
							<DropdownMenuItem>
								<User className="mr-2 h-4 w-4"/>
								<span>Profile</span>
							</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => setPage("settings")}>
								<Settings className="mr-2 h-4 w-4"/>
								<span>Settings</span>
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator/>
						{
							user && (
								<DropdownMenuItem className="text-destructive" onSelect={logout}>
									<LogOut className="mr-2 h-4 w-4"/>
									<span>Log out</span>
								</DropdownMenuItem>
							) || (
								<DropdownMenuItem className={"text-green-500 cursor-"} onSelect={() => setPage("settings")}>
									<LogIn className="mr-2 h-4 w-4"/>
									<span>Log in</span>
								</DropdownMenuItem>
							)
						}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	)
}
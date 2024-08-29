import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {EyeIcon, EyeOffIcon, LogOut, Settings, User} from "lucide-react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import React from "react";
import TauriApi from "@/lib/Tauri";

type HeaderProps = {
	setPage: React.Dispatch<React.SetStateAction<string>>,
	showPreview: boolean,
	togglePreview: (
		value: boolean,
		setShowPreview: (value: boolean) => void,
		setEditorSize: (value: number) => void,
		showPreview: boolean,
	) => void,
	user: UserInformation | null,
	setShowPreview: React.Dispatch<React.SetStateAction<boolean>>,
	setEditorSize: React.Dispatch<React.SetStateAction<number>>,
}

export default function Header(
	{
		setPage,
		setEditorSize,
		setShowPreview,
		showPreview,
		togglePreview,
		user
	}: HeaderProps
) {
	console.log(user)
	return (
		<header className="border-b px-4 py-2 flex items-center justify-between w-full">
			<div className="container flex items-center space-x-4">
				<div className="flex items-center space-x-4 w-full">
					<h1 className="text-2xl font-bold">United Chat</h1>
					<nav>
						<ul className="flex space-x-4">
							<li><a href="#" className="text-blue-600 hover:text-blue-800">Docs</a></li>
							<li><a href="#" className="text-blue-600 hover:text-blue-800">Examples</a></li>
						</ul>
					</nav>
				</div>
				<Button variant="outline" size="sm" onClick={() => {
					togglePreview(!showPreview, setShowPreview, setEditorSize, showPreview)
				}}>
					{showPreview ? <EyeOffIcon className="h-4 w-4 mr-2"/> : <EyeIcon className="h-4 w-4 mr-2"/>}
					{showPreview ? 'Hide Preview' : 'Show Preview'}
				</Button>
				{

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" className="relative h-10 w-10 rounded-full">
									<Avatar className="h-10 w-10">
										<AvatarImage src={user?.internal_info.profile_image_url || "Anonymous"} alt={user?.login || "Anonymous"}/>
										<AvatarFallback>{user?.login.charAt(0) || "A"}</AvatarFallback>
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
												(user?.internal_info.broadcaster_type.charAt(0).toUpperCase() + user?.internal_info.broadcaster_type.slice(1)) || "Anonymous"
											}
										</p>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator/>
								<DropdownMenuGroup>
									<DropdownMenuItem className={"cursor-pointer"}>
										<User className="mr-2 h-4 w-4"/>
										<span>Profile</span>
										<DropdownMenuShortcut className={"font-bold"}>⇧⌘P</DropdownMenuShortcut>
									</DropdownMenuItem>
									<DropdownMenuItem onClick={
										() => setPage("settings")
									} className={"cursor-pointer"}>
										<Settings className="mr-2 h-4 w-4"/>
										<span>Settings</span>
										<DropdownMenuShortcut className={"font-bold"}>⌘⎇D</DropdownMenuShortcut>
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator className={"bg-gray-600"}/>
								<DropdownMenuItem className="text-red-600 cursor-pointer" onClick={() => {
									localStorage.setItem("twitch_linked", "false");
									TauriApi.Logout();
								}}>
									<LogOut className="mr-2 h-4 w-4"/>
									<span>Log out</span>
									<DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

				}
			</div>
		</header>
	)
}
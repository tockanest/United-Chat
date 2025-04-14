// src/components/header/index.tsx
'use client';

import {
	ExternalLink,
	Github,
	HelpCircle,
	LogOut, PlayCircle,
	Settings,
	User2
} from "lucide-react";
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { TauriAPI } from '../../lib/tauri';
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "../ui/tooltip";

interface HeaderProps {
	user: User.Information | null;
}

export default function Header({ user }: HeaderProps) {
	const router = useRouter();

	return (
		<header className="border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
			<div className="flex h-14 items-center gap-4 px-4">
				<div className="flex items-center gap-2 select-none">
					<Image
						src={"/icons/logo.png"}
						alt={"United Chat Logo"}
						width={44}
						height={44}
						className="object-cover object-center cursor-pointer"
						onClick={() => {
							router.push("/");
						}}
					/>
					<span className="text-lg font-semibold">United Chat</span>
				</div>

				<Separator orientation="vertical" className="h-6" />

				<div className="flex-1 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => window.open('https://github.com/tockawaffle/United-Chat')}
										className="gap-2"
									>
										<Github className="h-4 w-4" />
										GitHub
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									View source code and documentation
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>

					<div className="flex items-center gap-2">
						<Button
							variant="default"
							size="sm"
							className="gap-2"
						>
							<PlayCircle className="h-4 w-4" />
							Start Chat
						</Button>

						<Button
							variant="outline"
							size="sm"
							className="gap-2"
						>
							<ExternalLink className="h-4 w-4" />
							Open WebChat
						</Button>

						<Separator orientation="vertical" className="h-6" />

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="relative h-8 w-8 rounded-full"
								>
									<Avatar className="h-8 w-8">
										<AvatarImage
											src={user?.internal_info.profile_image_url}
											alt={user?.login || "User"}
										/>
										<AvatarFallback>
											{user?.login?.[0]?.toUpperCase() || "U"}
										</AvatarFallback>
									</Avatar>
								</Button>
							</DropdownMenuTrigger>

							<DropdownMenuContent align="end" className="w-56">
								<DropdownMenuLabel className="font-normal">
									<div className="flex flex-col space-y-1">
										<p className="text-sm font-medium leading-none">
											{user?.login || "Anonymous"}
										</p>
										<p className="text-xs leading-none text-muted-foreground">
											{user?.internal_info.broadcaster_type
												? user.internal_info.broadcaster_type.charAt(0).toUpperCase() +
												user.internal_info.broadcaster_type.slice(1)
												: "Anonymous"}
										</p>
									</div>
								</DropdownMenuLabel>

								<DropdownMenuSeparator />

								<DropdownMenuGroup>
									<DropdownMenuItem className="gap-2">
										<User2 className="h-4 w-4" />
										Account Settings
									</DropdownMenuItem>
									<DropdownMenuItem className="gap-2" onClick={() => router.push('/settings')}>
										<Settings className="h-4 w-4" />
										Preferences
									</DropdownMenuItem>
									<DropdownMenuItem className="gap-2">
										<HelpCircle className="h-4 w-4" />
										Documentation
									</DropdownMenuItem>
								</DropdownMenuGroup>

								<DropdownMenuSeparator />

								<DropdownMenuItem
									className="gap-2 text-red-600 focus:text-red-600"
									onClick={() => {
										localStorage.setItem("united-chat:twitch-linked", "false");
										TauriAPI.Auth.logout();
									}}
								>
									<LogOut className="h-4 w-4" />
									Sign Out
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</div>
		</header>
	);
}
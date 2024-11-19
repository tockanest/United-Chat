import {Loader2Icon, MessageSquareIcon} from "lucide-react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

const LoadingState = () => (
	<Card className="w-96">
		<CardHeader className="text-center">
			<CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
				<MessageSquareIcon className="h-6 w-6"/>
				United Chat
			</CardTitle>
			<CardDescription>Connecting your conversations</CardDescription>
		</CardHeader>
		<CardContent className="flex flex-col items-center gap-4">
			<Loader2Icon className="h-12 w-12 animate-spin text-purple-600"/>
			<p className="text-center text-sm text-muted-foreground">
				Please wait while we set things up...
			</p>
			<p className="text-center text-xs text-muted-foreground">
				We're connecting to our servers and preparing your chat experience.
			</p>
		</CardContent>
	</Card>
);
import {useEffect, useState} from 'react'
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Loader2Icon, TwitchIcon, MessageSquareIcon} from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import TauriApi from "@/lib/Tauri";

export default function Component() {
    const [isLinking, setIsLinking] = useState(false)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)

    const [alreadyLinked, setAlreadyLinked] = useState(false)

    useEffect(() => {
        const isTwitchLinked = localStorage.getItem('twitch_linked') === 'true'
        if (isTwitchLinked) {
            setAlreadyLinked(true)
            TauriApi.FinishFrontendSetup().then(() => {
                console.log('Frontend setup complete')
            })
        }
    }, [])

    const handleLinkAccount = () => {
        setIsLinking(true)

        TauriApi.StartLinking().then((result) => {
            if (result) {
                TauriApi.OpenUrl(result);
            }
        })

        TauriApi.ListenEvent("splashscreen::twitch_auth", (event) => {
            const typedEvent = event.payload as boolean
            if (typedEvent) {
                setAlreadyLinked(true)
                localStorage.setItem('twitch_linked', 'true')
                TauriApi.FinishFrontendSetup().then(() => {
                    console.log('Frontend setup complete')
                })
            }
        })
    }

    const handleContinueWithoutAccount = () => {
        setShowConfirmDialog(true)
    }

    const handleConfirmContinueWithoutAccount = () => {
        setShowConfirmDialog(false)
        // Here you would handle continuing without an account
        TauriApi.SkipLinking().then((value) => {
            if (value) {
                setAlreadyLinked(true)
                localStorage.setItem('twitch_linked', 'true')
                TauriApi.FinishFrontendSetup().then(() => {
                    console.log('Frontend setup complete')
                })
            }
        })
    }

    return (
        <>
            {
                alreadyLinked ? (
                    <div
                        className="flex items-center justify-center min-h-screen bg-gradient-to-r from-purple-500 to-indigo-500">
                        <Card className="w-[350px]">
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
                    </div>
                ) : (
                    <div
                        className="flex items-center justify-center min-h-screen bg-gradient-to-r from-purple-500 to-indigo-500">
                        <Card className="w-[350px]">
                            <CardHeader className="text-center">
                                <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                                    <TwitchIcon className="h-6 w-6"/>
                                    Twitch Config
                                </CardTitle>
                                <CardDescription>Link your Twitch account to get started</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4">
                                <Button
                                    onClick={handleLinkAccount}
                                    disabled={isLinking}
                                    className="w-full"
                                >
                                    {isLinking ? (
                                        <>
                                            <Loader2Icon className="mr-2 h-4 w-4 animate-spin"/>
                                            Linking...
                                        </>
                                    ) : (
                                        'Link Twitch Account'
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleContinueWithoutAccount}
                                    className="w-full"
                                    disabled={isLinking}
                                >
                                    Continue without account
                                </Button>
                            </CardContent>
                        </Card>

                        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Continuing without linking your Twitch account may limit some features of the
                                        application.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleConfirmContinueWithoutAccount}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )
            }
        </>
    )
}
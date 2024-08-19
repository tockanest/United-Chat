import {useEffect, useState} from 'react'
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Loader2Icon, MessageSquareIcon, TwitchIcon} from 'lucide-react'
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
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import TauriApi from "@/lib/Tauri";

export default function Component() {
    const [isLinking, setIsLinking] = useState(false)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [showStreamerUrlDialog, setShowStreamerUrlDialog] = useState(false)
    const [streamerUrl, setStreamerUrl] = useState('')
    const [urlError, setUrlError] = useState('')

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
        setShowStreamerUrlDialog(true)
    }

    const validateUrl = (url: string) => {
        const twitchUrlRegex = /^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]+)$/
        return twitchUrlRegex.test(url)
    }

    const handleStreamerUrlSubmit = () => {
        if (validateUrl(streamerUrl)) {
            setUrlError('')
            setShowStreamerUrlDialog(false)
            TauriApi.SkipLinking().then((value) => {
                if (value) {
                    setAlreadyLinked(true)
                    localStorage.setItem('twitch_linked', 'true')
                    TauriApi.FinishFrontendSetup().then(() => {
                        console.log('Frontend setup complete')
                        // Here you would typically send the streamerUrl to your backend
                        console.log('Streamer URL:', streamerUrl)
                    })
                }
            })
        } else {
            setUrlError('Please enter a valid Twitch channel URL')
        }
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

                        <AlertDialog open={showStreamerUrlDialog} onOpenChange={setShowStreamerUrlDialog}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Enter Streamer URL</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Please provide the Twitch channel URL you want to listen to.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="streamer-url" className="text-right">
                                            URL
                                        </Label>
                                        <Input
                                            id="streamer-url"
                                            value={streamerUrl}
                                            onChange={(e) => setStreamerUrl(e.target.value)}
                                            className="col-span-3"
                                            placeholder="https://www.twitch.tv/channelname"
                                        />
                                    </div>
                                    {urlError && <p className="text-sm text-red-500">{urlError}</p>}
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleStreamerUrlSubmit}>Submit</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )
            }
        </>
    )
}
import TauriApi from "@/lib/Tauri";
import {Dispatch, SetStateAction} from "react";

function handleSelectAll(
	selectedStreams: string[],
	setSelectedStreams: Dispatch<SetStateAction<string[]>>,
	liveStreams: LiveStream[],
) {
	if (selectedStreams.length === liveStreams.length) {
		setSelectedStreams([])
	} else {
		setSelectedStreams(liveStreams.map(stream => stream.id))
	}
}

function handleSelectStream(
	id: string,
	selectedStreams: string[],
	setSelectedStreams: Dispatch<SetStateAction<string[]>>,
) {
	if (selectedStreams.includes(id)) {
		setSelectedStreams(selectedStreams.filter(streamId => streamId !== id))
	} else {
		setSelectedStreams([...selectedStreams, id])
	}
}

function handleRemoveSelected(
	selectedStreams: string[],
	setSelectedStreams: Dispatch<SetStateAction<string[]>>,
	liveStreams: LiveStream[],
	setLiveStreams: Dispatch<SetStateAction<LiveStream[]>>,
	toast: any,
) {
	const streamsToRemove = liveStreams.filter(stream => selectedStreams.includes(stream.id))
	const idsToRemove = streamsToRemove.map(stream => stream.id)

	idsToRemove.forEach(async (id) => {
		const removeStream = await TauriApi.DeleteVideo(id)
		if (!removeStream) {
			return toast({
				title: "Error",
				description: "An error occurred while removing the live stream.",
				variant: "destructive",
			})
		}
	})

	setLiveStreams(liveStreams.filter(stream => !idsToRemove.includes(stream.id)))
	setSelectedStreams([])
}

async function handleAddNewLive(
	newLiveStream: { url: string },
	liveStreams: LiveStream[],
	toast: any,
	setIsLoading: Dispatch<SetStateAction<boolean>>,
	setShowConfirmDialog: Dispatch<SetStateAction<boolean>>,
	setPendingVideo: Dispatch<SetStateAction<any>>,
	setLiveStreams: Dispatch<SetStateAction<LiveStream[]>>,
	setIsAddDialogOpen: Dispatch<SetStateAction<boolean>>,
	setNewLiveStream: Dispatch<SetStateAction<{ url: string }>>,
) {
	setIsLoading(true)
	try {
		const video = await TauriApi.GetVideo(newLiveStream.url)

		const liveStreamsCount = liveStreams.filter(stream => stream.status === 'live').length
		if (video.stream_type === 'live' && liveStreamsCount > 0) {
			setPendingVideo(video)
			setShowConfirmDialog(true)
			return
		}

		await addVideoToStreams(
			video,
			liveStreams,
			setLiveStreams,
			toast,
			setIsAddDialogOpen,
			setNewLiveStream,
		)
	} catch (err: any) {
		console.log(err)
		toast({
			title: "Error",
			description: (typeof err === 'string' ? err : err.error as string) || "An error occurred.",
			variant: "destructive",
		})
	} finally {
		setIsLoading(false)
	}
}

async function addVideoToStreams(
	video: any,
	liveStreams: LiveStream[],
	setLiveStreams: Dispatch<SetStateAction<LiveStream[]>>,
	toast: any,
	setIsAddDialogOpen: Dispatch<SetStateAction<boolean>>,
	setNewLiveStream: Dispatch<SetStateAction<{ url: string }>>,
) {

	const storeVideo = await TauriApi.StoreVideo(video)

	if (!storeVideo) {
		return toast({
			title: "Error",
			description: "An error occurred while adding the live stream.",
			variant: "destructive",
		})
	}

	setLiveStreams([
		...liveStreams,
		{
			id: video.video_id,
			name: video.video_name,
			scheduledTime: video.scheduled_start_time,
			status: video.stream_type,
		}
	])

	toast({
		title: "Success",
		description: "New live stream added successfully.",
	})

	setIsAddDialogOpen(false)
	setNewLiveStream({url: ''})
}

async function handleConfirmAddLive(
	pendingVideo: any,
	setPendingVideo: Dispatch<SetStateAction<any>>,
	setShowConfirmDialog: Dispatch<SetStateAction<boolean>>,
	liveStreams: LiveStream[],
	setLiveStreams: Dispatch<SetStateAction<LiveStream[]>>,
	toast: any,
	setIsAddDialogOpen: Dispatch<SetStateAction<boolean>>,
	setNewLiveStream: Dispatch<SetStateAction<{ url: string }>>,
) {
	if (pendingVideo) {
		await addVideoToStreams(pendingVideo, liveStreams, setLiveStreams, toast, setIsAddDialogOpen, setNewLiveStream)
		setPendingVideo(null)
	}
	setShowConfirmDialog(false)
}

export {
	handleSelectAll,
	handleSelectStream,
	handleRemoveSelected,
	handleAddNewLive,
	handleConfirmAddLive,
	addVideoToStreams,
}
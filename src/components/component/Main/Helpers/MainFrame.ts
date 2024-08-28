function togglePreview(
	value: boolean,
	setShowPreview: (value: boolean) => void,
	setEditorSize: (value: number) => void,
	showPreview: boolean,
) {
	setShowPreview(value)
	setEditorSize(value ? 85 : 100)
}

function getSeparatorStyle(
	previewPosition: PreviewPosition
) {
	const baseStyle = "flex items-center justify-center"
	switch (previewPosition) {
		case 'top':
		case 'bottom':
			return `${baseStyle} cursor-row-resize h-2 w-full`
		case 'left':
		case 'right':
			return `${baseStyle} cursor-col-resize w-2 z-0 h-full`
	}
}

function getLayoutIcon(position: PreviewPosition) {
	switch (position) {
		case 'right':
			return '→'
		case 'bottom':
			return '↓'
		case 'left':
			return '←'
		case 'top':
			return '↑'
	}
}

export {
	togglePreview,
	getSeparatorStyle,
	getLayoutIcon,
}
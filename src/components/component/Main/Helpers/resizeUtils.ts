// src/utils/resizeUtils.ts
import React, {useRef} from "react";

export const handleResize = (
	e: MouseEvent,
	isResizing: boolean,
	containerRef: React.RefObject<HTMLDivElement>,
	editorRef: React.RefObject<HTMLDivElement>,
	previewRef: React.RefObject<HTMLDivElement>,
	previewPosition: PreviewPosition,
) => {
	if (!isResizing || !containerRef.current || !editorRef.current || !previewRef.current) return;

	const container = containerRef.current;
	const containerRect = container.getBoundingClientRect();
	let newSize: number;

	if (previewPosition === 'left' || previewPosition === 'right') {
		const currentX = e.clientX - containerRect.left;
		newSize = previewPosition === 'left'
			? ((containerRect.width - currentX) / containerRect.width) * 100
			: (currentX / containerRect.width) * 100;
	} else {
		const currentY = e.clientY - containerRect.top;
		newSize = previewPosition === 'top'
			? ((containerRect.height - currentY) / containerRect.height) * 100
			: (currentY / containerRect.height) * 100;
	}

	newSize = Math.max(20, Math.min(newSize, 80));

	if (previewPosition === 'left' || previewPosition === 'right') {
		editorRef.current.style.width = `${newSize}%`;
		previewRef.current.style.width = `${100 - newSize}%`;
	} else {
		editorRef.current.style.height = `${newSize}%`;
		previewRef.current.style.height = `${100 - newSize}%`;
	}
};

export const handleResizeStart = (
	e: React.MouseEvent<HTMLDivElement>,
	setIsResizing: React.Dispatch<React.SetStateAction<boolean>>
) => {
	e.preventDefault();
	setIsResizing(true);
};

export const handleResizeEnd = (
	isResizing: boolean,
	setIsResizing: React.Dispatch<React.SetStateAction<boolean>>,
	editorRef: React.RefObject<HTMLDivElement>,
	containerRef: React.RefObject<HTMLDivElement>,
	previewPosition: PreviewPosition,
	setEditorSize: React.Dispatch<React.SetStateAction<number>>,
	setQuickResizeValue: React.Dispatch<React.SetStateAction<string>>,
	editorSize: number
) => {
	if (!isResizing) return;
	setIsResizing(false);

	if (editorRef.current && containerRef.current) {
		const editorRect = editorRef.current.getBoundingClientRect();
		const containerRect = containerRef.current.getBoundingClientRect();
		const newEditorSize = previewPosition === 'left' || previewPosition === 'right'
			? (editorRect.width / containerRect.width) * 100
			: (editorRect.height / containerRect.height) * 100;
		setEditorSize(newEditorSize);
		setQuickResizeValue(String(100 - newEditorSize));
	}

	setQuickResizeValue(String(100 - editorSize));
};

export function handleQuickResize(e: React.ChangeEvent<HTMLInputElement>, setQuickResizeValue: React.Dispatch<React.SetStateAction<string>>, setPendingResize: React.Dispatch<React.SetStateAction<boolean>>) {
	const value = e.target.value;
	if (value === '' || (Number(value) >= 15 && Number(value) <= 100)) {
		setQuickResizeValue(value);
		setPendingResize(true);
	}
};

export function handleQuickResizeBlur(
	quickResizeValue: string,
	setEditorSize: React.Dispatch<React.SetStateAction<number>>,
	setPendingResize: React.Dispatch<React.SetStateAction<boolean>>,
	pendingResize: boolean
) {
	if (pendingResize && quickResizeValue !== '') {
		setEditorSize(100 - Number(quickResizeValue));
		setPendingResize(false);
	}
}

export const useResizeRefs = () => {
	const resizeRef = useRef<HTMLDivElement>(null);
	const editorRef = useRef<HTMLDivElement>(null);
	const previewRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	return { resizeRef, editorRef, previewRef, containerRef };
};
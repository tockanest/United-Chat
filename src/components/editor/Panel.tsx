"use client";
import { usePanelConfig } from "@/lib/stores/config";
import { ResizableHandle, ResizablePanel } from "../ui/resizable";
import { ResizablePanelGroup } from "../ui/resizable";
import { EditorTabs } from "./EditorTabs";
import { PreviewPanel } from "./PreviewPanel";
import { useCallback, useMemo, useRef } from "react";

export default function Panel() {
    const config = usePanelConfig();
    const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Debounce the resize handler to improve performance
    const handleResize = useCallback((size: number) => {
        // Clear any existing timeout
        if (resizeTimeoutRef.current) {
            clearTimeout(resizeTimeoutRef.current);
        }
        
        // Schedule the update with a small delay to prevent excessive updates
        resizeTimeoutRef.current = setTimeout(() => {
            config.setConfigValue(["editor", "editorSize"], Math.round(size));
            resizeTimeoutRef.current = null;
        }, 50); // 50ms debounce
    }, [config]);

    // Move useMemo outside of JSX to ensure consistent hook order
    const memoizedPreviewPanel = useMemo(() => {
        return (
            <PreviewPanel 
                messages={config.messages} 
                preview={config.preview} 
                setConfigValue={config.setConfigValue} 
            />
        );
    }, [config.messages, config.preview, config.editor, config.setConfigValue]);

    return (
        <ResizablePanelGroup
            direction={config.preview.previewSide === 'right' ? 'horizontal' : 'vertical'}
            className="flex-1"
            style={{ contain: 'layout' }} // Added containment for better performance
        >
            <ResizablePanel
                id="editor-panel"
                order={1}
                defaultSize={config.editor.editorSize}
                minSize={30}
                onResize={handleResize}
                style={{ contain: 'content' }} // Added containment
            >
                <EditorTabs />
            </ResizablePanel>

            {config.preview.showPreview && (
                <>
                    <ResizableHandle withHandle />
                    <ResizablePanel
                        id="preview-panel"
                        order={2}
                        defaultSize={100 - config.editor.editorSize}
                        minSize={30}
                        style={{ contain: 'content' }} // Added containment
                    >
                        {memoizedPreviewPanel}
                    </ResizablePanel>
                </>
            )}
        </ResizablePanelGroup>
    )
}
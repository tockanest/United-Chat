import randomMessageObject from '@/lib/utils/editor/mock_messages';
import { replacePlaceholders } from '@/lib/utils/editor/replacePlaceholders';
import { MonitorPlay, RefreshCw } from 'lucide-react';
import dayjs from 'dayjs';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditorTheme } from '../../lib/stores/themes';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { usePanelConfig } from '@/lib/stores/config';

const PreviewHeader = memo(({ previewScale, onScaleChange, onScaleBlur, onScaleKeyDown, onRefresh }: {
    previewScale: number;
    onScaleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onScaleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
    onScaleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onRefresh: () => void;
}) => (
    <div className="border-b p-2 flex items-center justify-between bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
        <div className="flex items-center space-x-2">
            <MonitorPlay className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Preview</span>
        </div>
        <div className="flex items-center space-x-2">
            <Label htmlFor="scale" className="text-sm">
                Scale:
            </Label>
            <Input
                id="scale"
                type="number"
                value={previewScale}
                onChange={onScaleChange}
                onBlur={onScaleBlur}
                onKeyDown={onScaleKeyDown}
                className="w-20 h-8"
            />
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onRefresh}
            >
                <RefreshCw className="h-4 w-4" />
            </Button>
        </div>
    </div>
));

PreviewHeader.displayName = 'PreviewHeader';

type PreviewPanelProps = {
    messages: {
        scale: {
            scaling: boolean;
            scalingValue: number;
        };
        maxMessages: number;
    };
    preview: {
        showPreview: boolean;
        previewSide: "right" | "bottom" | "left" | "top";
        messageRemoveTimer: number;
        messageGenerationTimer: number;
        messageGenerationEnabled: boolean;
    };
    setConfigValue: <T, K extends keyof Editor.ConfigState>(path: [K, ...string[]], value: T) => void;
};

export const PreviewPanel = memo(function PreviewPanel({ messages, preview, setConfigValue }: PreviewPanelProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const messageContainerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [mockMessages, setMockMessages] = useState<Chat.Message[]>([]);
    const messageIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [transitionStyles, setTransitionStyles] = useState<string>('');
    const [tailwindStyles, setTailwindStyles] = useState<string>('');
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    const lastScrollTopRef = useRef(0);

    const { data: theme, isLoading: isThemeLoading } = useEditorTheme();

    // Cleanup function
    const cleanup = useCallback(() => {
        console.log('🧹 Starting cleanup process...');

        // Clear all intervals
        if (messageIntervalRef.current) {
            clearInterval(messageIntervalRef.current);
            messageIntervalRef.current = null;
            console.log('✓ Cleared message generation interval');
        }
        if (cleanupIntervalRef.current) {
            clearInterval(cleanupIntervalRef.current);
            cleanupIntervalRef.current = null;
            console.log('✓ Cleared message cleanup interval');
        }
        if (resizeTimeoutRef.current) {
            clearTimeout(resizeTimeoutRef.current);
            resizeTimeoutRef.current = null;
            console.log('✓ Cleared resize timeout');
        }

        // Clear messages
        setMockMessages([]);
        console.log('✓ Cleared message state');

        // Reset loading state
        setIsLoading(true);
        console.log('✓ Reset loading state');

        // Reset auto-scroll state
        setShouldAutoScroll(true);
        lastScrollTopRef.current = 0;
        console.log('✓ Reset scroll state');

        console.log('🧹 Cleanup complete');
    }, []);

    // Cleanup on unmount or when preview is hidden
    useEffect(() => {
        console.log('🔄 Preview visibility changed:', preview.showPreview ? 'shown' : 'hidden');

        // Initialize if preview is shown
        if (!preview.showPreview) {
            console.log('🚫 Preview hidden, running cleanup');
            cleanup();
            return;
        }

        return () => {
            console.log('👋 Preview component unmounting');
            cleanup();
        };
    }, [preview.showPreview, cleanup]);

    // Load styles - only when preview is shown
    useEffect(() => {
        if (!preview.showPreview) return;

        console.log('📦 Loading styles...');

        // Load transition styles
        fetch('/styles/webchat_transitions.css')
            .then(res => res.text())
            .then(css => {
                setTransitionStyles(css);
                console.log('✓ Loaded transition styles');
            })
            .catch(err => console.error('❌ Failed to load transition styles:', err));

        // Load Tailwind styles
        fetch('/styles/tailwind.js')
            .then(res => res.text())
            .then(js => {
                console.log('⚙️ Processing Tailwind styles...');
                const tempDiv = document.createElement('div');
                tempDiv.style.display = 'none';
                document.body.appendChild(tempDiv);

                const originalCreateElement = document.createElement.bind(document);
                const styleContents: string[] = [];

                document.createElement = (tagName: string, options?: ElementCreationOptions) => {
                    if (tagName === 'style') {
                        return {
                            ...originalCreateElement('style', options),
                            innerHTML: '',
                            appendChild: (node: Node) => {
                                if (node.textContent) {
                                    styleContents.push(node.textContent);
                                }
                            }
                        } as HTMLStyleElement;
                    }
                    return originalCreateElement(tagName, options);
                };

                const scriptFunc = new Function(js);
                scriptFunc();

                document.createElement = originalCreateElement;
                document.body.removeChild(tempDiv);

                setTailwindStyles(styleContents.join('\n'));
                console.log('✓ Processed and loaded Tailwind styles');
            })
            .catch(err => console.error('❌ Failed to load Tailwind styles:', err));

        return () => {
            console.log('🗑️ Cleaning up styles');
            setTransitionStyles('');
            setTailwindStyles('');
        };
    }, [preview.showPreview]);

    // Handle scroll events to detect user scrolling
    const handleScroll = useCallback(() => {
        if (!messageContainerRef.current) return;
        const container = messageContainerRef.current;
        
        // Calculate distance from bottom
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        
        // If scrolling up significantly (more than 10px from bottom)
        if (distanceFromBottom > 10) {
            setShouldAutoScroll(false);
        }
        
        // If near bottom (within 10px), re-enable auto-scroll
        if (distanceFromBottom <= 10) {
            setShouldAutoScroll(true);
        }
        
        lastScrollTopRef.current = container.scrollTop;
    }, []);

    // Auto-scroll handling
    const scrollToBottom = useCallback((smooth = true) => {
        if (!messageContainerRef.current || !shouldAutoScroll) return;
        
        const container = messageContainerRef.current;
        requestAnimationFrame(() => {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto'
            });
        });
    }, [shouldAutoScroll]);

    // Add scroll event listener with throttling
    useEffect(() => {
        const container = messageContainerRef.current;
        if (!container) return;

        let scrollTimeout: NodeJS.Timeout | null = null;
        const throttledScroll = () => {
            if (scrollTimeout) return;
            scrollTimeout = setTimeout(() => {
                handleScroll();
                scrollTimeout = null;
            }, 100); // Throttle to 100ms
        };

        container.addEventListener('scroll', throttledScroll);
        return () => {
            if (scrollTimeout) clearTimeout(scrollTimeout);
            container.removeEventListener('scroll', throttledScroll);
        };
    }, [handleScroll]);

    // Message cleanup logic
    const cleanupMessages = useCallback(() => {
        const now = dayjs();
        setMockMessages(prevMessages => {
            // First remove old messages
            const afterTimeCleanup = prevMessages.filter(msg => {
                const messageTime = msg.platform === "youtube"
                    ? dayjs(Number(msg.message.timestamp) / 1000)
                    : dayjs(msg.message.timestamp);
                return now.diff(messageTime, 'second') < preview.messageRemoveTimer;
            });

            // Then ensure we don't exceed max messages
            if (afterTimeCleanup.length > messages.maxMessages) {
                return afterTimeCleanup.slice(-messages.maxMessages);
            }
            return afterTimeCleanup;
        });
    }, [preview.messageRemoveTimer, messages.maxMessages]);

    // Message generation and cleanup
    useEffect(() => {
        if (!preview.showPreview || !preview.messageGenerationEnabled) {
            console.log('🛑 Message generation disabled or preview hidden');
            cleanup();
            return;
        }

        console.log('🎬 Starting message generation...');

        const addMessage = () => {
            const newMessage = randomMessageObject();
            setMockMessages(prev => {
                console.log(`📨 Adding message. Total messages: ${prev.length + 1}`);
                return [...prev, newMessage];
            });
            scrollToBottom();
        };

        // Add initial messages
        console.log(`📬 Adding initial messages (max: ${Math.min(5, messages.maxMessages)})`);
        for (let i = 0; i < Math.min(5, messages.maxMessages); i++) {
            addMessage();
        }
        setIsLoading(false);

        console.log('⏱️ Setting up intervals...');
        messageIntervalRef.current = setInterval(() => {
            console.log('🔄 Generating new message');
            addMessage();
        }, preview.messageGenerationTimer * 1000);

        cleanupIntervalRef.current = setInterval(() => {
            console.log('🧹 Running periodic message cleanup');
            cleanupMessages();
        }, 1000);

        return () => {
            console.log('🔚 Cleaning up message generation effect');
            cleanup();
        };
    }, [
        preview.showPreview,
        preview.messageGenerationEnabled,
        preview.messageGenerationTimer,
        messages.maxMessages,
        cleanupMessages,
        scrollToBottom,
        cleanup
    ]);

    const handleRefresh = useCallback(() => {
        console.log('🔄 Manual refresh triggered');
        cleanup();
        setTimeout(() => {
            setIsLoading(false);
            console.log('✓ Refresh complete');
        }, 100);
    }, [cleanup]);

    // Scale handling
    const handleScaleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '') {
            setConfigValue(["messages", "scale", "scalingValue"], 0);
            return;
        }
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
            setConfigValue(["messages", "scale", "scalingValue"], numValue);
        }
    }, [setConfigValue]);

    const handleScaleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        if (isNaN(value) || value < 50) {
            setConfigValue(["messages", "scale", "scalingValue"], 50);
        } else if (value > 150) {
            setConfigValue(["messages", "scale", "scalingValue"], 150);
        }
    }, [setConfigValue]);

    const handleScaleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const value = Number(e.currentTarget.value);
            if (isNaN(value) || value < 50) {
                setConfigValue(["messages", "scale", "scalingValue"], 50);
            } else if (value > 150) {
                setConfigValue(["messages", "scale", "scalingValue"], 150);
            }
        }
    }, [setConfigValue]);

    // Styles
    const containerStyle = useMemo(() => ({
        transform: `scale(${messages.scale.scalingValue / 100})`,
        transformOrigin: 'top left',
        willChange: 'transform',
        contain: 'content',
        width: '100%',
        height: '90%'
    }), [messages.scale.scalingValue]);

    const messageContainerStyle = useMemo(() => ({
        height: '100%',
        overflowY: 'auto' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '0',
        padding: '1rem'
    }), []);

    return (
        <div className="h-full flex flex-col" ref={containerRef}>
            <PreviewHeader
                previewScale={messages.scale.scalingValue}
                onScaleChange={handleScaleChange}
                onScaleBlur={handleScaleBlur}
                onScaleKeyDown={handleScaleKeyDown}
                onRefresh={handleRefresh}
            />
            <div className="flex-1 overflow-hidden relative">
                {(isLoading || isThemeLoading) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                )}
                <div style={containerStyle}>
                    <style>
                        {`
                        /* Base styles for preview content */
                        .preview-content {
                            position: relative;
                            z-index: 0;
                        }
                        .preview-content .message {
                            position: relative;
                            z-index: 1;
                        }
                        /* Tailwind styles scoped to preview content */
                        ${tailwindStyles ? `.preview-content { ${tailwindStyles} }` : ''}
                        /* Ensure transitions only apply to preview content */
                        ${transitionStyles ? `.preview-content { ${transitionStyles} }` : ''}
                        /* Scope theme styles to preview content */
                        ${theme?.theme_code?.css_code ? `.preview-content { ${theme.theme_code.css_code} }` : ''}
                        `}
                    </style>
                    <div
                        ref={messageContainerRef}
                        style={messageContainerStyle}
                        className="preview-content bg-transparent"
                    >
                        {mockMessages.map((msg, index) => (
                            <div
                                key={`${msg.message.id}-${index}`}
                                className="message fade-in flex items-start"
                                dangerouslySetInnerHTML={{
                                    __html: theme?.theme_code?.html_code
                                        ? replacePlaceholders(theme.theme_code.html_code, msg.message, msg.platform)
                                        : ''
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}); 
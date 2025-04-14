"use client";

import dayjs from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";
import randomMessageObject from "@/lib/utils/editor/mock_messages";
import { replacePlaceholders } from "@/lib/utils/editor/replacePlaceholders";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useChatConfig } from "@/lib/stores/config";


export default function WebChat() {


    const { theme, window: { config: { maxWidth, maxHeight, currentWidth, currentHeight } }, messages: { maxMessages, fadeOut, messageTransition, scale: { scaling, scalingValue } }, preview: { messageRemoveTimer, messageGenerationTimer } } = useChatConfig();

    function removeComments(html: string): string {
        return html.replace(/<!--[\s\S]*?-->/g, '');
    }

    const removalTimeSeconds = messageRemoveTimer * 1000;
    const generationTimeSeconds = messageGenerationTimer * 1000;
    const sanitizedTheme = removeComments(theme?.theme_code.html_code || "");

    useEffect(() => {
        const window = getCurrentWindow();
        if (!window) {
            console.warn("No window found on mock chat page");
            return;
        }

        // Prevent the window from closing before the state is updated
        window.onCloseRequested((e) => {
            e.preventDefault();

            window.emitTo("main", "chat-window-close", { type: "close_requested", window: window.label });

            // Wait for 1 second before destroying the window
            setTimeout(() => {
                window.destroy();
            }, 1000);
        })
    }, [])

    const [messages, setMessages] = useState<Chat.Message[]>([]);
    const fadeQueueRef = useRef<Set<string>>(new Set());
    const [messagesToRemove, setMessagesToRemove] = useState<Set<string>>(new Set());
    const [animationsCss, setAnimationsCss] = useState<string>('');

    // Add debug state
    const [debugInfo, setDebugInfo] = useState({
        fadeEnabled: fadeOut,
        queueSize: 0,
        messageCount: 0,
        lastCheck: ''
    });

    // Update debug info whenever messages change
    useEffect(() => {
        setDebugInfo(prev => ({
            ...prev,
            messageCount: messages.length
        }));
    }, [messages]);

    /**
     * Processes messages that need to be faded out and removed from the chat
     * This function handles two main scenarios:
     * 1. When messages exceed the limit: Removes oldest messages immediately
     * 2. When fadeOut is enabled: Applies fade animation before removal
     */
    const processFadeOutQueue = useCallback(async () => {
        console.log("Processing fade queue", {
            queueSize: fadeQueueRef.current.size,
            fadeOut,
            maxMessages,
            currentMessages: messages.length
        });

        // Remove messages if we're over the message limit
        if (messages.length > maxMessages) {
            const currentTime = dayjs();
            fadeQueueRef.current.forEach(id => {
                const message = messages.find(msg => msg.message.id === id);
                // Remove messages that have exceeded their display time
                if (message && currentTime.diff(dayjs(message.message.timestamp), 'seconds') >= removalTimeSeconds) {
                    console.log(`Removing message ${id} due to max messages limit`);
                    setMessages(prevMessages => prevMessages.filter(msg => msg.message.id !== id));
                    fadeQueueRef.current.delete(id);
                }
            });
        }

        // Process each message in the fade queue
        for (const id of fadeQueueRef.current) {
            if (!fadeOut) {
                console.log("Fade out disabled, skipping fade animation");
                continue;
            }
            console.log(`Starting fade animation for message ${id}`);

            // First apply the fade-out animation by setting fadingOut flag
            setMessages(prevMessages => prevMessages.map(msg =>
                msg.message.id === id ? { ...msg, fadingOut: true } : msg
            ));

            // Wait for fade animation to complete (3 seconds)
            await new Promise<void>(resolve => setTimeout(resolve, 3000));
            console.log(`Fade animation complete for message ${id}, removing message`);

            // Remove the message after animation completes
            setMessages(prevMessages => prevMessages.filter(msg => msg.message.id !== id));
            fadeQueueRef.current.delete(id);
        }
    }, [messages, fadeOut, maxMessages, removalTimeSeconds]);

    useEffect(() => {
        if (messagesToRemove.size > 0) {
            setMessages(prevMessages => prevMessages.filter(msg => !messagesToRemove.has(msg.message.id)));
            setMessagesToRemove(new Set());
        }
    }, [messagesToRemove]);

    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            const currentTime = dayjs();

            setDebugInfo(prev => ({
                ...prev,
                fadeEnabled: fadeOut,
                queueSize: fadeQueueRef.current.size,
                lastCheck: currentTime.format('HH:mm:ss')
            }));

            setMessages(prevMessages => {
                const updatedMessages = prevMessages.map(msg => {
                    if (!msg.message.timestamp) return msg;

                    const messageTime = msg.platform === "youtube"
                        ? dayjs(Number(msg.message.timestamp) / 1000)
                        : dayjs(msg.message.timestamp);

                    const timeDiff = currentTime.diff(messageTime, 'seconds');
                    console.log('Message age check:', {
                        messageId: msg.message.id,
                        age: timeDiff,
                        threshold: removalTimeSeconds / 1000
                    });

                    if (fadeOut && timeDiff >= removalTimeSeconds / 1000) {
                        fadeQueueRef.current.add(msg.message.id);
                        return { ...msg, fadingOut: true };
                    }

                    return msg;
                });

                // Remove messages that have completed fading
                const filteredMessages = updatedMessages.filter(msg => {
                    if (!msg.fadingOut) return true;

                    const messageTime = msg.platform === "youtube"
                        ? dayjs(Number(msg.message.timestamp) / 1000)
                        : dayjs(msg.message.timestamp);
                    const timeDiff = currentTime.diff(messageTime, 'seconds');

                    // Remove after fade animation duration (2s) + removal time
                    const shouldRemove = timeDiff >= (removalTimeSeconds / 1000 + 2);
                    if (shouldRemove) {
                        fadeQueueRef.current.delete(msg.message.id);
                    }
                    return !shouldRemove;
                });

                return filteredMessages;
            });
        }, 1000); // Check every second instead of waiting for removal time

        return () => {
            clearInterval(cleanupInterval);
        };
    }, [fadeOut, removalTimeSeconds]);

    useEffect(() => {
        if (messages.length > maxMessages) {
            const oldestMessageId = messages[0].message.id;
            setMessages(prevMessages => prevMessages.slice(1));
            fadeQueueRef.current.delete(oldestMessageId);
        }
    }, [messages, maxMessages]);

    useEffect(() => {
        const messageInterval = setInterval(() => {
            const newMessage = randomMessageObject();
            setMessages((prevMessages) => {
                const updatedMessages = [...prevMessages, newMessage];
                console.log('Messages updated:', updatedMessages.length);
                return updatedMessages;
            });
        }, generationTimeSeconds);

        document.body.style.backgroundColor = 'transparent';

        fetch('/styles/webchat_transitions.css')
            .then(res => res.text())
            .then(css => setAnimationsCss(css));

        return () => {
            clearInterval(messageInterval);
        }
    }, [generationTimeSeconds])

    return (
        <div
            className="bg-transparent flex flex-col overflow-y-auto relative"
            style={{
                width: `${currentWidth}px`,
                height: `${currentHeight}px`,
                maxHeight: `${maxHeight}px`,
                maxWidth: `${maxWidth}px`,
                ...(scaling && scalingValue ? { transform: `scale(${scalingValue})` } : {})
            }}
        >
            {/* Debug overlay */}
            <div
                style={{
                    position: 'fixed',
                    top: '10px',
                    right: '10px',
                    background: '#1a1b1e',
                    color: '#e2e8f0',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    zIndex: 9999,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    border: '1px solid #2d2e32',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                    transition: 'opacity 0.2s ease-in-out',
                    maxWidth: '200px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.85'}
            >
                <div style={{ marginBottom: '8px', color: '#a78bfa', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
                    Debug Info
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                    <div>
                        <span style={{ color: '#9ca3af' }}>Fade Out:</span>{' '}
                        <span style={{ color: fadeOut ? '#34d399' : '#f87171' }}>{fadeOut ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div>
                        <span style={{ color: '#9ca3af' }}>Queue Size:</span>{' '}
                        <span style={{ color: '#60a5fa' }}>{debugInfo.queueSize}</span>
                    </div>
                    <div>
                        <span style={{ color: '#9ca3af' }}>Messages:</span>{' '}
                        <span style={{ color: '#60a5fa' }}>{debugInfo.messageCount}</span>
                    </div>
                    <div>
                        <span style={{ color: '#9ca3af' }}>Remove After:</span>{' '}
                        <span style={{ color: '#f59e0b' }}>{removalTimeSeconds / 1000}s</span>
                    </div>
                    {debugInfo.lastCheck && (
                        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                            Last Check: {debugInfo.lastCheck}
                        </div>
                    )}
                </div>
            </div>

            <script src="/styles/tailwind.js"></script>
            <style>{animationsCss}</style>
            <style>{theme?.theme_code.css_code || ""}</style>
            <div
                id={"message-container"}
                className="bg-transparent">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`message fade-in flex items-start ${msg.fadingOut ? 'fade-out' : ''} ${messageTransition === 'slide-from-right' ? 'slide-from-right' :
                            messageTransition === 'slide-from-bottom' ? 'slide-from-bottom' :
                                messageTransition === "typewriter" ? "typewriter" : ''
                            }`}
                        dangerouslySetInnerHTML={{ __html: replacePlaceholders(sanitizedTheme, msg.message, msg.platform) }}
                    />
                ))}
            </div>
        </div>
    );
}
import { atom, useAtom, useAtomValue } from "jotai";
import { atomWithStorage, selectAtom } from "jotai/utils";

import { z } from "zod";
import { toast } from "sonner";
import { useCallback } from "react";
import { getAllWindows } from "@tauri-apps/api/window";
import { useEditorTheme } from "./themes";
export const EDITOR_CONFIG_KEY = 'editorConfig';

export function configErrorReporting(error: ConfigError): void {
    switch (error.type) {
        case "parsing_error":
            toast.error("Invalid Configuration: Parsing Error", {
                description: `${error.message}\nIf you wish to reset the configuration, click the button below.`,
                duration: 10000,
                position: "bottom-right",
                action: {
                    label: "Reset Configuration",
                    onClick: () => {
                        localStorage.removeItem(EDITOR_CONFIG_KEY);
                    }
                }
            });
            break;
        case "validation_error":
            toast.error("Invalid Configuration: Validation Error", {
                description: `${error.message}\nIf you wish to reset the configuration, click the button below.`,
                duration: 10000,
                position: "bottom-right",
                action: {
                    label: "Reset Configuration",
                    onClick: () => {
                        localStorage.removeItem(EDITOR_CONFIG_KEY);
                    }
                }
            });
            break;
        case "storage_error":
            toast.error("Invalid Configuration: Storage Error", {
                description: `${error.message}\nIf you wish to reset the configuration, click the button below.`,
                duration: 10000,
                position: "bottom-right",
                action: {
                    label: "Reset Configuration",
                    onClick: () => {
                        localStorage.removeItem(EDITOR_CONFIG_KEY);
                    }
                }
            });
            break;
        case "unknown":
            toast.error("An unknown error occurred. Please report this to the developer.", {
                duration: 10000,
                position: "bottom-right",
                action: {
                    label: "Report Issue (Copy to Clipboard)",
                    onClick: () => {
                        // Copy error to clipboard
                        navigator.clipboard.writeText(`Message: ${error.message}\nStack: ${error.stack}`);
                        window.open("https://github.com/tockanest/united-chat/issues", "_blank");
                    }
                }
            });
            break;
    }
}

export const configSchema = z.object({
    window: z.object({
        focusState: z.enum(["focused", "unfocused"]).default("focused"),
        config: z.object({
            maxWidth: z.number().default(800),
            maxHeight: z.number().default(600),
            currentWidth: z.number().default(800),
            currentHeight: z.number().default(600),
        }).default({}),
        windows: z.object({
            main_running: z.boolean().default(false), // This represents the main webchat window, labeled "webchat"
            preview_running: z.boolean().default(false), // This represents the preview window, labeled "mock-chat"
            cleanup_started: z.boolean().default(false),
        }).default({}),
    }).default({}),
    messages: z.object({
        scale: z.object({
            scaling: z.boolean().default(false),
            scalingValue: z.number().default(100),
        }).default({}),
        messageTransition: z.enum(["slide-from-right", "slide-from-bottom", "typewriter", "none"]).default("none"),
        fadeOut: z.boolean().default(false),
        maxMessages: z.number().default(10),
    }).default({}),
    preview: z.object({
        showPreview: z.boolean().default(true),
        previewSide: z.enum(["right", "bottom", "left", "top"]).default("right"),
        messageRemoveTimer: z.number().default(5),
        messageGenerationTimer: z.number().default(5),
        messageGenerationEnabled: z.boolean().default(true),
    }).default({}),
    editor: z.object({
        editorSize: z.number().default(50),
    }).default({}),
})

export type ConfigError =
    | { type: "parsing_error", message: string, stack?: string }
    | { type: "validation_error", message: string, stack?: string }
    | { type: "storage_error", message: string, stack?: string }
    | { type: "unknown", message: string, stack?: string }

const baseConfigAtom = atomWithStorage<Editor.ConfigState>(
    EDITOR_CONFIG_KEY,
    configSchema.parse({}),
    {
        getItem(key) {
            try {
                const item = localStorage.getItem(key);
                if (!item) return configSchema.parse({});

                const result = configSchema.safeParse(JSON.parse(item));

                if (!result.success) {
                    configErrorReporting({
                        type: "parsing_error",
                        message: `Failed to retrieve configuration, using default values.`,
                        stack: `${result.error.message}\n${result.error.stack}`,
                    });
                    return configSchema.parse({});
                }

                return result.data;
            } catch (error) {
                configErrorReporting({
                    type: "storage_error",
                    message: `Failed to retrieve configuration, using default values.`,
                    stack: `${error}`,
                });
                return configSchema.parse({});
            }
        },
        setItem: (key, value) => {
            const result = configSchema.safeParse(value)
            if (!result.success) {
                configErrorReporting({
                    type: "validation_error",
                    message: result.error.message
                })
                return
            }
            localStorage.setItem(key, JSON.stringify(value))
        },
        removeItem: (key) => {
            localStorage.removeItem(key)
        },
    },
    {
        getOnInit: true,
    }
)

export const panelConfigAtom = selectAtom(
    baseConfigAtom,
    (config) => ({
        messages: {
            scale: config.messages.scale,
        },
        preview: config.preview,
        editor: config.editor,
    })
)

export const focusStateConfig = (): {
    focusState: "focused" | "unfocused";
    cleanupStarted: boolean;
    setConfigValue: <T, K extends keyof Editor.ConfigState>(path: [K, ...string[]], value: T) => void;
} => {
    const [atom, setConfig] = useAtom(baseConfigAtom);

    const setConfigValue = useCallback(
        <T, K extends keyof Editor.ConfigState>(path: [K, ...string[]], value: T) => {
            setConfig((prevConfig) => {
                // Create a deep copy of the previous config
                const newConfig = JSON.parse(JSON.stringify(prevConfig));
                let current: any = newConfig;

                // Traverse the path to set the new value
                for (const key of path.slice(0, -1)) {
                    current = current[key];
                }
                current[path[path.length - 1]] = value;

                // Validate the updated config
                const configResult = configSchema.safeParse(newConfig);
                if (!configResult.success) {
                    configErrorReporting({
                        type: "validation_error",
                        message: configResult.error.message,
                    });
                    return prevConfig; // Return previous state on validation failure
                }

                return configResult.data; // Update state with validated config
            });
        },
        [setConfig]
    );

    return {
        focusState: atom.window.focusState,
        cleanupStarted: atom.window.windows.cleanup_started,
        setConfigValue,
    }
}

export function usePanelConfig(): {
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
    editor: {
        editorSize: number;
    };
    setConfigValue: <T, K extends keyof Editor.ConfigState>(path: [K, ...string[]], value: T) => void;
} {
    const [atom, setConfig] = useAtom(baseConfigAtom);

    const setConfigValue = useCallback(
        <T, K extends keyof Editor.ConfigState>(path: [K, ...string[]], value: T) => {
            setConfig((prevConfig) => {
                // Create a deep copy of the previous config
                const newConfig = JSON.parse(JSON.stringify(prevConfig));
                let current: any = newConfig;

                // Traverse the path to set the new value
                for (const key of path.slice(0, -1)) {
                    current = current[key];
                }
                current[path[path.length - 1]] = value;

                // Validate the updated config
                const configResult = configSchema.safeParse(newConfig);
                if (!configResult.success) {
                    configErrorReporting({
                        type: "validation_error",
                        message: configResult.error.message,
                    });
                    return prevConfig; // Return previous state on validation failure
                }

                return configResult.data; // Update state with validated config
            });
        },
        [setConfig]
    );

    return {
        messages: {
            scale: atom.messages.scale,
            maxMessages: atom.messages.maxMessages,
        },
        preview: atom.preview,
        editor: {
            editorSize: atom.editor.editorSize,
        },
        setConfigValue,
    }
}

export const useEditorTabsConfig = (): {
    editorTabsConfig: {
        editorSize: number;
    };
    setConfigValue: <T, K extends keyof Editor.ConfigState>(path: [K, ...string[]], value: T) => void;
} => {
    const [atom, setConfig] = useAtom(baseConfigAtom);

    const setConfigValue = useCallback(
        <T, K extends keyof Editor.ConfigState>(path: [K, ...string[]], value: T) => {
            setConfig((prevConfig) => {
                // Create a deep copy of the previous config
                const newConfig = JSON.parse(JSON.stringify(prevConfig));
                let current: any = newConfig;

                // Traverse the path to set the new value
                for (const key of path.slice(0, -1)) {
                    current = current[key];
                }
                current[path[path.length - 1]] = value;

                // Validate the updated config
                const configResult = configSchema.safeParse(newConfig);
                if (!configResult.success) {
                    configErrorReporting({
                        type: "validation_error",
                        message: configResult.error.message,
                    });
                    return prevConfig; // Return previous state on validation failure
                }

                return configResult.data; // Update state with validated config
            });
        },
        [setConfig]
    );

    return {
        editorTabsConfig: {
            editorSize: atom.editor.editorSize,
        },
        setConfigValue,
    }
}

export const useHeaderConfig = (): {
    window: z.infer<typeof configSchema>["window"];
    messages: z.infer<typeof configSchema>["messages"];
    preview: z.infer<typeof configSchema>["preview"];
    editor: z.infer<typeof configSchema>["editor"];
    setConfigValue: <T, K extends keyof Editor.ConfigState>(path: [K, ...string[]], value: T) => void;
} => {
    const [config, setConfig] = useAtom(baseConfigAtom);

    const setConfigValue = useCallback(
        <T, K extends keyof Editor.ConfigState>(path: [K, ...string[]], value: T) => {
            setConfig((prevConfig) => {
                // Create a deep copy of the previous config
                const newConfig = JSON.parse(JSON.stringify(prevConfig));
                let current: any = newConfig;

                // Traverse the path to set the new value
                for (const key of path.slice(0, -1)) {
                    current = current[key];
                }
                current[path[path.length - 1]] = value;

                // Validate the updated config
                const configResult = configSchema.safeParse(newConfig);
                if (!configResult.success) {
                    configErrorReporting({
                        type: "validation_error",
                        message: configResult.error.message,
                    });
                    return prevConfig; // Return previous state on validation failure
                }

                return configResult.data; // Update state with validated config
            });
        },
        [setConfig]
    );

    return {
        ...config,
        setConfigValue,
    }
}

export const useFocusState = (): "focused" | "unfocused" => {
    const config = useAtomValue(baseConfigAtom);

    return config.window.focusState;
}

export const useMockChatConfig = (): {
    setConfigValue: <T, K extends keyof Editor.ConfigState>(path: [K, ...string[]], value: T) => void;
} => {
    const [_, setConfig] = useAtom(baseConfigAtom);

    const setConfigValue = useCallback(
        <T, K extends keyof Editor.ConfigState>(path: [K, ...string[]], value: T) => {
            setConfig((prevConfig) => {
                // Create a deep copy of the previous config
                const newConfig = JSON.parse(JSON.stringify(prevConfig));
                let current: any = newConfig;

                // Traverse the path to set the new value
                for (const key of path.slice(0, -1)) {
                    current = current[key];
                }
                current[path[path.length - 1]] = value;

                // Validate the updated config
                const configResult = configSchema.safeParse(newConfig);
                if (!configResult.success) {
                    configErrorReporting({
                        type: "validation_error",
                        message: configResult.error.message,
                    });
                    return prevConfig; // Return previous state on validation failure
                }

                return configResult.data; // Update state with validated config
            });
        },
        [setConfig]
    );

    return {
        setConfigValue,
    }
}

export const useCleanupManager = () => {
    const [config, setConfig] = useAtom(baseConfigAtom);
    const setConfigValue = useCallback(
        <T, K extends keyof Editor.ConfigState>(path: [K, ...string[]], value: T) => {
            setConfig((prevConfig) => {
                const newConfig = JSON.parse(JSON.stringify(prevConfig));
                let current: any = newConfig;
                for (const key of path.slice(0, -1)) {
                    current = current[key];
                }
                current[path[path.length - 1]] = value;
                return configSchema.parse(newConfig);
            });
        },
        [setConfig]
    );

    const resetWindowState = useCallback(async () => {
        // Reset window states first
        setConfigValue(["window", "windows", "main_running"], false);
        setConfigValue(["window", "windows", "preview_running"], false);

        // Reset focus state
        setConfigValue(["window", "focusState"], "focused");

        // Set cleanup started last to prevent race conditions
        setConfigValue(["window", "windows", "cleanup_started"], true);

        return true;
    }, [setConfigValue]);

    const cleanupWindows = useCallback(async () => {
        try {
            const windows = await getAllWindows();

            // Close all windows except the main window
            for (const window of windows) {
                if (window.label !== "main") {
                    await window.destroy();
                }
            }

            // Reset window states after cleanup
            await resetWindowState();

            return true;
        } catch (error) {
            console.error("Error during window cleanup:", error);
            return false;
        }
    }, [resetWindowState]);

    const finishCleanup = useCallback(() => {
        setConfigValue(["window", "windows", "cleanup_started"], false);
    }, [setConfigValue]);

    return {
        cleanupWindows,
        resetWindowState,
        finishCleanup,
        isCleanupStarted: config.window.windows.cleanup_started,
    };
};

export const useChatConfig = () => {
    const [config, setConfig] = useAtom(baseConfigAtom);

    const setConfigValue = useCallback(
        <T, K extends keyof Editor.ConfigState>(path: [K, ...string[]], value: T) => {
            setConfig((prevConfig) => {
                // Create a deep copy of the previous config
                const newConfig = JSON.parse(JSON.stringify(prevConfig));
                let current: any = newConfig;

                // Traverse the path to set the new value
                for (const key of path.slice(0, -1)) {
                    current = current[key];
                }
                current[path[path.length - 1]] = value;

                // Validate the updated config
                const configResult = configSchema.safeParse(newConfig);
                if (!configResult.success) {
                    configErrorReporting({
                        type: "validation_error",
                        message: configResult.error.message,
                    });
                    return prevConfig; // Return previous state on validation failure
                }

                return configResult.data; // Update state with validated config
            });
        },
        [setConfig]
    );

    const {
        data: theme,
    } = useEditorTheme();

    return {
        ...config,
        setConfigValue,
        theme,
    }
}
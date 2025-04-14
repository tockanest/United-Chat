import { TauriAPI } from '@/lib/tauri';

import {
    AlertTriangle,
    AppWindowMac,
    EyeIcon,
    EyeOffIcon,
    LayoutPanelLeft,
    LayoutPanelTop,
    Loader2,
    Play,
    Save,
    Settings2
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Button } from '../ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { Separator } from '../ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../ui/tooltip";
import { ThemeSelector } from './ThemeSelector';
import { useHeaderConfig } from '@/lib/stores/config';
import { useEditorTheme } from '@/lib/stores/themes';
import { toast } from 'sonner';

export default function Header() {
    const config = useHeaderConfig();

    const {
        window,
        messages,
        preview,
    } = config;

    const {
        windows
    } = window;

    const {
        data: theme,
        isLoading: themeLoading,
        isError: themeError,
    } = useEditorTheme();

    const handleConfigChange = useCallback(<T extends any>(path: [keyof Editor.ConfigState, ...string[]], value: T) => {
        config.setConfigValue(path, value);
    }, [config.setConfigValue]);

    const openMockChatWindow = useCallback(async () => {
        try {
            if (!windows.preview_running) {
                // First, attempt to open the preview window
                await TauriAPI.Chat.openMockChatWindow({
                    url: "http://localhost:3000/mock-chat"
                });
                // Only after successfully opening the window, update the state
                handleConfigChange(["window", "windows", "preview_running"], true);
                console.log("Preview window opened");
            } else {
                // When closing, update the state before attempting to close the window
                handleConfigChange(["window", "windows", "preview_running"], false);
                await TauriAPI.Chat.closeMockChatWindow();
                console.log("Preview window closed");
            }
        } catch (error) {
            console.group("Preview Window Function - Error")
                console.log("%cCould not open preview window, please try again.", "color: red; font-weight: bold;")
                console.log("%cStack:", "color: red; font-weight: bold;", error)
            console.groupEnd()

            handleConfigChange(["window", "windows", "preview_running"], false); // Rollback the state
            toast.error("Failed to open preview window, please try again.")
        }
    }, [theme, config, windows.preview_running, handleConfigChange]);

    const handleSave = useCallback(async (themeToSave: Editor.ThemeInfo) => {
        try {
            const { success, error } = await TauriAPI.Theme.saveTheme(
                themeToSave.theme_code.html_code,
                themeToSave.theme_code.css_code,
                themeToSave.name,
                themeToSave.has_parent.parent ?? ""
            );

            if (!success) {
                toast.error(error ?? "Failed to save theme, please try again.")
            }

            toast.success("Theme saved successfully.")
            return;
        } catch (error) {
            console.group("Theme Save Function - Error")
                console.log("%cCould not save theme, please try again.", "color: red; font-weight: bold;")
                console.log("%cStack:", "color: red; font-weight: bold;", error)
            console.groupEnd()

            handleConfigChange(["window", "windows", "preview_running"], false); // Rollback the state
            toast.error("Failed to save theme, please try again.")
        }
    }, []);

    useEffect(() => {
        const tauriWindow = getCurrentWindow();

        tauriWindow.listen("chat-window-close", (event) => {
            const { type, window: windowLabel } = event.payload as { type: string, window: string };
            if (type === "close_requested" && windowLabel === "preview") {
                handleConfigChange(["window", "windows", "preview_running"], false);
            }
        });
    }, []);

    const SettingsContent = useMemo(() => {
        return (
            <DropdownMenuContent className="w-96">
                <DropdownMenuLabel>Chat Settings</DropdownMenuLabel>
                <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <p className="text-sm text-destructive">
                            Some of these configurations might not get applied on the preview frame. For a full preview please click on the <span className="font-semibold">Open Preview Window</span> button.
                        </p>
                    </div>
                </div>
                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-sm">Message Settings</DropdownMenuLabel>
                    <DropdownMenuItem className="grid grid-cols-2 items-center gap-4 focus:bg-transparent" onClick={(e) => e.preventDefault()}>
                        <Label htmlFor="maxMessages">Max Messages</Label>
                        <Input
                            id="maxMessages"
                            type="number"
                            value={messages.maxMessages}
                            onChange={(e) => handleConfigChange(["messages", "maxMessages"], Number(e.target.value))}
                            min={1}
                            max={100}
                            className="h-8"
                        />
                    </DropdownMenuItem>
                    <DropdownMenuItem className="grid grid-cols-2 items-center gap-4 focus:bg-transparent" onClick={(e) => e.preventDefault()}>
                        <Label htmlFor="messageTimer">Remove Timer (s)</Label>
                        <Input
                            id="messageTimer"
                            type="number"
                            value={preview.messageRemoveTimer}
                            onChange={(e) => handleConfigChange(["preview", "messageRemoveTimer"], Number(e.target.value))}
                            min={1}
                            max={60}
                            className="h-8"
                        />
                    </DropdownMenuItem>
                    <DropdownMenuItem className="grid grid-cols-2 items-center gap-4 focus:bg-transparent" onClick={(e) => e.preventDefault()}>
                        <Label htmlFor="messageGenerationTimer">Message Generation Timer (s)</Label>
                        <Input
                            id="messageGenerationTimer"
                            type="number"
                            value={preview.messageGenerationTimer}
                            onChange={(e) => handleConfigChange(["preview", "messageGenerationTimer"], Number(e.target.value))}
                            min={1}
                            max={60}
                            className="h-8"
                        />
                    </DropdownMenuItem>
                    <DropdownMenuItem className="grid grid-cols-2 items-center gap-4 focus:bg-transparent" onClick={(e) => e.preventDefault()}>
                        <Label htmlFor="transition">Message Transition</Label>
                        <Select
                            value={messages.messageTransition}
                            onValueChange={(value) => handleConfigChange(["messages", "messageTransition"], value as Editor.AvailableMessageTransitions)}
                        >
                            <SelectTrigger id="transition" className="h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="slide-from-right">Slide from right</SelectItem>
                                <SelectItem value="slide-from-bottom">Slide from bottom</SelectItem>
                                <SelectItem value="typewriter">Typewriter</SelectItem>
                            </SelectContent>
                        </Select>
                    </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                    <div className="flex items-center justify-between px-2 py-1.5">
                        <DropdownMenuLabel className="text-sm p-0">Scaling</DropdownMenuLabel>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleConfigChange(["messages", "scale", "scaling"], !messages.scale.scaling)}
                        >
                            {messages.scale.scaling ? "Disable" : "Enable"}
                        </Button>
                    </div>
                    {messages.scale.scaling && (
                        <DropdownMenuItem className="grid grid-cols-2 items-center gap-4 focus:bg-transparent" onClick={(e) => e.preventDefault()}>
                            <Label htmlFor="scalingValue">Scale Factor</Label>
                            <Input
                                id="scalingValue"
                                type="number"
                                value={messages.scale.scalingValue}
                                onChange={(e) => handleConfigChange(["messages", "scale", "scalingValue"], Number(e.target.value))}
                                min={0.1}
                                max={2}
                                step={0.1}
                                className="h-8"
                            />
                        </DropdownMenuItem>
                    )}
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-sm">Size Constraints</DropdownMenuLabel>
                    <DropdownMenuItem className="grid grid-cols-2 items-center gap-4 focus:bg-transparent" onClick={(e) => e.preventDefault()}>
                        <Label htmlFor="maxWidth">Max Width (px)</Label>
                        <Input
                            id="maxWidth"
                            type="number"
                            value={window.config.maxWidth}
                            onChange={(e) => handleConfigChange(["window", "maxWidth"], Number(e.target.value))}
                            min={200}
                            max={2000}
                            className="h-8"
                        />
                    </DropdownMenuItem>
                    <DropdownMenuItem className="grid grid-cols-2 items-center gap-4 focus:bg-transparent" onClick={(e) => e.preventDefault()}>
                        <Label htmlFor="maxHeight">Max Height (px)</Label>
                        <Input
                            id="maxHeight"
                            type="number"
                            value={window.config.maxHeight}
                            onChange={(e) => handleConfigChange(["window", "maxHeight"], Number(e.target.value))}
                            min={200}
                            max={2000}
                            className="h-8"
                        />
                    </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-sm">Additional Settings</DropdownMenuLabel>
                    <DropdownMenuItem className="flex items-center justify-between focus:bg-transparent" onClick={(e) => e.preventDefault()}>
                        <Label htmlFor="fadeOut">Message Fade Out</Label>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleConfigChange(["messages", "fadeOut"], !messages.fadeOut)}
                        >
                            {messages.fadeOut ? "Disable" : "Enable"}
                        </Button>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        );
    }, [
        messages,
        preview,
        handleConfigChange
    ])

    if (themeLoading) {
        return <div>Loading...</div>;
    }

    if (themeError) {
        return <div>Error loading theme</div>;
    }

    if (!theme) {
        return <div>No theme found</div>;
    }

    return (
        <div className="border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-4">
                    <ThemeSelector />
                </div>

                <div className="flex items-center space-x-4">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                {
                                    windows.preview_running ? (
                                        <Button variant="outline" size="sm" className="cursor-pointer" onClick={openMockChatWindow}>
                                            <AppWindowMac className="h-4 w-4" />
                                            Close Preview Window
                                        </Button>

                                    ) : (
                                        <Button variant="outline" size="sm" className="cursor-pointer" disabled={windows.preview_running} onClick={openMockChatWindow}>
                                            <AppWindowMac className="h-4 w-4" />
                                            Open Preview Window
                                        </Button>
                                    )
                                }
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="">
                                Opens a new window with the preview of the chat.
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    className="cursor-pointer"
                                    variant={preview.showPreview ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => config.setConfigValue(["preview", "showPreview"], !preview.showPreview)}
                                >
                                    {preview.showPreview ? (
                                        <EyeIcon className="h-4 w-4 mr-2" />
                                    ) : (
                                        <EyeOffIcon className="h-4 w-4 mr-2" />
                                    )}
                                    Preview
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="">
                                Toggle preview
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    className="cursor-pointer"
                                    variant={preview.previewSide === 'right' ? "secondary" : "outline"}
                                    size="sm"
                                    disabled={!preview.showPreview}
                                    onClick={() => config.setConfigValue(["preview", "previewSide"], preview.previewSide === 'right' ? 'bottom' : 'right')}
                                >
                                    {preview.previewSide === 'right' ? (
                                        <LayoutPanelLeft className="h-4 w-4" />
                                    ) : (
                                        <LayoutPanelTop className="h-4 w-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="">
                                Change preview position to {preview.previewSide === 'right' ? 'bottom' : 'right'}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <Separator orientation="vertical" className="h-6 bg-black" />

                    <Button variant="secondary" className="cursor-pointer" size="sm" onClick={() => void (0)}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                    </Button>

                    <Button
                        variant={windows.main_running ? "secondary" : "default"}
                        className="cursor-pointer"
                        size="sm"
                        onClick={() => config.setConfigValue(["window", "windows", "main_running"], !windows.main_running)}
                    >
                        {windows.main_running ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Running
                            </>
                        ) : (
                            <>
                                <Play className="h-4 w-4 mr-2" />
                                Start
                            </>
                        )}
                    </Button>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon">
                                            <Settings2 className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    {SettingsContent}
                                </DropdownMenu>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="">
                                Settings
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        </div>
    );
}
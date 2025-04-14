import {
    CollisionDetection,
    DndContext,
    DragEndEvent,
    DragOverlay,
    MouseSensor,
    rectIntersection,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import {
    SortableContext,
    arrayMove,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { AlertTriangle, Archive, ChevronRight, Copy, Folder, Move, PaintBucket, Pencil, Plus, Search, Share2, Star, Trash2 } from 'lucide-react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from "sonner";
import { TauriAPI } from '../../lib/tauri';
import { useEditorTheme } from '../../lib/stores/themes';
import { Button } from '../ui/button';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "../ui/context-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { SortableItem } from './SortableItem';

// Non-sortable version of the item for the drag overlay
function DragOverlayItem({ id, type, name }: { id: string, type: 'theme' | 'folder', name: string }) {
    return (
        <div className="w-full">
            <Button
                variant="ghost"
                className="w-full justify-start gap-2 p-2 h-auto"
            >
                {type === 'folder' ? (
                    <>
                        <ChevronRight className="h-4 w-4" />
                        <Folder className="h-4 w-4" />
                    </>
                ) : (
                    <PaintBucket className="h-4 w-4" />
                )}
                <span>{name.slice(0, 1).toUpperCase() + name.slice(1)}</span>
            </Button>
        </div>
    );
}

const STORAGE_KEY = 'theme-folders';

export const ThemeSelector = React.memo(function ThemeSelector() {

    const { data: theme } = useEditorTheme();
    const selectedTheme = {
        name: theme?.name ?? "",
        last_edit: theme?.last_edit ?? new Date(),
        theme_code: theme?.theme_code ?? { html_code: '', css_code: '' },
        has_parent: theme?.has_parent ?? { has_parent: false, parent: null },
        theme_path: theme?.theme_path ?? ""
    } as Editor.ThemeInfo;

    const [open, setOpen] = useState(false);
    const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemType, setNewItemType] = useState<'theme' | 'folder'>('theme');
    const [parentFolder, setParentFolder] = useState<string | null>(null);
    const [folders, setFolders] = useState<Editor.ThemeFolder[]>([]);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renamingItem, setRenamingItem] = useState<{ type: 'theme' | 'folder', name: string } | null>(null);
    const [newName, setNewName] = useState('');
    const [isMoving, setIsMoving] = useState(false);
    const [movingTheme, setMovingTheme] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deletingItem, setDeletingItem] = useState<{ type: 'theme' | 'folder', name: string } | null>(null);

    // Memoize folder IDs to prevent unnecessary re-renders
    const folderIds = useMemo(() => folders.map(f => `folder-${f.name}`), [folders]);

    // Memoize sensors to prevent unnecessary re-renders
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Debounce search query
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 150);
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery]);

    // Memoize filtered folders to prevent unnecessary re-renders
    const filteredFolders = useMemo(() => folders.map(folder => ({
        ...folder,
        themes: folder.themes.filter((t: Editor.ThemeInfo) =>
            t.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        ),
        subfolders: Object.fromEntries(
            Object.entries(folder.subfolders).map(([key, subfolder]) => [
                key,
                {
                    ...subfolder,
                    themes: subfolder.themes.filter((t: Editor.ThemeInfo) =>
                        t.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
                    ),
                }
            ])
        )
    })), [folders, debouncedSearchQuery]);

    // Memoize parent lookup map
    const themeParentMap = useMemo(() => {
        const map = new Map<string, string>();
        const buildMap = (folders: Editor.ThemeFolder[]) => {
            for (const folder of folders) {
                for (const theme of folder.themes) {
                    map.set(theme.name, folder.name);
                }
                if (Object.keys(folder.subfolders).length > 0) {
                    buildMap(Object.values(folder.subfolders));
                }
            }
        };
        buildMap(folders);
        return map;
    }, [folders]);

    // Load themes from backend and localStorage
    useEffect(() => {
        const loadThemes = async () => {
            const backendThemes = await TauriAPI.Theme.getAvailableThemes();
            const saved = localStorage.getItem(STORAGE_KEY);

            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.every(item => typeof item === 'object' && 'name' in item && 'themes' in item)) {
                    // Check if backend themes match localStorage
                    const backendThemeNames = new Set(backendThemes.flatMap(f => f.themes.map(t => t.name)));
                    const localStorageThemeNames = new Set(parsed.flatMap(f => f.themes.map((t: Editor.ThemeInfo) => t.name)));

                    // If they don't match exactly, use backend data and clear localStorage
                    if (backendThemeNames.size !== localStorageThemeNames.size ||
                        ![...backendThemeNames].every(name => localStorageThemeNames.has(name))) {
                        localStorage.removeItem(STORAGE_KEY);
                        setFolders(backendThemes);
                        return;
                    }

                    // If they match, use localStorage data
                    return;
                }
            }

            // If no valid localStorage data, use backend themes
            setFolders(backendThemes);
        };

        loadThemes();
    }, []);

    // Save folders to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
    }, [folders]);

    const toggleFolder = useCallback((folderName: string) => {
        setOpenFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderName)) {
                next.delete(folderName);
            } else {
                next.add(folderName);
            }
            return next;
        });
    }, []);

    const handleDragStart = useCallback((event: any) => {
        setActiveId(event.active.id);
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            return;
        }

        if (active.id !== over.id) {
            const activeId = active.id as string;
            const overId = over.id as string;

            const isActiveFolder = activeId.startsWith('folder-');
            const isOverFolder = overId.startsWith('folder-');

            if (isActiveFolder && isOverFolder) {
                const activeFolderName = activeId.replace('folder-', '');
                const overFolderName = overId.replace('folder-', '');

                setFolders(prev => {
                    const activeIndex = prev.findIndex(f => f.name === activeFolderName);
                    const overIndex = prev.findIndex(f => f.name === overFolderName);

                    if (activeIndex === -1 || overIndex === -1) return prev;

                    return arrayMove(prev, activeIndex, overIndex);
                });
            } else if (!isActiveFolder && !isOverFolder) {
                const activeTheme = activeId;
                const overTheme = overId;

                setFolders(prev => {
                    return prev.map(folder => {
                        const activeIndex = folder.themes.findIndex(t => t.name === activeTheme);
                        const overIndex = folder.themes.findIndex(t => t.name === overTheme);

                        if (activeIndex === -1 || overIndex === -1) return folder;

                        return {
                            ...folder,
                            themes: arrayMove(folder.themes, activeIndex, overIndex),
                            last_edit: new Date()
                        };
                    });
                });
            }
        }

        setActiveId(null);
    }, []);

    const handleCreateItem = useCallback(async (parent?: string) => {
        if (!newItemName.trim()) return;

        const handleCreateTheme = useCallback(async (themeName: string, folder: string) => {
            try {
                const defaultHtml = `<div class="message">
                    <div class="message-content">
                        <span class="username"></span>
                        <span class="message-text"></span>
                    </div>
                </div>`;
                const defaultCss = `/* Add your custom CSS here */`;

                await TauriAPI.Theme.saveTheme(
                    defaultHtml,
                    defaultCss,
                    themeName,
                    folder
                );

                const newTheme: Editor.ThemeInfo = {
                    name: themeName,
                    last_edit: new Date(),
                    theme_code: { html_code: defaultHtml, css_code: defaultCss },
                    has_parent: { has_parent: true, parent: folder },
                    theme_path: ''
                };

                return themeName;
            } catch (error) {
                console.error('Failed to create theme:', error);
                return undefined;
            }
        }, []);

        try {
            if (newItemType === 'theme') {
                // Create theme and get the actual name from the backend
                if (!parentFolder) return;
                const themeName = await handleCreateTheme(newItemName, parentFolder);
                if (!themeName) return;

                // Update folders with the new theme
                setFolders(prev => {
                    const newTheme: Editor.ThemeInfo = {
                        name: themeName,
                        last_edit: new Date(),
                        theme_code: { html_code: '', css_code: '' },
                        has_parent: { has_parent: true, parent: parentFolder },
                        theme_path: ''
                    };

                    if (parentFolder) {
                        // Add to subfolder
                        return prev.map(folder => {
                            if (folder.name === parentFolder) {
                                return {
                                    ...folder,
                                    themes: [...folder.themes, newTheme],
                                    last_edit: new Date(),
                                };
                            }
                            return folder;
                        });
                    }
                    return prev;
                });

                toast.success("Theme created successfully");
            } else {
                // Create folder
                setFolders(prev => {
                    const newFolder: Editor.ThemeFolder = {
                        name: newItemName.trim(),
                        themes: [],
                        path: '',
                        parent: parentFolder,
                        subfolders: {},
                        last_edit: new Date()
                    };

                    if (parentFolder) {
                        // Add as subfolder
                        return prev.map(folder => {
                            if (folder.name === parentFolder) {
                                return {
                                    ...folder,
                                    subfolders: {
                                        ...folder.subfolders,
                                        [newFolder.name]: newFolder
                                    },
                                    last_edit: new Date(),
                                };
                            }
                            return folder;
                        });
                    } else {
                        // Add as root folder
                        return [...prev, newFolder];
                    }
                });

                toast.success("Folder created successfully");
            }

            // Reset all state
            setNewItemName('');
            setNewItemType('theme');
            setParentFolder(null);
            setIsCreating(false);
            setOpen(false);
        } catch (error) {
            console.error('Failed to create item:', error);
            toast.error(error instanceof Error ? error.message : "Failed to create item");
        }
    }, [newItemName, newItemType, parentFolder]);

    const handleRename = useCallback(() => {
        if (!newName.trim() || !renamingItem) return;

        setFolders(prev => {
            const renameInFolder = (folder: Editor.ThemeFolder): Editor.ThemeFolder => {
                if (renamingItem.type === 'folder' && folder.name === renamingItem.name) {
                    return { ...folder, name: newName.trim(), last_edit: new Date() };
                }
                if (renamingItem.type === 'theme') {
                    return {
                        ...folder,
                        themes: folder.themes.map(t =>
                            t.name === renamingItem.name
                                ? { ...t, name: newName.trim(), last_edit: new Date() }
                                : t
                        ),
                        last_edit: new Date(),
                    };
                }
                if (Object.keys(folder.subfolders).length > 0) {
                    return {
                        ...folder,
                        subfolders: Object.fromEntries(
                            Object.entries(folder.subfolders).map(([key, subfolder]) => [
                                key,
                                renameInFolder(subfolder)
                            ])
                        ),
                    };
                }
                return folder;
            };
            return prev.map(renameInFolder);
        });

        setNewName('');
        setRenamingItem(null);
        setIsRenaming(false);
    }, [newName, renamingItem]);

    const handleDelete = useCallback((type: 'theme' | 'folder', name: string) => {
        setDeletingItem({ type, name });
        setIsDeleting(true);
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!deletingItem) return;

        try {
            if (deletingItem.type === 'theme') {
                await TauriAPI.Theme.deleteTheme(deletingItem.name);
            } else {
                await TauriAPI.Theme.deleteFolder(deletingItem.name);
            }

            setFolders(prev => {
                const deleteFromFolder = (folder: Editor.ThemeFolder): Editor.ThemeFolder | null => {
                    if (deletingItem.type === 'folder' && folder.name === deletingItem.name) {
                        return null;
                    }
                    if (deletingItem.type === 'theme') {
                        return {
                            ...folder,
                            themes: folder.themes.filter(t => t.name !== deletingItem.name),
                            last_edit: new Date(),
                        };
                    }
                    if (Object.keys(folder.subfolders).length > 0) {
                        const filteredSubfolders = Object.fromEntries(
                            Object.entries(folder.subfolders)
                                .map(([key, subfolder]) => [key, deleteFromFolder(subfolder)])
                                .filter((entry): entry is [string, Editor.ThemeFolder] => {
                                    const [_, value] = entry;
                                    return value !== null;
                                })
                        );
                        return {
                            ...folder,
                            subfolders: filteredSubfolders,
                            last_edit: new Date(),
                        };
                    }
                    return folder;
                };
                return prev.map(deleteFromFolder).filter((f): f is Editor.ThemeFolder => f !== null);
            });
        } catch (error) {
            console.error('Failed to delete:', error);
            toast.error(`Failed to delete ${deletingItem.type}`);
        } finally {
            setIsDeleting(false);
            setDeletingItem(null);
        }
    }, [deletingItem]);

    const handleMove = useCallback((themeName: string, targetFolder: string) => {
        const currentParent = themeParentMap.get(themeName);

        // Don't proceed if trying to move to the same folder
        if (currentParent === targetFolder) {
            toast.error("Theme is already in this folder");
            return;
        }

        setFolders(prev => {
            const moveTheme = (folder: Editor.ThemeFolder): Editor.ThemeFolder => {
                // Remove from current folder
                if (folder.themes.some(t => t.name === themeName)) {
                    return {
                        ...folder,
                        themes: folder.themes.filter(t => t.name !== themeName),
                        last_edit: new Date(),
                    };
                }
                // Add to target folder
                if (folder.name === targetFolder) {
                    return {
                        ...folder,
                        themes: [...folder.themes, {
                            name: themeName,
                            last_edit: new Date(),
                            theme_code: { html_code: '', css_code: '' },
                            has_parent: { has_parent: true, parent: targetFolder },
                            theme_path: ''
                        }],
                        last_edit: new Date(),
                    };
                }
                // Handle subfolders
                if (Object.keys(folder.subfolders).length > 0) {
                    return {
                        ...folder,
                        subfolders: Object.fromEntries(
                            Object.entries(folder.subfolders).map(([key, subfolder]) => [
                                key,
                                moveTheme(subfolder)
                            ])
                        ),
                    };
                }
                return folder;
            };
            return prev.map(moveTheme);
        });
        setIsMoving(false);
        setMovingTheme(null);
    }, [themeParentMap]);

    const handleThemeChange = useCallback(async (newTheme: Editor.ThemeInfo) => {
        void (0)
    }, []);

    const handleFolderToggle = useCallback((folderName: string) => {
        toggleFolder(folderName);
    }, [toggleFolder]);

    const handleFolderRename = useCallback((folderName: string) => {
        setRenamingItem({ type: 'folder', name: folderName });
        setNewName(folderName);
        setIsRenaming(true);
    }, []);

    const handleFolderDelete = useCallback((folderName: string) => {
        handleDelete('folder', folderName);
    }, [handleDelete]);

    const handleCreateInFolder = useCallback((folderName: string) => {
        setParentFolder(folderName);
        setIsCreating(true);
    }, []);

    const renderFolder = useCallback((folder: Editor.ThemeFolder) => {
        const isOpen = openFolders.has(folder.name);
        const hasThemes = folder.themes.length > 0;
        const hasSubfolders = Object.keys(folder.subfolders).length > 0;

        return (
            <div key={folder.name} className="space-y-1 w-full">
                <div className="flex items-center gap-2 w-full">
                    <div className="flex-1">
                        <ContextMenu>
                            <ContextMenuTrigger>
                                <SortableItem
                                    id={`folder-${folder.name}`}
                                    type="folder"
                                    lastEdit={folder.last_edit}
                                    name={folder.name}
                                    isOpen={isOpen}
                                    onSelect={() => { }}
                                    onToggle={() => handleFolderToggle(folder.name)}
                                />
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuItem onClick={() => handleFolderRename(folder.name)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Rename
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => handleFolderDelete(folder.name)}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem>
                                    <Star className="h-4 w-4 mr-2" />
                                    Favorite
                                </ContextMenuItem>
                                <ContextMenuItem>
                                    <Share2 className="h-4 w-4 mr-2" />
                                    Share
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => handleCreateInFolder(folder.name)}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                {isOpen && (
                    <div className="ml-6 space-y-1 w-full">
                        {hasThemes && (
                            <SortableContext
                                items={folder.themes.map(t => t.name)}
                                strategy={verticalListSortingStrategy}
                            >
                                {folder.themes.map(themeInfo => (
                                    <ThemeItem
                                        key={themeInfo.name}
                                        themeInfo={themeInfo}
                                        selectedTheme={selectedTheme}
                                        onThemeChange={handleThemeChange}
                                        onRename={() => {
                                            setRenamingItem({ type: 'theme', name: themeInfo.name });
                                            setNewName(themeInfo.name);
                                            setIsRenaming(true);
                                        }}
                                        onMove={() => {
                                            setMovingTheme(themeInfo.name);
                                            setIsMoving(true);
                                        }}
                                        onDelete={() => handleDelete('theme', themeInfo.name)}
                                    />
                                ))}
                            </SortableContext>
                        )}
                        {hasSubfolders && Object.values(folder.subfolders).map(subfolder => renderFolder(subfolder))}
                    </div>
                )}
            </div>
        );
    }, [openFolders, selectedTheme, handleThemeChange, handleFolderToggle, handleFolderRename, handleFolderDelete, handleCreateInFolder, handleDelete]);

    // Memoized ThemeItem component
    const ThemeItem = memo(({
        themeInfo,
        selectedTheme,
        onThemeChange,
        onRename,
        onMove,
        onDelete
    }: {
        themeInfo: Editor.ThemeInfo;
        selectedTheme: Editor.ThemeInfo;
        onThemeChange: (theme: Editor.ThemeInfo) => void;
        onRename: () => void;
        onMove: () => void;
        onDelete: () => void;
    }) => (
        <ContextMenu>
            <ContextMenuTrigger>
                <SortableItem
                    id={themeInfo.name}
                    type="theme"
                    name={themeInfo.name}
                    isSelected={selectedTheme.name === themeInfo.name}
                    lastEdit={themeInfo.last_edit}
                    onSelect={() => onThemeChange(themeInfo)}
                />
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={onRename}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                </ContextMenuItem>
                <ContextMenuItem onClick={onMove}>
                    <Move className="h-4 w-4 mr-2" />
                    Move to Folder
                </ContextMenuItem>
                <ContextMenuItem onClick={onDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                </ContextMenuItem>
                <ContextMenuItem>
                    <Star className="h-4 w-4 mr-2" />
                    Favorite
                </ContextMenuItem>
                <ContextMenuItem>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                </ContextMenuItem>
                <ContextMenuItem>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    ));

    const fixCursorSnapOffset: CollisionDetection = useCallback((args) => {
        if (!args.pointerCoordinates) {
            return rectIntersection(args);
        }
        const { x, y } = args.pointerCoordinates;
        const { width, height } = args.collisionRect;
        return rectIntersection({
            ...args,
            collisionRect: {
                width,
                height,
                bottom: y + height / 2,
                left: x - width / 2,
                right: x + width / 2,
                top: y - height / 2,
            },
        });
    }, []);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <PaintBucket className="h-4 w-4" />
                    {selectedTheme.name.charAt(0).toUpperCase() + selectedTheme.name.slice(1)}
                </Button>
            </DialogTrigger>
            {open && (
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Select Theme</DialogTitle>
                        <DialogDescription>
                            Choose a theme to edit or create a new one.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search themes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 h-9"
                            onClick={() => {
                                setParentFolder(null);
                                setIsCreating(true);
                            }}
                        >
                            <Plus className="h-9 w-4" />
                            New Item
                        </Button>
                    </div>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={fixCursorSnapOffset}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-1 w-full">
                                <SortableContext
                                    items={folderIds}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {filteredFolders.map(folder => renderFolder(folder))}
                                </SortableContext>
                            </div>
                        </ScrollArea>
                        <DragOverlay modifiers={[snapCenterToCursor]}>
                            {activeId ? (
                                <DragOverlayItem
                                    id={activeId}
                                    type={activeId.startsWith('folder-') ? 'folder' : 'theme'}
                                    name={activeId.replace('folder-', '')}
                                />
                            ) : null}
                        </DragOverlay>
                    </DndContext>

                    <Dialog open={isCreating} onOpenChange={setIsCreating}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Item</DialogTitle>
                                <DialogDescription>
                                    Choose what type of item you want to create and give it a name.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Type</label>
                                    <Select
                                        value={newItemType}
                                        onValueChange={(value: 'theme' | 'folder') => setNewItemType(value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="theme">Theme</SelectItem>
                                            <SelectItem value="folder">Folder</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Name</label>
                                    <Input
                                        placeholder={`Enter ${newItemType} name...`}
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        onKeyDown={(e) => {
                                            e.key === 'Enter' && handleCreateItem(
                                                newItemType === "theme" ? parentFolder ?? undefined : undefined
                                            )
                                        }}
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setIsCreating(false);
                                            setNewItemName('');
                                            setParentFolder(null);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={() => handleCreateItem(
                                            newItemType === "folder" ? parentFolder ?? undefined : undefined
                                        )}
                                        disabled={!newItemName.trim()}
                                    >
                                        Create
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Rename Dialog */}
                    <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Rename {renamingItem?.type}</DialogTitle>
                                <DialogDescription>
                                    Enter a new name for this {renamingItem?.type}.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Name</label>
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setIsRenaming(false);
                                            setRenamingItem(null);
                                            setNewName('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleRename}
                                        disabled={!newName.trim()}
                                    >
                                        Rename
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Move Theme Dialog */}
                    <Dialog open={isMoving} onOpenChange={setIsMoving}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Move Theme</DialogTitle>
                                <DialogDescription>
                                    Select a folder to move the theme to.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Target Folder</label>
                                    <Select
                                        onValueChange={(value) => movingTheme && handleMove(movingTheme, value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a folder" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {folders.map(folder => {
                                                // Find the current parent folder of the theme
                                                const findCurrentParent = (folders: Editor.ThemeFolder[]): string | null => {
                                                    for (const folder of folders) {
                                                        if (folder.themes.some(t => t.name === movingTheme)) {
                                                            return folder.name;
                                                        }
                                                        if (Object.keys(folder.subfolders).length > 0) {
                                                            const parent = findCurrentParent(Object.values(folder.subfolders));
                                                            if (parent) return parent;
                                                        }
                                                    }
                                                    return null;
                                                };
                                                const currentParent = findCurrentParent(folders);

                                                // Don't show the current folder as an option
                                                if (folder.name === currentParent) {
                                                    return null;
                                                }

                                                return (
                                                    <SelectItem key={folder.name} value={folder.name}>
                                                        {folder.name}
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
                        <DialogContent className="max-w-md">
                            <DialogHeader className="space-y-3">
                                <div className="flex items-center gap-2 text-destructive">
                                    <Trash2 className="h-5 w-5" />
                                    <DialogTitle>{deletingItem?.type === 'folder' ? 'Delete Folder' : 'Delete Theme'}</DialogTitle>
                                </div>

                                <div className="rounded-md bg-muted p-4">
                                    <DialogDescription className="text-base text-foreground">{deletingItem?.type === 'folder' ? 'Are you sure you want to delete this folder and all its contents?' : 'Are you sure you want to delete this theme?'}</DialogDescription>
                                </div>

                                {deletingItem?.type === 'folder' && (
                                    <div className="flex items-start gap-3 rounded-md border border-destructive bg-destructive/5 p-4 text-destructive">
                                        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                        <DialogDescription className="text-sm font-medium text-destructive">
                                            This will delete all themes inside this folder and any subfolders.
                                        </DialogDescription>
                                    </div>
                                )}

                                <DialogDescription className="pt-1 text-sm italic text-muted-foreground">
                                    This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>

                            <DialogFooter className="mt-2 flex gap-2">
                                <Button variant="outline" onClick={
                                    () => {
                                        setIsDeleting(false);
                                        setDeletingItem(null);
                                    }
                                } className="w-full sm:w-auto">
                                    Cancel
                                </Button>
                                <Button variant="destructive" onClick={confirmDelete} className="w-full sm:w-auto">
                                    Delete
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </DialogContent>
            )}
        </Dialog>
    );
}); 
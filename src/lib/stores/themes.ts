"use client";

import { TauriAPI } from "@/lib/tauri";
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { err, ok, Result } from "neverthrow";
import { z } from "zod";

const themeSchema = z.object({
    name: z.string(),
    last_edit: z.string().optional(),
    theme_code: z.object({
        html_code: z.string(),
        css_code: z.string(),
    }),
    has_parent: z.object({
        has_parent: z.boolean(),
        parent: z.string().optional(),
    }),
    theme_path: z.string(),
});

export type ThemeState = z.infer<typeof themeSchema>;
export type ThemeError =
    | { type: "parsing_error"; message: string; stack?: string }
    | { type: "validation_error"; message: string; stack?: string }
    | { type: "storage_error"; message: string; stack?: string }
    | { type: "unknown"; message: string; stack?: string };

type ThemeResult = Result<ThemeState, ThemeError>;

// Create a persister for localStorage
const persister = createSyncStoragePersister({
    storage: window.localStorage
});

// Initialize the query client with persistence
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: Infinity,
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
        },
    },
});

// Set up persistence
if (typeof window !== 'undefined') {
    console.log("Setting up persistence")
    persistQueryClient({
        queryClient,
        persister,
        maxAge: Infinity, // How long to persist cache
    });
}

// Function to fetch themes from backend
const fetchAvailableThemes = async (): Promise<ThemeResult> => {
    try {
        const themeFetch = await TauriAPI.Theme.getAvailableThemes();
        const folders = themeFetch[0];
        const themeResult = folders.themes[0];

        const parseResult = themeSchema.safeParse(themeResult);
        if (!parseResult.success) {
            return err({
                type: "validation_error",
                message: parseResult.error.message,
                stack: parseResult.error.stack
            });
        }

        return ok(parseResult.data);
    } catch (error) {
        return err({
            type: "unknown",
            message: error instanceof Error ? error.message : "Unknown error occurred",
            stack: error instanceof Error ? error.stack : undefined
        });
    }
};

// Function to validate theme data
const validateTheme = (data: unknown): ThemeResult => {
    const parseResult = themeSchema.safeParse(data);
    if (!parseResult.success) {
        return err({
            type: "validation_error",
            message: parseResult.error.message,
            stack: parseResult.error.stack
        });
    }
    return ok(parseResult.data);
};

// Hook to get the current theme
export const useEditorTheme = () => {
    return useQuery({
        queryKey: ['chat-theme'],
        queryFn: async () => {
            // First try to get from cache (which is persisted)
            const cachedTheme = queryClient.getQueryData<ThemeState>(['chat-theme']);

            if (cachedTheme) {
                // Validate cached data
                const validationResult = validateTheme(cachedTheme);
                if (validationResult.isOk()) {
                    return validationResult.value;
                }
            }

            // If no valid cached theme, fetch from backend
            const result = await fetchAvailableThemes();
            if (result.isErr()) {
                return Promise.reject(result.error);
            }

            // Set the theme in the cache
            queryClient.setQueryData(['chat-theme'], result.value);
            return result.value;
        },
        staleTime: Infinity, // Theme doesn't change often
    });
};

// This is a soft update, it doesn't save to the backend and only updates the cache
export const useSoftUpdateTheme = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newThemeData: Partial<ThemeState>) => {
            const currentTheme = queryClient.getQueryData<ThemeState>(['chat-theme']);
            if (!currentTheme) {
                return Promise.reject({
                    type: "unknown",
                    message: "No theme found in cache"
                } as ThemeError);
            }

            const newTheme = { ...currentTheme, ...newThemeData };
            const validationResult = validateTheme(newTheme);

            if (validationResult.isErr()) {
                return Promise.reject(validationResult.error);
            }

            return validationResult.value;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['chat-theme'], data);
        },
    });
};

// Hook to select a different theme
export const useSelectTheme = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (theme: Editor.ThemeInfo) => {
            // Here you would typically fetch the specific theme from backend
            const themeResult = await TauriAPI.Theme.getTheme(theme);
            // if (themeResult.isErr()) {
            //     return Promise.reject(themeResult.error);
            // }

            const validationResult = validateTheme({ theme_path: theme.theme_path });
            if (validationResult.isErr()) {
                return Promise.reject(validationResult.error);
            }

            return validationResult.value;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['chat-theme'], data);
        },
    });
};
"use client"

import type { ThemeProviderProps } from 'next-themes';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { createContext, useContext, useEffect, useState } from 'react';

export interface Theme {
    theme: string | undefined;
    setTheme: (theme: string) => void;
}

const ThemeContext = createContext<Theme | undefined>(undefined);

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    const [mounted, setMounted] = useState(false);

    // Ensure we only render theme content after hydration
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <>children</>
        );
    }

    return (
        <NextThemesProvider {...props}>
            {children}
        </NextThemesProvider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

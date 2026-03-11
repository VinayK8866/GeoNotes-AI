import { useState, useEffect, useMemo } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export const useTheme = () => {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof localStorage === 'undefined') return 'system';
        return (localStorage.getItem('theme') as Theme) || 'system';
    });

    const effectiveTheme = useMemo(() => {
        if (theme === 'system') {
            if (typeof window === 'undefined') return 'light';
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
    }, [theme]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const root = window.document.documentElement;
        
        if (effectiveTheme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('theme', theme);
        }
    }, [theme, effectiveTheme]);

    return { theme, setTheme, effectiveTheme };
};

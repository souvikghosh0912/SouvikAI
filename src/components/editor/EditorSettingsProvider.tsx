'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

/**
 * Editor theme.
 *  - "auto"  follows the app theme (.dark vs light)
 *  - "hc"    high-contrast override (sets data-editor-theme="hc"
 *            on the editor scope)
 */
export type EditorTheme = 'auto' | 'hc';

export interface EditorSettings {
    theme: EditorTheme;
    fontSize: number;
    tabSize: number;
    insertSpaces: boolean;
    wordWrap: boolean;
    lineNumbers: boolean;
    minimap: boolean;
    highlightActiveLine: boolean;
    /** Disables animation, syntax overlay-only effects, and the minimap. */
    reduceMotion: boolean;
}

export const DEFAULT_SETTINGS: EditorSettings = {
    theme: 'auto',
    fontSize: 13,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: false,
    lineNumbers: true,
    minimap: true,
    highlightActiveLine: true,
    reduceMotion: false,
};

const STORAGE_KEY = 'code:editor:settings';

interface SettingsContextValue {
    settings: EditorSettings;
    update: <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => void;
    reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function EditorSettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);

    // Hydrate from localStorage once on mount.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as Partial<EditorSettings>;
            setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch {
            /* ignore — corrupt JSON or unavailable storage */
        }
    }, []);

    // Auto-detect prefers-reduced-motion.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const apply = () => {
            setSettings((s) => (mq.matches ? { ...s, reduceMotion: true } : s));
        };
        apply();
        mq.addEventListener('change', apply);
        return () => mq.removeEventListener('change', apply);
    }, []);

    const persist = useCallback((next: EditorSettings) => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
            /* ignore */
        }
    }, []);

    const update = useCallback<SettingsContextValue['update']>((key, value) => {
        setSettings((prev) => {
            const next = { ...prev, [key]: value };
            persist(next);
            return next;
        });
    }, [persist]);

    const reset = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
        persist(DEFAULT_SETTINGS);
    }, [persist]);

    const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useEditorSettings(): SettingsContextValue {
    const ctx = useContext(SettingsContext);
    if (!ctx) {
        throw new Error('useEditorSettings must be used within EditorSettingsProvider');
    }
    return ctx;
}

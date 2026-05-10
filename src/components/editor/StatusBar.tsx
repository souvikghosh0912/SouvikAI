'use client';

import { GitBranch, Check, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { languageLabel } from '@/lib/editor/language';
import { useEditorSettings } from './EditorSettingsProvider';

interface StatusBarProps {
    activePath: string | null;
    line: number;
    col: number;
    isSaving: boolean;
    onOpenSettings?: () => void;
}

export function StatusBar({ activePath, line, col, isSaving, onOpenSettings }: StatusBarProps) {
    const displayLang = useMemo(() => languageLabel(activePath), [activePath]);
    const { settings } = useEditorSettings();

    // Debounced live region for cursor position so screen readers don't
    // get spammed on every keystroke / arrow press.
    const [announced, setAnnounced] = useState('');
    const timer = useRef<number | null>(null);
    useEffect(() => {
        if (!activePath) return;
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
            setAnnounced(`Line ${line}, column ${col}`);
        }, 600);
        return () => {
            if (timer.current) window.clearTimeout(timer.current);
        };
    }, [line, col, activePath]);

    return (
        <div
            id="editor-status-bar"
            role="status"
            className="flex items-center justify-between px-3 h-[22px] bg-editor-status text-editor-status-foreground text-[11px] shrink-0 select-none"
        >
            <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 opacity-90">
                    <GitBranch aria-hidden="true" className="w-3 h-3" />
                    <span>main</span>
                </span>

                {isSaving ? (
                    <span className="flex items-center gap-1 text-editor-status-foreground/85">
                        <Loader2 aria-hidden="true" className="w-3 h-3 animate-spin" />
                        <span>Saving…</span>
                    </span>
                ) : activePath ? (
                    <span className="flex items-center gap-1 text-editor-status-foreground/85">
                        <Check aria-hidden="true" className="w-3 h-3" />
                        <span>Saved</span>
                    </span>
                ) : null}
            </div>

            <div className="flex items-center gap-4 opacity-90">
                {activePath && (
                    <>
                        <span aria-hidden="true">Ln {line}, Col {col}</span>
                        <span>{settings.insertSpaces ? 'Spaces' : 'Tab'}: {settings.tabSize}</span>
                        <span>UTF-8</span>
                        <span>LF</span>
                        <span className="font-medium">{displayLang}</span>
                    </>
                )}

                {onOpenSettings && (
                    <button
                        type="button"
                        onClick={onOpenSettings}
                        aria-label="Editor settings"
                        className="flex items-center justify-center w-5 h-5 rounded hover:bg-editor-status-foreground/15 -mr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-editor-status-foreground"
                    >
                        <SettingsIcon aria-hidden="true" className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Polite live region for screen-reader cursor announcements. */}
            <span className="sr-only" aria-live="polite" aria-atomic="true">
                {announced}
            </span>
        </div>
    );
}

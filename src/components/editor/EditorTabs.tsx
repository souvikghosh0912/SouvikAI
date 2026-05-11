'use client';

import { useEffect, useRef } from 'react';
import { X, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorTabsProps {
    openTabs: string[];
    activePath: string | null;
    dirtyPaths?: Set<string>;
    onSelect: (path: string) => void;
    onClose: (path: string) => void;
    /**
     * Optional trailing slot rendered at the far right of the tab bar
     * (e.g. Copy / Split-pane / More-actions icons in VS Code).
     */
    trailingSlot?: React.ReactNode;
}

const EXT_COLOUR: Record<string, string> = {
    ts: '#3178c6', tsx: '#3178c6', js: '#f7df1e', jsx: '#61dafb',
    py: '#3572A5', rs: '#dea584', go: '#00add8', html: '#e44b23',
    css: '#563d7c', scss: '#c6538c', json: '#f5a623', md: '#888',
    sql: '#e38c00', sh: '#89e051',
};

function tabColour(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    return EXT_COLOUR[ext] ?? 'currentColor';
}

function basename(path: string) {
    return path.split('/').pop() || path;
}

export function EditorTabs({ openTabs, activePath, dirtyPaths = new Set(), onSelect, onClose }: EditorTabsProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Scroll the active tab into view when it changes.
    useEffect(() => {
        if (!activePath) return;
        const el = tabRefs.current[activePath];
        el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, [activePath]);

    if (openTabs.length === 0) return null;

    /**
     * Roving-tabindex arrow navigation across the tab strip. ←/→ move
     * between tabs, Home/End jump to the ends, Delete/Backspace closes
     * the focused tab.
     */
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, path: string) => {
        const idx = openTabs.indexOf(path);
        if (idx < 0) return;

        let nextIdx = idx;
        if (e.key === 'ArrowRight') nextIdx = (idx + 1) % openTabs.length;
        else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + openTabs.length) % openTabs.length;
        else if (e.key === 'Home') nextIdx = 0;
        else if (e.key === 'End') nextIdx = openTabs.length - 1;
        else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(path);
            return;
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            onClose(path);
            return;
        } else {
            return;
        }

        e.preventDefault();
        const next = openTabs[nextIdx];
        onSelect(next);
        tabRefs.current[next]?.focus();
    };

    return (
        <div
            ref={scrollRef}
            role="tablist"
            aria-label="Open files"
            aria-orientation="horizontal"
            className="flex items-end overflow-x-auto overflow-y-hidden scrollbar-hide bg-editor-tab-bar border-b border-editor-border shrink-0"
            style={{ height: 36 }}
        >
            {openTabs.map(path => {
                const isActive = path === activePath;
                const isDirty = dirtyPaths.has(path);
                const name = basename(path);
                const colour = tabColour(name);

                return (
                    <div
                        key={path}
                        ref={el => { tabRefs.current[path] = el; }}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls="editor-content"
                        aria-label={`${name}${isDirty ? ', modified' : ''}`}
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => onSelect(path)}
                        onKeyDown={e => onKeyDown(e, path)}
                        className={cn(
                            'group flex items-center gap-2 pl-3 pr-2 h-full text-[13px] cursor-pointer whitespace-nowrap border-r border-editor-border select-none transition-colors duration-100 relative',
                            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-editor-accent',
                            isActive
                                ? 'bg-editor-tab-active text-editor-fg'
                                : 'bg-editor-tab-inactive text-editor-fg-muted hover:text-editor-fg',
                        )}
                        style={{ minWidth: 120, maxWidth: 220 }}
                    >
                        {isActive && (
                            <span
                                aria-hidden="true"
                                className="absolute top-0 left-0 right-0 h-px bg-editor-accent"
                            />
                        )}

                        <span
                            aria-hidden="true"
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: colour, opacity: 0.85 }}
                        />

                        <span className="truncate flex-1">{name}</span>

                        <button
                            type="button"
                            onClick={e => { e.stopPropagation(); onClose(path); }}
                            aria-label={`Close ${name}${isDirty ? ' (unsaved changes)' : ''}`}
                            tabIndex={-1}
                            className="flex items-center justify-center w-5 h-5 hover:bg-editor-fg/10 shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-editor-accent"
                        >
                            {isDirty
                                ? <Circle aria-hidden="true" className="w-2.5 h-2.5 fill-current text-editor-fg-subtle" />
                                : <X aria-hidden="true" className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

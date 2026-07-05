'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatChord } from '@/lib/hotkeys';

export interface Command {
    id: string;
    /** Title shown in the list. */
    title: string;
    /** Optional secondary text (group/category). */
    group?: string;
    /** Optional keyboard shortcut to display alongside the row. */
    shortcut?: string | string[];
    /** Optional leading icon. */
    icon?: React.ReactNode;
    run: () => void;
    /** Hide the command from the palette without removing it. */
    hidden?: boolean;
    /** Extra search keywords. */
    keywords?: string[];
}

interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    commands: Command[];
    /** Optional list of files for the quick-open mode (Cmd+P). */
    files?: string[];
    /** Initial mode — "command" (default) or "files" (quick-open). */
    mode?: 'command' | 'files';
    onOpenFile?: (path: string) => void;
}

/**
 * Command palette modeled on the WAI-ARIA combobox pattern. The textbox
 * (input) and listbox (results) are linked via aria-controls /
 * aria-activedescendant so screen readers announce the highlighted item
 * without taking focus away from the search field.
 *
 * Two modes:
 *   - "command" (default): fuzzy-search registered editor commands.
 *   - "files":             quick-open over the project's file list.
 *
 * Type `>` to switch into command mode, or `?` to see all bindings.
 * Otherwise the palette infers from `mode`.
 */
export function CommandPalette({
    open,
    onOpenChange,
    commands,
    files = [],
    mode = 'command',
    onOpenFile,
}: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [highlighted, setHighlighted] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const listboxId = useId();

    // Reset state when the palette closes/opens.
    useEffect(() => {
        if (open) {
            setQuery('');
            setHighlighted(0);
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open]);

    // Determine effective mode by inspecting the query.
    const effectiveMode: 'command' | 'files' = useMemo(() => {
        if (query.startsWith('>')) return 'command';
        if (query.startsWith('@') || query.startsWith('#')) return 'files';
        return mode;
    }, [query, mode]);

    const cleanQuery = useMemo(() => {
        if (query.startsWith('>') || query.startsWith('@') || query.startsWith('#')) {
            return query.slice(1).trim().toLowerCase();
        }
        return query.trim().toLowerCase();
    }, [query]);

    // Build the filtered + ranked list of items for the active mode.
    const items = useMemo(() => {
        if (effectiveMode === 'files') {
            const visible = files
                .map((path) => ({
                    id: `file:${path}`,
                    title: path.split('/').pop() ?? path,
                    group: path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : 'root',
                    icon: null,
                    shortcut: undefined,
                    run: () => onOpenFile?.(path),
                    keywords: [path],
                }))
                .filter((c) => match(c.title + ' ' + c.group, cleanQuery));
            return rank(visible, cleanQuery);
        }

        const visible = commands.filter((c) => !c.hidden);
        if (!cleanQuery) return visible;
        return rank(
            visible.filter((c) => match(`${c.title} ${c.group ?? ''} ${c.keywords?.join(' ') ?? ''}`, cleanQuery)),
            cleanQuery,
        );
    }, [effectiveMode, commands, files, cleanQuery, onOpenFile]);

    // Clamp highlighted index when the list shrinks.
    useEffect(() => {
        if (highlighted >= items.length) setHighlighted(0);
    }, [items.length, highlighted]);

    // Scroll the active row into view.
    useEffect(() => {
        const el = listRef.current?.querySelector<HTMLElement>(
            `[data-index="${highlighted}"]`,
        );
        el?.scrollIntoView({ block: 'nearest' });
    }, [highlighted]);

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted((h) => Math.min(items.length - 1, h + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlighted((h) => Math.max(0, h - 1));
        } else if (e.key === 'Home') {
            e.preventDefault();
            setHighlighted(0);
        } else if (e.key === 'End') {
            e.preventDefault();
            setHighlighted(items.length - 1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const item = items[highlighted];
            if (item) {
                item.run();
                onOpenChange(false);
            }
        }
    };

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fadeIn" />
                <DialogPrimitive.Content
                    aria-label={effectiveMode === 'files' ? 'Quick open file' : 'Command palette'}
                    className="fixed left-1/2 top-[20%] z-50 -translate-x-1/2 w-[min(640px,92vw)] rounded-xl border border-border bg-popover text-popover-foreground shadow-overlay overflow-hidden animate-slide-up"
                >
                    <DialogPrimitive.Title className="sr-only">
                        {effectiveMode === 'files' ? 'Quick open' : 'Command palette'}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">
                        {effectiveMode === 'files'
                            ? 'Type a filename to jump to a file.'
                            : 'Type a command name. Use arrow keys to navigate, Enter to run.'}
                    </DialogPrimitive.Description>

                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle">
                        <Search aria-hidden="true" className="h-4 w-4 text-foreground-muted shrink-0" />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder={
                                effectiveMode === 'files'
                                    ? 'Search files by name…'
                                    : 'Type a command, or > to search commands, @ to find files'
                            }
                            role="combobox"
                            aria-expanded={items.length > 0}
                            aria-controls={listboxId}
                            aria-activedescendant={
                                items[highlighted] ? `${listboxId}-${highlighted}` : undefined
                            }
                            aria-autocomplete="list"
                            className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-foreground-subtle outline-none"
                        />
                        <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 h-5 text-[10px] font-medium text-foreground-muted bg-surface-2 border border-border rounded">
                            esc
                        </kbd>
                    </div>

                    <div
                        ref={listRef}
                        id={listboxId}
                        role="listbox"
                        aria-label={effectiveMode === 'files' ? 'Files' : 'Commands'}
                        className="max-h-[min(50vh,360px)] overflow-y-auto py-1"
                    >
                        {items.length === 0 ? (
                            <div className="px-4 py-8 text-center text-[13px] text-foreground-muted">
                                No matches.
                            </div>
                        ) : (
                            items.map((item, idx) => {
                                const isActive = idx === highlighted;
                                return (
                                    <div
                                        key={item.id}
                                        id={`${listboxId}-${idx}`}
                                        data-index={idx}
                                        role="option"
                                        aria-selected={isActive}
                                        onMouseEnter={() => setHighlighted(idx)}
                                        onClick={() => {
                                            item.run();
                                            onOpenChange(false);
                                        }}
                                        className={cn(
                                            'flex items-center gap-2.5 px-3 py-2 mx-1 rounded-md cursor-pointer text-[13px]',
                                            isActive
                                                ? 'bg-surface-3 text-foreground'
                                                : 'text-foreground-muted',
                                        )}
                                    >
                                        {item.icon ? (
                                            <span className="shrink-0 w-4 h-4 flex items-center justify-center text-foreground-subtle">
                                                {item.icon}
                                            </span>
                                        ) : (
                                            <span className="shrink-0 w-4" aria-hidden="true" />
                                        )}
                                        <span className="flex-1 truncate text-foreground">
                                            {item.title}
                                        </span>
                                        {item.group && (
                                            <span className="text-[11px] text-foreground-subtle truncate max-w-[40%]">
                                                {item.group}
                                            </span>
                                        )}
                                        {item.shortcut && (
                                            <span className="flex items-center gap-1 shrink-0">
                                                {(Array.isArray(item.shortcut)
                                                    ? item.shortcut
                                                    : [item.shortcut]
                                                ).map((c) => (
                                                    <kbd
                                                        key={c}
                                                        className="inline-flex items-center px-1.5 h-5 text-[10px] font-medium text-foreground-muted bg-surface-2 border border-border rounded"
                                                    >
                                                        {formatChord(c)}
                                                    </kbd>
                                                ))}
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="flex items-center gap-3 px-3 py-1.5 border-t border-border-subtle text-[10px] text-foreground-subtle">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 h-4 bg-surface-2 border border-border rounded">↑↓</kbd>
                            navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 h-4 bg-surface-2 border border-border rounded">↵</kbd>
                            select
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 h-4 bg-surface-2 border border-border rounded">esc</kbd>
                            close
                        </span>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

/** Substring match across whitespace-separated tokens. */
function match(haystack: string, needle: string): boolean {
    if (!needle) return true;
    const h = haystack.toLowerCase();
    return needle
        .split(/\s+/)
        .filter(Boolean)
        .every((tok) => h.includes(tok));
}

/** Rank items by best-prefix > word-start > substring > contains. */
function rank<T extends { title: string; group?: string; keywords?: string[] }>(
    items: T[],
    query: string,
): T[] {
    if (!query) return items;
    const score = (it: T) => {
        const t = it.title.toLowerCase();
        if (t.startsWith(query)) return 0;
        if (t.includes(' ' + query)) return 1;
        if (t.includes(query)) return 2;
        const meta = `${it.group ?? ''} ${it.keywords?.join(' ') ?? ''}`.toLowerCase();
        if (meta.includes(query)) return 3;
        return 4;
    };
    return items.slice().sort((a, b) => score(a) - score(b));
}

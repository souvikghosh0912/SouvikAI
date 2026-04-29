'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Search, CircleDashed, LayoutGrid, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/date-helpers';
import type { BuilderWorkspaceSummary } from '@/types/code';
import { useProjects } from '@/hooks/useProjects';
import type { Project } from '@/types/projects';

interface CodeSearchModalProps {
    open: boolean;
    onClose: () => void;
    workspaces: BuilderWorkspaceSummary[];
}

type SearchItem =
    | { type: 'workspace'; item: BuilderWorkspaceSummary }
    | { type: 'project'; item: Project };

export function CodeSearchModal({ open, onClose, workspaces }: CodeSearchModalProps) {
    const router = useRouter();
    const { projects } = useProjects();
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Compute filtered items
    const filteredItems: SearchItem[] = [];
    
    if (query.trim()) {
        const lowerQuery = query.toLowerCase();
        
        // Match projects
        for (const p of projects) {
            if (p.name.toLowerCase().includes(lowerQuery)) {
                filteredItems.push({ type: 'project', item: p });
            }
        }
        
        // Match workspaces
        for (const w of workspaces) {
            if (w.title.toLowerCase().includes(lowerQuery)) {
                filteredItems.push({ type: 'workspace', item: w });
            }
        }
    } else {
        // Default empty state: all projects, up to 15 workspaces
        projects.forEach(p => filteredItems.push({ type: 'project', item: p }));
        workspaces.slice(0, 15).forEach(w => filteredItems.push({ type: 'workspace', item: w }));
    }

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setQuery('');
            setActiveIndex(0);
            // Focus input after animation frame
            requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
        }
    }, [open]);

    // Reset active index when results change
    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    // Scroll active item into view
    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const active = list.querySelector<HTMLElement>('[data-active="true"]');
        active?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const handleSelect = useCallback(
        (item: SearchItem) => {
            if (item.type === 'project') {
                router.push(`/projects/${item.item.id}`);
            } else {
                router.push(`/code/${item.item.id}`);
            }
            onClose();
        },
        [router, onClose]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(i => Math.min(i + 1, filteredItems.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(i => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const item = filteredItems[activeIndex];
                if (item) handleSelect(item);
            } else if (e.key === 'Escape') {
                onClose();
            }
        },
        [filteredItems, activeIndex, handleSelect, onClose]
    );

    if (!open) return null;

    // Separate them for grouped rendering if no query
    const projectsList = filteredItems.filter(i => i.type === 'project');
    const workspacesList = filteredItems.filter(i => i.type === 'workspace');

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/60"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed top-[18%] left-1/2 -translate-x-1/2 z-50 w-full max-w-[420px] px-4">
                <div className="bg-popover text-popover-foreground rounded-xl border border-border shadow-overlay overflow-hidden">
                    {/* Search input row */}
                    <div className="flex items-center gap-2 px-3 h-10 border-b border-border-subtle">
                        <Search className="h-4 w-4 text-foreground-muted shrink-0" />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search projects and chats…"
                            className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-foreground-subtle outline-none"
                        />
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                className="text-foreground-muted hover:text-foreground transition-colors"
                                aria-label="Clear search"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Results */}
                    <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
                        {filteredItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 gap-1.5 text-foreground-muted">
                                <CircleDashed className="h-5 w-5 opacity-30" />
                                <p className="text-[12px]">No results found</p>
                            </div>
                        ) : query.trim() ? (
                            // Flat list when searching
                            filteredItems.map((item, i) => (
                                <SearchItemRow 
                                    key={`${item.type}-${item.type === 'project' ? item.item.id : item.item.id}`}
                                    item={item}
                                    index={i}
                                    activeIndex={activeIndex}
                                    query={query}
                                    onSelect={() => handleSelect(item)}
                                    onHover={() => setActiveIndex(i)}
                                />
                            ))
                        ) : (
                            // Grouped list when empty
                            <div className="flex flex-col">
                                {projectsList.length > 0 && (
                                    <div className="mb-2">
                                        <div className="px-3 py-1.5 text-[10px] text-foreground-subtle uppercase tracking-wider font-semibold">
                                            Projects
                                        </div>
                                        {projectsList.map((item, localIdx) => (
                                            <SearchItemRow 
                                                key={`p-${item.item.id}`}
                                                item={item}
                                                index={localIdx}
                                                activeIndex={activeIndex}
                                                query={query}
                                                onSelect={() => handleSelect(item)}
                                                onHover={() => setActiveIndex(localIdx)}
                                            />
                                        ))}
                                    </div>
                                )}
                                
                                {workspacesList.length > 0 && (
                                    <div>
                                        <div className="px-3 py-1.5 text-[10px] text-foreground-subtle uppercase tracking-wider font-semibold">
                                            Recent Chats
                                        </div>
                                        {workspacesList.map((item, localIdx) => (
                                            <SearchItemRow 
                                                key={`w-${item.item.id}`}
                                                item={item}
                                                index={projectsList.length + localIdx}
                                                activeIndex={activeIndex}
                                                query={query}
                                                onSelect={() => handleSelect(item)}
                                                onHover={() => setActiveIndex(projectsList.length + localIdx)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer hint */}
                    <div className="px-3 h-8 border-t border-border-subtle flex items-center gap-3 text-[11px] text-foreground-subtle">
                        <span className="flex items-center gap-1">
                            <kbd className="font-mono bg-surface-2 border border-border rounded px-1">↑↓</kbd>
                            nav
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="font-mono bg-surface-2 border border-border rounded px-1">↵</kbd>
                            open
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="font-mono bg-surface-2 border border-border rounded px-1">Esc</kbd>
                            close
                        </span>
                        <span className="ml-auto">
                            {filteredItems.length} results
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}

function SearchItemRow({ 
    item, 
    index, 
    activeIndex, 
    query, 
    onSelect, 
    onHover 
}: { 
    item: SearchItem, 
    index: number, 
    activeIndex: number, 
    query: string,
    onSelect: () => void,
    onHover: () => void
}) {
    const isProject = item.type === 'project';
    const title = isProject ? (item.item as Project).name : (item.item as BuilderWorkspaceSummary).title;
    const updatedAt = item.item.updatedAt;

    return (
        <button
            data-active={index === activeIndex}
            onClick={onSelect}
            onMouseEnter={onHover}
            className={cn(
                'w-full flex items-center gap-3 px-3 h-10 text-left transition-colors',
                index === activeIndex
                    ? 'bg-surface-2 text-foreground'
                    : 'text-foreground-muted hover:text-foreground'
            )}
        >
            {isProject ? (
                <LayoutGrid className="h-4 w-4 shrink-0 text-foreground-subtle" />
            ) : (
                <CircleDashed className="h-4 w-4 shrink-0 text-foreground-subtle" />
            )}
            <p className="flex-1 min-w-0 text-[13px] truncate">
                {query ? highlightMatch(title, query) : title}
            </p>
            <span className="text-[11px] text-foreground-subtle shrink-0">
                {formatRelativeTime(updatedAt)}
            </span>
        </button>
    );
}

/** Wraps matched substring in a <mark> for highlighting */
function highlightMatch(text: string, query: string) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="bg-transparent text-foreground font-semibold">
                {text.slice(idx, idx + query.length)}
            </mark>
            {text.slice(idx + query.length)}
        </>
    );
}

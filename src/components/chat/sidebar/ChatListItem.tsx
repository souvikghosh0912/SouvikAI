'use client';

import { useEffect, useRef, useState } from 'react';
import {
    Archive,
    GitBranch,
    MoreHorizontal,
    Pencil,
    Pin,
    Trash2,
} from 'lucide-react';
import { SimpleTooltip } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { ChatSession } from '@/types/chat';

export interface ChatListItemProps {
    session: ChatSession;
    isActive: boolean;
    onSelect: () => void;
    onPin: () => void;
    onArchive: () => void;
    onDelete: () => void;
    onRename?: (sessionId: string, title: string) => void;
    onBranch?: () => void;
}

/**
 * One row in the desktop sidebar's chat list: title, hover-revealed "more"
 * button, and the floating dropdown menu (pin, rename, branch, archive,
 * delete). Renaming happens inline by replacing the title with an input —
 * Enter saves, Escape reverts, blur saves.
 *
 * The dropdown is positioned via fixed coordinates so it can escape the
 * sidebar's `overflow-y-auto` clip without needing a Portal.
 */
export function ChatListItem({
    session,
    isActive,
    onSelect,
    onPin,
    onArchive,
    onDelete,
    onRename,
    onBranch,
}: ChatListItemProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(session.title);
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(e.target as Node) &&
                btnRef.current && !btnRef.current.contains(e.target as Node)
            ) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    useEffect(() => {
        if (isRenaming) {
            requestAnimationFrame(() => {
                renameInputRef.current?.focus();
                renameInputRef.current?.select();
            });
        }
    }, [isRenaming]);

    const openMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
        }
        setMenuOpen((o) => !o);
    };

    const startRename = () => {
        setRenameValue(session.title);
        setIsRenaming(true);
    };

    const commitRename = () => {
        const trimmed = renameValue.trim();
        if (trimmed && trimmed !== session.title && onRename) {
            onRename(session.id, trimmed);
        }
        setIsRenaming(false);
    };

    const cancelRename = () => {
        setRenameValue(session.title);
        setIsRenaming(false);
    };

    return (
        <>
            <div
                className={cn(
                    'group relative flex items-center gap-1.5 pl-2 pr-1 h-8 rounded-md transition-colors duration-150 text-[13px]',
                    isRenaming
                        ? 'bg-surface-3'
                        : isActive
                            ? 'bg-surface-3 text-foreground cursor-pointer'
                            : 'text-foreground-muted hover:bg-surface-2 hover:text-foreground cursor-pointer'
                )}
                onClick={isRenaming ? undefined : onSelect}
            >
                {isRenaming ? (
                    <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                commitRename();
                            } else if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelRename();
                            }
                        }}
                        onBlur={commitRename}
                        onClick={(e) => e.stopPropagation()}
                        maxLength={120}
                        className="flex-1 min-w-0 bg-transparent text-foreground text-[13px] outline-none"
                    />
                ) : (
                    <span className="flex-1 min-w-0 truncate leading-none">{session.title}</span>
                )}

                {!isRenaming && (
                    <SimpleTooltip content="More options" side="top" disabled={menuOpen}>
                        <button
                            ref={btnRef}
                            onClick={openMenu}
                            aria-label="More options"
                            className={cn(
                                'shrink-0 h-6 w-6 flex items-center justify-center rounded transition-all',
                                menuOpen
                                    ? 'bg-surface-3 text-foreground opacity-100'
                                    : 'text-foreground-subtle hover:bg-surface-3 hover:text-foreground opacity-0 group-hover:opacity-100',
                                isActive && 'opacity-100'
                            )}
                        >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                    </SimpleTooltip>
                )}
            </div>

            {menuOpen && (
                <div
                    ref={menuRef}
                    style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
                    className="min-w-[160px] bg-popover text-popover-foreground rounded-lg border border-border shadow-overlay py-1"
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPin();
                            setMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                    >
                        <Pin className="h-3.5 w-3.5 rotate-45" />
                        {session.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    {onRename && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                startRename();
                                setMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            Rename
                        </button>
                    )}
                    {onBranch && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onBranch();
                                setMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                        >
                            <GitBranch className="h-3.5 w-3.5" />
                            Branch
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onArchive();
                            setMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                    >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                    </button>
                    <div className="my-1 h-px bg-border-subtle" />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                            setMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                    </button>
                </div>
            )}
        </>
    );
}

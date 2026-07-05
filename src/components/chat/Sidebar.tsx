'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    MessageSquare,
    PanelLeftClose,
    PanelLeftOpen,
    X,
    Pin,
    LayoutList,
} from 'lucide-react';
import { Button, SimpleTooltip } from '@/components/ui';
import { ChatSession } from '@/types/chat';
import type { Project } from '@/types/projects';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { SettingsModal } from '@/components/chat/settings/SettingsModal';
import { ProjectsSection } from '@/components/chat/ProjectsSection';
import { ProjectModal } from '@/components/chat/ProjectModal';
import { ConfirmModal } from '@/components/chat/ConfirmModal';

import { BrandMark } from './sidebar/BrandMark';
import { UserMenu } from './sidebar/UserMenu';
import { ChatListItem } from './sidebar/ChatListItem';
import { groupSessions } from './sidebar/groups';
import {
    SCROLLABLE_NAV_ITEMS,
    STICKY_NAV_ITEMS,
} from './sidebar/nav-config';

interface SidebarProps {
    sessions: ChatSession[];
    currentSessionId: string | null;
    onNewChat: () => void;
    onSelectSession: (sessionId: string) => void;
    onDeleteSession: (sessionId: string) => void;
    onPinSession: (sessionId: string) => void;
    onArchiveSession: (sessionId: string) => void;
    onRenameSession?: (sessionId: string, title: string) => void;
    /** Branch this chat — creates a new session that copies the existing history. */
    onBranchSession?: (sessionId: string) => void;
    onSearch: () => void;
    /** Called when an archived chat is selected from Settings — loads it in the main view. */
    onOpenArchivedChat?: (sessionId: string) => void;
    isMobileOpen?: boolean;
    onMobileClose?: () => void;
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 420;
const COLLAPSED_WIDTH = 56;

export function Sidebar({
    sessions,
    currentSessionId,
    onNewChat,
    onSelectSession,
    onDeleteSession,
    onPinSession,
    onArchiveSession,
    onRenameSession,
    onBranchSession,
    onSearch,
    onOpenArchivedChat,
    isMobileOpen = false,
    onMobileClose,
}: SidebarProps) {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(244);
    const [isDragging, setIsDragging] = useState(false);

    const goToAllChats = useCallback(() => {
        onMobileClose?.();
        router.push('/chats');
    }, [router, onMobileClose]);

    const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
    const initial = displayName.charAt(0).toUpperCase();

    // Sessions that belong to a project are listed inside that project's page.
    // The main sidebar list shows only "loose" (top-level) chats so the same
    // chat never appears twice.
    const looseSessions = useMemo(
        () => sessions.filter((s) => !s.projectId),
        [sessions]
    );
    const groups = useMemo(() => groupSessions(looseSessions), [looseSessions]);

    // ── Projects state ──────────────────────────────────────────────────
    const activeProjectId = useMemo(() => {
        const match = pathname?.match(/^\/projects\/([^/]+)/);
        return match ? match[1] : null;
    }, [pathname]);

    const { projects, createProject, renameProject, deleteProject } = useProjects();
    const [createOpen, setCreateOpen] = useState(false);
    const [renameTarget, setRenameTarget] = useState<Project | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

    const handleSelectProject = useCallback((id: string) => {
        onMobileClose?.();
        router.push(`/projects/${id}`);
    }, [router, onMobileClose]);

    const handleCreateSubmit = useCallback(async (name: string) => {
        const project = await createProject(name);
        if (project) {
            // Drop the user straight into their new (empty) project.
            router.push(`/projects/${project.id}`);
            onMobileClose?.();
        }
    }, [createProject, router, onMobileClose]);

    const handleRenameSubmit = useCallback(async (name: string) => {
        if (renameTarget) await renameProject(renameTarget.id, name);
    }, [renameTarget, renameProject]);

    const handleDeleteConfirm = useCallback(() => {
        if (!deleteTarget) return;
        const id = deleteTarget.id;
        // If we're currently viewing the project being deleted, navigate home.
        if (activeProjectId === id) router.push('/');
        void deleteProject(id);
    }, [deleteTarget, deleteProject, activeProjectId, router]);

    // ── Drag-to-resize ──────────────────────────────────────────────────
    const startDrag = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        const startX = e.clientX;
        const startWidth = sidebarWidth;

        const onMouseMove = (ev: MouseEvent) => {
            const delta = ev.clientX - startX;
            setSidebarWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta)));
        };
        const onMouseUp = () => {
            setIsDragging(false);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [sidebarWidth]);

    // Cleanup drag listeners on unmount in case the component unmounts mid-drag.
    useEffect(() => {
        return () => {
            // Best-effort — useCallback's listeners are anonymous, but if a
            // drag is in progress the next mouseup will clean itself up.
        };
    }, []);

    return (
        <>
            {/* ── Mobile overlay ── */}
            {isMobileOpen && (
                <div className="sidebar-overlay md:hidden" onClick={onMobileClose} />
            )}

            {/* ── Mobile sidebar drawer ── */}
            {isMobileOpen && (
                <div className="sidebar-drawer md:hidden w-[256px] bg-surface text-foreground border-r border-border flex flex-col h-full safe-top safe-bottom">
                    <div className="flex items-center justify-between px-3 h-12 border-b border-border-subtle">
                        <BrandMark />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMobileClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <nav className="px-2 py-2 space-y-0.5 shrink-0">
                        {STICKY_NAV_ITEMS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.action}
                                    onClick={
                                        item.action === 'new-chat' ? onNewChat
                                        : item.action === 'search' ? onSearch
                                        : undefined
                                    }
                                    className="w-full flex items-center gap-2.5 px-2 h-9 rounded-md text-[13px] text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span className="flex-1 text-left">{item.label}</span>
                                    {item.shortcut && (
                                        <kbd className="text-[10px] font-mono text-foreground-subtle bg-surface-2 border border-border rounded px-1 py-0.5">
                                            {item.shortcut}
                                        </kbd>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="h-px bg-border-subtle mx-2" />

                    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-2">
                        <nav className="space-y-0.5 mb-3">
                            {SCROLLABLE_NAV_ITEMS.map((item) => {
                                const Icon = item.icon;
                                const handleClick = () => {
                                    if (item.href) {
                                        onMobileClose?.();
                                        router.push(item.href);
                                    }
                                };
                                return (
                                    <button
                                        key={item.action}
                                        onClick={handleClick}
                                        className="w-full flex items-center gap-2.5 px-2 h-9 rounded-md text-[13px] text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span className="flex-1 text-left">{item.label}</span>
                                    </button>
                                );
                            })}
                        </nav>

                        <ProjectsSection
                            projects={projects}
                            activeProjectId={activeProjectId}
                            onCreateProject={() => setCreateOpen(true)}
                            onSelectProject={handleSelectProject}
                            onRenameProject={setRenameTarget}
                            onDeleteProject={setDeleteTarget}
                        />

                        {groups.map((group) => (
                            <div key={group.label} className="mb-3 last:mb-0">
                                <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                                    {group.label}
                                </div>
                                <div className="space-y-0.5">
                                    {group.sessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className={cn(
                                                'flex items-center gap-2 px-2 h-9 rounded-md cursor-pointer transition-colors text-[13px]',
                                                currentSessionId === session.id
                                                    ? 'bg-surface-3 text-foreground'
                                                    : 'hover:bg-surface-2 text-foreground-muted hover:text-foreground'
                                            )}
                                            onClick={() => onSelectSession(session.id)}
                                        >
                                            {session.isPinned ? (
                                                <Pin className="h-3 w-3 shrink-0 text-foreground-subtle rotate-45" />
                                            ) : (
                                                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-foreground-subtle" />
                                            )}
                                            <span className="flex-1 truncate">{session.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="h-px bg-border-subtle mx-2" />

                    <div className="px-2 py-1.5">
                        <button
                            onClick={goToAllChats}
                            className="w-full flex items-center gap-2.5 px-2 h-9 rounded-md text-[13px] text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                        >
                            <LayoutList className="h-4 w-4 shrink-0" />
                            <span className="flex-1 text-left">View all chats</span>
                        </button>
                    </div>

                    <div className="h-px bg-border-subtle mx-2" />

                    <div className="p-2">
                        <UserMenu
                            user={user}
                            displayName={displayName}
                            initial={initial}
                            collapsed={false}
                            onOpenSettings={() => setIsSettingsOpen(true)}
                            onSignOut={() => signOut()}
                        />
                    </div>
                </div>
            )}

            {/* ── Desktop sidebar ── */}
            <div
                className="hidden md:block md:relative md:flex-shrink-0 h-full transition-[width] duration-200 ease-out"
                style={{ width: isCollapsed ? COLLAPSED_WIDTH : sidebarWidth }}
            >
                <div className="flex flex-col w-full h-full bg-surface text-foreground border-r border-border overflow-hidden">

                    {/* ── Header: brand + collapse toggle ── */}
                    <div
                        className={cn(
                            'flex items-center h-12 px-2 shrink-0',
                            isCollapsed ? 'flex-col gap-1.5 h-auto py-2' : 'justify-between'
                        )}
                    >
                        <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'pl-1')}>
                            <BrandMark withWordmark={!isCollapsed} />
                        </div>
                        <SimpleTooltip
                            content={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            side={isCollapsed ? 'right' : 'bottom'}
                        >
                            <button
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                className="text-foreground-muted hover:text-foreground transition-colors h-7 w-7 flex items-center justify-center rounded-md hover:bg-surface-2"
                            >
                                {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                            </button>
                        </SimpleTooltip>
                    </div>

                    {/* ── Sticky primary nav (always pinned above chat list) ── */}
                    <nav className={cn('px-2 space-y-0.5 shrink-0', isCollapsed && 'px-1.5')}>
                        {STICKY_NAV_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const isNewChat = item.action === 'new-chat';
                            const isSearch = item.action === 'search';
                            const handler = isNewChat ? onNewChat : isSearch ? onSearch : undefined;

                            return (
                                <SimpleTooltip
                                    key={item.action}
                                    content={
                                        isSearch ? (
                                            <span className="flex items-center gap-1.5">
                                                {item.label}
                                                <kbd className="text-[10px] font-mono bg-surface-2 border border-border rounded px-1 py-px">⌘K</kbd>
                                            </span>
                                        ) : (
                                            item.label
                                        )
                                    }
                                    side="right"
                                    disabled={!isCollapsed}
                                >
                                    <button
                                        onClick={handler}
                                        aria-label={item.label}
                                        className={cn(
                                            'w-full flex items-center text-[13px] text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors duration-150 rounded-md',
                                            isCollapsed
                                                ? 'h-8 w-8 mx-auto justify-center'
                                                : 'gap-2.5 px-2 h-8'
                                        )}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        {!isCollapsed && (
                                            <>
                                                <span className="flex-1 text-left">{item.label}</span>
                                                {isSearch && (
                                                    <kbd className="text-[10px] font-mono text-foreground-subtle bg-surface-2 border border-border rounded px-1 py-px">
                                                        ⌘K
                                                    </kbd>
                                                )}
                                            </>
                                        )}
                                    </button>
                                </SimpleTooltip>
                            );
                        })}
                    </nav>

                    {/* ── Chats section (scrollable: secondary nav + chat groups) ── */}
                    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden mt-2">
                        {/* Secondary nav scrolls along with the chat list */}
                        <nav
                            className={cn(
                                'space-y-0.5',
                                isCollapsed ? 'px-1.5 pb-2' : 'px-2 pb-2'
                            )}
                        >
                            {SCROLLABLE_NAV_ITEMS.map((item) => {
                                const Icon = item.icon;
                                const handleClick = () => {
                                    if (item.href) router.push(item.href);
                                };
                                return (
                                    <SimpleTooltip
                                        key={item.action}
                                        content={item.label}
                                        side="right"
                                        disabled={!isCollapsed}
                                    >
                                        <button
                                            onClick={handleClick}
                                            aria-label={item.label}
                                            className={cn(
                                                'w-full flex items-center text-[13px] text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors duration-150 rounded-md',
                                                isCollapsed
                                                    ? 'h-8 w-8 mx-auto justify-center'
                                                    : 'gap-2.5 px-2 h-8'
                                            )}
                                        >
                                            <Icon className="h-4 w-4 shrink-0" />
                                            {!isCollapsed && (
                                                <span className="flex-1 text-left">{item.label}</span>
                                            )}
                                        </button>
                                    </SimpleTooltip>
                                );
                            })}
                        </nav>

                        {!isCollapsed && (
                            <div className="px-2 pb-1">
                                <ProjectsSection
                                    projects={projects}
                                    activeProjectId={activeProjectId}
                                    onCreateProject={() => setCreateOpen(true)}
                                    onSelectProject={handleSelectProject}
                                    onRenameProject={setRenameTarget}
                                    onDeleteProject={setDeleteTarget}
                                />
                            </div>
                        )}

                        {!isCollapsed && groups.length > 0 && (
                            <div className="px-2 pb-2">
                                {groups.map((group) => (
                                    <div key={group.label} className="mb-3 last:mb-1">
                                        <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                                            {group.label}
                                        </div>
                                        <div className="space-y-px">
                                            {group.sessions.map((session) => (
                                                <ChatListItem
                                                    key={session.id}
                                                    session={session}
                                                    isActive={currentSessionId === session.id}
                                                    onSelect={() => onSelectSession(session.id)}
                                                    onPin={() => onPinSession(session.id)}
                                                    onArchive={() => onArchiveSession(session.id)}
                                                    onDelete={() => onDeleteSession(session.id)}
                                                    onRename={onRenameSession}
                                                    onBranch={onBranchSession ? () => onBranchSession(session.id) : undefined}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!isCollapsed && groups.length === 0 && (
                            <div className="px-4 py-6 text-center">
                                <p className="text-[12px] text-foreground-muted">No chats yet</p>
                                <p className="text-[11px] text-foreground-subtle mt-0.5">Start a new chat to begin</p>
                            </div>
                        )}

                        {isCollapsed && sessions.length > 0 && (
                            <div className="px-1.5 py-1 space-y-1">
                                {sessions.slice(0, 12).map((session) => (
                                    <SimpleTooltip key={session.id} content={session.title} side="right">
                                        <button
                                            aria-label={session.title}
                                            className={cn(
                                                'w-8 h-8 mx-auto flex items-center justify-center rounded-md cursor-pointer transition-colors',
                                                currentSessionId === session.id
                                                    ? 'bg-surface-3 text-foreground'
                                                    : 'hover:bg-surface-2 text-foreground-muted hover:text-foreground'
                                            )}
                                            onClick={() => onSelectSession(session.id)}
                                        >
                                            {session.isPinned ? (
                                                <Pin className="h-3.5 w-3.5 rotate-45" />
                                            ) : (
                                                <MessageSquare className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </SimpleTooltip>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── View all chats ── */}
                    <div className={cn('shrink-0 border-t border-border-subtle', isCollapsed ? 'p-1.5' : 'px-2 py-1.5')}>
                        <SimpleTooltip content="View all chats" side="right" disabled={!isCollapsed}>
                            <button
                                onClick={goToAllChats}
                                aria-label="View all chats"
                                className={cn(
                                    'w-full flex items-center text-[13px] text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors duration-150 rounded-md',
                                    isCollapsed
                                        ? 'h-8 w-8 mx-auto justify-center'
                                        : 'gap-2.5 px-2 h-8'
                                )}
                            >
                                <LayoutList className="h-4 w-4 shrink-0" />
                                {!isCollapsed && (
                                    <span className="flex-1 text-left">View all chats</span>
                                )}
                            </button>
                        </SimpleTooltip>
                    </div>

                    {/* ── Footer: user menu ── */}
                    <div className={cn('shrink-0 border-t border-border-subtle', isCollapsed ? 'p-1.5' : 'p-2')}>
                        <UserMenu
                            user={user}
                            displayName={displayName}
                            initial={initial}
                            collapsed={isCollapsed}
                            onOpenSettings={() => setIsSettingsOpen(true)}
                            onSignOut={() => signOut()}
                        />
                    </div>
                </div>

                {/* Drag handle */}
                {!isCollapsed && (
                    <SimpleTooltip content="Drag to resize" side="right" disabled={isDragging}>
                        <div
                            onMouseDown={startDrag}
                            role="separator"
                            aria-orientation="vertical"
                            aria-label="Resize sidebar"
                            className={cn(
                                'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-40 transition-colors',
                                isDragging ? 'bg-ring/60' : 'hover:bg-ring/30'
                            )}
                        />
                    </SimpleTooltip>
                )}
            </div>

            <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} onOpenArchivedChat={onOpenArchivedChat} />

            {/* Create new project */}
            <ProjectModal
                open={createOpen}
                mode="create"
                onClose={() => setCreateOpen(false)}
                onSubmit={handleCreateSubmit}
            />

            {/* Rename project */}
            <ProjectModal
                open={renameTarget !== null}
                mode="rename"
                initialName={renameTarget?.name ?? ''}
                onClose={() => setRenameTarget(null)}
                onSubmit={handleRenameSubmit}
            />

            {/* Delete project confirmation */}
            <ConfirmModal
                open={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
                title="Delete project?"
                description={
                    deleteTarget
                        ? `“${deleteTarget.name}” will be deleted. Chats inside this project will be moved back to your main chat list — they won't be deleted.`
                        : ''
                }
                confirmLabel="Delete"
                confirmVariant="danger"
            />
        </>
    );
}

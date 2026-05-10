'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
    ChevronsLeft,
    File as FileIcon,
    RefreshCw,
    Search,
    Settings as SettingsIcon,
    Code2,
    Eye,
    Database,
    ChevronDown,
    SquareTerminal,
    MoreHorizontal,
    Copy,
    Columns2,
    GitCompare,
    Map as MapIcon,
    PanelLeft,
    Replace,
    SplitSquareHorizontal,
    Type,
    Accessibility,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, SimpleTooltip } from '@/components/ui';
import { BuilderChatPanel } from './BuilderChatPanel';
import { CodeEditor, type CodeEditorHandle } from '../editor/CodeEditor';
import { EditorTabs } from '../editor/EditorTabs';
import { Breadcrumb } from '../editor/Breadcrumb';
import { Minimap } from '../editor/Minimap';
import { StatusBar } from '../editor/StatusBar';
import {
    EditorSettingsProvider,
    useEditorSettings,
} from '../editor/EditorSettingsProvider';
import { CommandPalette, type Command } from '../editor/CommandPalette';
import { EditorSettingsDialog } from '../editor/EditorSettingsDialog';
import { CodePreview } from './CodePreview';
import { DiffPanel } from './DiffPanel';
import { FileTree } from './FileTree';
import { ExplorerHeader } from './ExplorerHeader';
import { ViewToggle, type WorkspaceView } from './ViewToggle';
import { useHotkeys } from '@/lib/hotkeys';
import type { BuilderFiles, BuilderMessage } from '@/types/code';
import type { AIModel } from '@/types/chat';

interface CodeWorkspaceProps {
    title: string;
    files: BuilderFiles;
    activeFile: string | null;
    messages: BuilderMessage[];
    isStreaming: boolean;
    error: string | null;
    models: AIModel[];
    selectedModelId: string;
    onModelChange: (id: string) => void;
    onSelectFile: (path: string | null) => void;
    onUpdateFile: (path: string, content: string) => void;
    onSend: (text: string) => void;
    onStop: () => void;
    onAcceptChanges: (messageId: string, paths?: string[] | null) => Promise<void>;
    onRejectChanges: (messageId: string, paths?: string[] | null) => Promise<void>;
}

const CHAT_WIDTH_STORAGE_KEY = 'code:chatPanelWidth';
const CHAT_WIDTH_DEFAULT = 360;
const CHAT_WIDTH_MIN = 260;
const CHAT_WIDTH_MAX_FALLBACK = 720;

function clampWidth(width: number, viewport: number): number {
    const upper = Math.max(
        CHAT_WIDTH_MIN,
        Math.min(CHAT_WIDTH_MAX_FALLBACK, viewport - 360),
    );
    return Math.max(CHAT_WIDTH_MIN, Math.min(upper, width));
}

/** Outer wrapper that mounts the EditorSettingsProvider before the inner
 * workspace, so any descendant (including the editor itself) can read
 * settings via {@link useEditorSettings}. */
export function CodeWorkspace(props: CodeWorkspaceProps) {
    return (
        <EditorSettingsProvider>
            <CodeWorkspaceInner {...props} />
        </EditorSettingsProvider>
    );
}

function CodeWorkspaceInner(props: CodeWorkspaceProps) {
    const [view, setView] = useState<WorkspaceView>('editor');
    const [mobileTab, setMobileTab] = useState<'chat' | 'right'>('chat');
    const [reloadKey, setReloadKey] = useState(0);

    const [openTabs, setOpenTabs] = useState<string[]>([]);
    const [showFileTree, setShowFileTree] = useState(true);
    const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [paletteMode, setPaletteMode] = useState<'command' | 'files'>('command');
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [collapseSignal, setCollapseSignal] = useState(0);

    const editorRef = useRef<CodeEditorHandle>(null);
    const editorHostRef = useRef<HTMLDivElement>(null);

    const { settings, update } = useEditorSettings();

    // ── Tab management ────────────────────────────────────────────────────
    useEffect(() => {
        if (props.activeFile && !openTabs.includes(props.activeFile)) {
            setOpenTabs((prev) => [...prev, props.activeFile!]);
        }
    }, [props.activeFile, openTabs]);

    const closeTab = useCallback(
        (path: string) => {
            setOpenTabs((prev) => {
                const next = prev.filter((p) => p !== path);
                if (props.activeFile === path) {
                    const fallback = next[next.length - 1] ?? null;
                    props.onSelectFile(fallback);
                }
                return next;
            });
        },
        [props],
    );

    const pendingReviewCount = useMemo(() => {
        let n = 0;
        for (const m of props.messages) n += m.review?.pending.length ?? 0;
        return n;
    }, [props.messages]);

    useEffect(() => {
        if (view === 'review' && pendingReviewCount === 0) setView('editor');
    }, [view, pendingReviewCount]);

    const handleOpenReview = useCallback(() => {
        setView('review');
        setMobileTab('right');
    }, []);

    // ── Resizable chat pane (unchanged behavior) ──────────────────────────
    const [isDesktop, setIsDesktop] = useState(false);
    const [chatWidth, setChatWidth] = useState<number>(CHAT_WIDTH_DEFAULT);
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<{ startX: number; startWidth: number; active: boolean }>({
        startX: 0,
        startWidth: CHAT_WIDTH_DEFAULT,
        active: false,
    });
    const chatWidthRef = useRef(chatWidth);
    useEffect(() => {
        chatWidthRef.current = chatWidth;
    }, [chatWidth]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mq = window.matchMedia('(min-width: 768px)');
        const update = () => setIsDesktop(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        let initial = CHAT_WIDTH_DEFAULT;
        try {
            const stored = window.localStorage.getItem(CHAT_WIDTH_STORAGE_KEY);
            const parsed = stored ? Number.parseInt(stored, 10) : NaN;
            if (Number.isFinite(parsed)) initial = parsed;
        } catch {
            /* ignore */
        }
        setChatWidth((prev) => clampWidth(initial || prev, window.innerWidth));
        const onResize = () => setChatWidth((prev) => clampWidth(prev, window.innerWidth));
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onMove = (clientX: number) => {
            const drag = dragRef.current;
            if (!drag.active) return;
            const delta = clientX - drag.startX;
            setChatWidth(clampWidth(drag.startWidth + delta, window.innerWidth));
        };
        const onMouseMove = (e: MouseEvent) => onMove(e.clientX);
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 0) return;
            onMove(e.touches[0].clientX);
            if (dragRef.current.active && e.cancelable) e.preventDefault();
        };
        const stop = () => {
            const drag = dragRef.current;
            if (!drag.active) return;
            drag.active = false;
            setIsDragging(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            try {
                window.localStorage.setItem(
                    CHAT_WIDTH_STORAGE_KEY,
                    String(Math.round(chatWidthRef.current)),
                );
            } catch {
                /* ignore */
            }
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', stop);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', stop);
        window.addEventListener('touchcancel', stop);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', stop);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', stop);
            window.removeEventListener('touchcancel', stop);
        };
    }, []);

    const beginDrag = useCallback((clientX: number) => {
        dragRef.current = {
            startX: clientX,
            startWidth: chatWidthRef.current,
            active: true,
        };
        setIsDragging(true);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const onHandleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (e.button !== 0) return;
            e.preventDefault();
            beginDrag(e.clientX);
        },
        [beginDrag],
    );

    const onHandleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            if (e.touches.length === 0) return;
            beginDrag(e.touches[0].clientX);
        },
        [beginDrag],
    );

    const onHandleDoubleClick = useCallback(() => {
        if (typeof window === 'undefined') return;
        const next = clampWidth(CHAT_WIDTH_DEFAULT, window.innerWidth);
        setChatWidth(next);
        try {
            window.localStorage.setItem(CHAT_WIDTH_STORAGE_KEY, String(next));
        } catch {
            /* ignore */
        }
    }, []);

    const onHandleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (typeof window === 'undefined') return;
        const step = e.shiftKey ? 32 : 16;
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setChatWidth((w) => clampWidth(w - step, window.innerWidth));
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            setChatWidth((w) => clampWidth(w + step, window.innerWidth));
        } else if (e.key === 'Home') {
            e.preventDefault();
            setChatWidth(CHAT_WIDTH_MIN);
        } else if (e.key === 'End') {
            e.preventDefault();
            setChatWidth(clampWidth(CHAT_WIDTH_MAX_FALLBACK, window.innerWidth));
        }
    }, []);

    const activeContent =
        props.activeFile != null ? props.files[props.activeFile] ?? '' : '';
    const fileCount = Object.keys(props.files).length;
    const fileList = useMemo(() => Object.keys(props.files).sort(), [props.files]);

    // ── Commands & hotkeys ────────────────────────────────────────────────
    const openPalette = useCallback((mode: 'command' | 'files' = 'command') => {
        setPaletteMode(mode);
        setPaletteOpen(true);
    }, []);

    const commands = useMemo<Command[]>(() => {
        const cmds: Command[] = [
            {
                id: 'view.editor',
                title: 'Show Editor',
                group: 'View',
                icon: <Code2 className="h-3.5 w-3.5" />,
                shortcut: 'mod+1',
                run: () => setView('editor'),
            },
            {
                id: 'view.preview',
                title: 'Show Preview',
                group: 'View',
                icon: <Eye className="h-3.5 w-3.5" />,
                shortcut: 'mod+2',
                run: () => setView('preview'),
            },
            {
                id: 'view.review',
                title: 'Show Review',
                group: 'View',
                icon: <GitCompare className="h-3.5 w-3.5" />,
                shortcut: 'mod+3',
                hidden: pendingReviewCount === 0,
                run: () => setView('review'),
            },
            {
                id: 'view.toggleFileTree',
                title: showFileTree ? 'Hide File Tree' : 'Show File Tree',
                group: 'View',
                icon: <PanelLeft className="h-3.5 w-3.5" />,
                shortcut: 'mod+b',
                run: () => setShowFileTree((v) => !v),
            },
            {
                id: 'view.toggleMinimap',
                title: settings.minimap ? 'Hide Minimap' : 'Show Minimap',
                group: 'View',
                icon: <MapIcon className="h-3.5 w-3.5" />,
                shortcut: 'mod+\\',
                run: () => update('minimap', !settings.minimap),
            },
            {
                id: 'view.preview.reload',
                title: 'Reload Preview',
                group: 'View',
                icon: <RefreshCw className="h-3.5 w-3.5" />,
                shortcut: 'mod+r',
                hidden: view !== 'preview',
                run: () => setReloadKey((k) => k + 1),
            },
            {
                id: 'editor.find',
                title: 'Find in File',
                group: 'Edit',
                icon: <Search className="h-3.5 w-3.5" />,
                shortcut: 'mod+f',
                keywords: ['search'],
                run: () => editorRef.current?.runCommand('search'),
            },
            {
                id: 'editor.replace',
                title: 'Find and Replace',
                group: 'Edit',
                icon: <Replace className="h-3.5 w-3.5" />,
                shortcut: 'mod+h',
                run: () => editorRef.current?.runCommand('replace'),
            },
            {
                id: 'editor.gotoLine',
                title: 'Go to Line',
                group: 'Go',
                icon: <SplitSquareHorizontal className="h-3.5 w-3.5" />,
                shortcut: 'mod+g',
                run: () => editorRef.current?.runCommand('gotoLine'),
            },
            {
                id: 'editor.foldAll',
                title: 'Fold All',
                group: 'Edit',
                run: () => editorRef.current?.runCommand('foldAll'),
            },
            {
                id: 'editor.unfoldAll',
                title: 'Unfold All',
                group: 'Edit',
                run: () => editorRef.current?.runCommand('unfoldAll'),
            },
            {
                id: 'files.quickOpen',
                title: 'Go to File…',
                group: 'Go',
                shortcut: 'mod+p',
                icon: <FileIcon className="h-3.5 w-3.5" />,
                run: () => openPalette('files'),
            },
            {
                id: 'files.closeTab',
                title: 'Close Tab',
                group: 'Files',
                shortcut: 'mod+w',
                run: () => {
                    if (props.activeFile) closeTab(props.activeFile);
                },
            },
            {
                id: 'editor.settings',
                title: 'Open Settings',
                group: 'Editor',
                shortcut: 'mod+,',
                icon: <SettingsIcon className="h-3.5 w-3.5" />,
                run: () => setSettingsOpen(true),
            },
            {
                id: 'editor.theme.auto',
                title: 'Theme: Auto (match app)',
                group: 'Theme',
                run: () => update('theme', 'auto'),
            },
            {
                id: 'editor.theme.hc',
                title: 'Theme: High Contrast',
                group: 'Theme',
                icon: <Accessibility className="h-3.5 w-3.5" />,
                run: () => update('theme', 'hc'),
            },
            {
                id: 'editor.fontSize.up',
                title: 'Increase Font Size',
                group: 'View',
                icon: <Type className="h-3.5 w-3.5" />,
                run: () => update('fontSize', Math.min(24, settings.fontSize + 1)),
            },
            {
                id: 'editor.fontSize.down',
                title: 'Decrease Font Size',
                group: 'View',
                run: () => update('fontSize', Math.max(10, settings.fontSize - 1)),
            },
            {
                id: 'editor.wordWrap',
                title: settings.wordWrap ? 'Disable Word Wrap' : 'Enable Word Wrap',
                group: 'View',
                shortcut: 'alt+z',
                run: () => update('wordWrap', !settings.wordWrap),
            },
        ];
        return cmds;
    }, [
        view,
        showFileTree,
        settings,
        pendingReviewCount,
        update,
        closeTab,
        props.activeFile,
        openPalette,
    ]);

    // Workspace-level hotkeys.
    useHotkeys([
        {
            keys: ['mod+shift+p', 'f1'],
            handler: () => openPalette('command'),
            allowInInput: true,
            description: 'Command palette',
        },
        {
            keys: 'mod+p',
            handler: () => openPalette('files'),
            allowInInput: true,
            description: 'Quick open file',
        },
        {
            keys: 'mod+,',
            handler: () => setSettingsOpen(true),
            allowInInput: true,
            description: 'Open editor settings',
        },
        {
            keys: 'mod+b',
            handler: () => setShowFileTree((v) => !v),
            description: 'Toggle file tree',
        },
        {
            keys: 'mod+1',
            handler: () => setView('editor'),
            allowInInput: true,
            description: 'Show editor',
        },
        {
            keys: 'mod+2',
            handler: () => setView('preview'),
            allowInInput: true,
            description: 'Show preview',
        },
        {
            keys: 'mod+3',
            handler: () => {
                if (pendingReviewCount > 0) setView('review');
            },
            allowInInput: true,
            description: 'Show review',
        },
        {
            keys: 'mod+w',
            handler: () => {
                if (props.activeFile) closeTab(props.activeFile);
            },
            description: 'Close tab',
        },
        {
            keys: 'mod+\\',
            handler: () => update('minimap', !settings.minimap),
            description: 'Toggle minimap',
        },
        {
            keys: 'mod+s',
            // Auto-save runs on edit; intercept to suppress browser
            // "Save Page" while inside the editor.
            handler: () => {},
            allowInInput: true,
            description: 'Save (auto)',
        },
        {
            keys: 'alt+z',
            handler: () => update('wordWrap', !settings.wordWrap),
            allowInInput: true,
            description: 'Toggle word wrap',
        },
    ]);

    // The data-editor-theme attr only applies the high-contrast scope.
    // "auto" is a no-op — the editor follows the app theme via .dark.
    const editorThemeAttr = settings.theme === 'hc' ? 'hc' : undefined;

    return (
        <div
            className="flex flex-col h-screen w-full bg-background overflow-hidden"
            data-editor-theme={editorThemeAttr}
        >
            {/* Skip links — visible only on focus, give keyboard users
                the same "jump to landmark" affordance VoiceOver gets via
                the rotor. */}
            <a
                href="#editor-files"
                className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[100] focus:px-2 focus:py-1 focus:rounded focus:bg-foreground focus:text-background focus:text-[12px]"
            >
                Skip to file tree
            </a>
            <a
                href="#editor-content"
                className="sr-only focus:not-sr-only focus:absolute focus:left-32 focus:top-2 focus:z-[100] focus:px-2 focus:py-1 focus:rounded focus:bg-foreground focus:text-background focus:text-[12px]"
            >
                Skip to editor
            </a>
            <a
                href="#chat-panel"
                className="sr-only focus:not-sr-only focus:absolute focus:left-60 focus:top-2 focus:z-[100] focus:px-2 focus:py-1 focus:rounded focus:bg-foreground focus:text-background focus:text-[12px]"
            >
                Skip to chat
            </a>

            <header
                role="banner"
                className="shrink-0 flex items-center h-10 px-1 bg-editor-bg-2 border-b border-editor-border"
            >
                <SimpleTooltip content="Back" side="bottom">
                    <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        className="h-8 w-8 rounded-none text-editor-fg-subtle hover:text-editor-fg hover:bg-editor-bg-3"
                    >
                        <Link href="/code" aria-label="Back to Code home">
                            <ChevronsLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                </SimpleTooltip>

                <span className="h-5 w-px bg-editor-border-strong mx-1" aria-hidden />

                <HeaderIcon
                    label="Preview"
                    icon={<Eye className="h-4 w-4" />}
                    active={view === 'preview'}
                    onClick={() => setView('preview')}
                />
                <HeaderIcon
                    label="Editor"
                    icon={<Code2 className="h-4 w-4" />}
                    active={view === 'editor'}
                    onClick={() => setView('editor')}
                />
                <HeaderIcon
                    label="Data"
                    icon={<Database className="h-4 w-4" />}
                    active={false}
                />

                <h1 className="ml-3 text-[12px] font-medium text-editor-fg-muted truncate min-w-0 hidden md:block">
                    {props.title}
                </h1>

                <div className="flex-1" />

                {pendingReviewCount > 0 && (
                    <button
                        type="button"
                        onClick={handleOpenReview}
                        className="inline-flex items-center gap-1.5 h-7 px-2 mr-1 text-[12px] font-medium text-amber-400 hover:text-amber-300 transition-colors"
                    >
                        <GitCompare className="h-3.5 w-3.5" />
                        Review
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/20 px-1 text-[10px] font-semibold">
                            {pendingReviewCount}
                        </span>
                    </button>
                )}

                <SimpleTooltip content="Latest version" side="bottom">
                    <button
                        type="button"
                        className="hidden md:inline-flex items-center gap-1 h-8 px-2 text-[13px] text-editor-fg-muted hover:text-editor-fg hover:bg-editor-bg-3 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-editor-accent"
                    >
                        Latest
                        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                    </button>
                </SimpleTooltip>

                <HeaderIcon
                    label="Toggle Terminal"
                    icon={<SquareTerminal className="h-4 w-4" />}
                />
                <HeaderIcon
                    label="Command palette (⌘⇧P)"
                    icon={<Search className="h-4 w-4" />}
                    onClick={() => openPalette('command')}
                />
                <HeaderIcon
                    label="Editor settings (⌘,)"
                    icon={<SettingsIcon className="h-4 w-4" />}
                    onClick={() => setSettingsOpen(true)}
                />
                <HeaderIcon label="More" icon={<MoreHorizontal className="h-4 w-4" />} />

                {/* Mobile-only segmented switch */}
                <div
                    role="tablist"
                    aria-label="Workspace pane"
                    className="md:hidden ml-1 inline-flex items-center bg-editor-bg-3 border border-editor-border-strong"
                >
                    <button
                        role="tab"
                        aria-selected={mobileTab === 'chat'}
                        onClick={() => setMobileTab('chat')}
                        className={cn(
                            'h-7 px-2.5 text-[12px] font-medium transition-colors',
                            mobileTab === 'chat'
                                ? 'bg-editor-bg text-editor-fg'
                                : 'text-editor-fg-subtle hover:text-editor-fg',
                        )}
                    >
                        Chat
                    </button>
                    <button
                        role="tab"
                        aria-selected={mobileTab === 'right'}
                        onClick={() => setMobileTab('right')}
                        className={cn(
                            'h-7 px-2.5 text-[12px] font-medium transition-colors',
                            mobileTab === 'right'
                                ? 'bg-editor-bg text-editor-fg'
                                : 'text-editor-fg-subtle hover:text-editor-fg',
                        )}
                    >
                        Code
                    </button>
                </div>
            </header>

            <div className="flex-1 min-h-0 flex">
                <aside
                    id="chat-panel"
                    aria-label="AI chat"
                    style={isDesktop ? { width: `${chatWidth}px` } : undefined}
                    className={cn(
                        'bg-background flex flex-col min-h-0',
                        mobileTab === 'chat' ? 'flex' : 'hidden',
                        'md:flex md:shrink-0 md:w-[360px] border-r border-border-subtle md:border-r-0',
                    )}
                >
                    <BuilderChatPanel
                        messages={props.messages}
                        isStreaming={props.isStreaming}
                        error={props.error}
                        models={props.models}
                        selectedModelId={props.selectedModelId}
                        onModelChange={props.onModelChange}
                        onSend={props.onSend}
                        onStop={props.onStop}
                        onOpenReview={handleOpenReview}
                    />
                </aside>

                <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize chat panel"
                    aria-valuemin={CHAT_WIDTH_MIN}
                    aria-valuemax={CHAT_WIDTH_MAX_FALLBACK}
                    aria-valuenow={Math.round(chatWidth)}
                    tabIndex={0}
                    onMouseDown={onHandleMouseDown}
                    onTouchStart={onHandleTouchStart}
                    onDoubleClick={onHandleDoubleClick}
                    onKeyDown={onHandleKeyDown}
                    title="Drag to resize · double-click to reset"
                    className={cn(
                        'hidden md:flex shrink-0 relative items-stretch',
                        'w-1 cursor-col-resize select-none group',
                        'bg-border-subtle hover:bg-foreground/30 transition-colors',
                        'focus:outline-none focus-visible:bg-foreground/40',
                        isDragging && 'bg-foreground/40',
                    )}
                >
                    <span aria-hidden className="absolute inset-y-0 -left-1.5 -right-1.5" />
                </div>

                <main
                    aria-label="Editor"
                    className={cn(
                        'flex-1 min-w-0 flex flex-col bg-background',
                        mobileTab === 'right' ? 'flex' : 'hidden',
                        'md:flex',
                    )}
                >
                    {/* Mobile-only secondary toolbar — desktop uses the
                        new VS Code-style chrome with the ViewToggle living
                        in the top header. */}
                    <div className="md:hidden shrink-0 flex items-center gap-2 h-9 px-2 border-b border-editor-border bg-editor-bg-2">
                        <ViewToggle
                            value={view}
                            onChange={setView}
                            reviewCount={pendingReviewCount}
                        />
                        <div className="ml-auto flex items-center gap-2 shrink-0">
                            {view === 'preview' && (
                                <SimpleTooltip content="Reload preview" side="bottom">
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => setReloadKey((k) => k + 1)}
                                        aria-label="Reload preview"
                                        className="h-7 w-7 rounded-none text-editor-fg-muted hover:text-editor-fg"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                    </Button>
                                </SimpleTooltip>
                            )}
                            <span className="text-[11px] text-editor-fg-subtle tabular-nums">
                                {view === 'review'
                                    ? `${pendingReviewCount} pending`
                                    : `${fileCount} ${fileCount === 1 ? 'file' : 'files'}`}
                            </span>
                        </div>
                    </div>

                    {view === 'editor' && (
                        <div className="flex-1 min-h-0 flex bg-editor-bg">
                            {showFileTree && (
                                <nav
                                    id="editor-files"
                                    aria-label="Project files"
                                    className="w-[260px] shrink-0 flex flex-col bg-editor-bg-2 overflow-hidden"
                                >
                                    <ExplorerHeader
                                        title={props.title}
                                        onCollapseAll={() =>
                                            setCollapseSignal((n) => n + 1)
                                        }
                                    />
                                    <div className="flex-1 min-h-0 overflow-y-auto">
                                        <FileTree
                                            files={props.files}
                                            activeFile={props.activeFile}
                                            onSelectFile={props.onSelectFile}
                                            collapseSignal={collapseSignal}
                                        />
                                    </div>
                                </nav>
                            )}
                            <div
                                id="editor-content"
                                className="flex-1 min-w-0 flex flex-col bg-editor-bg"
                            >
                                <EditorTabs
                                    openTabs={openTabs}
                                    activePath={props.activeFile}
                                    onSelect={props.onSelectFile}
                                    onClose={closeTab}
                                />
                                <Breadcrumb activePath={props.activeFile} />
                                <div className="flex-1 min-h-0 flex relative">
                                    <CodeEditor
                                        ref={editorRef}
                                        path={props.activeFile}
                                        value={activeContent}
                                        hostRef={editorHostRef}
                                        onChange={(next) =>
                                            props.activeFile &&
                                            props.onUpdateFile(props.activeFile, next)
                                        }
                                        onPositionChange={(line, col) =>
                                            setCursorPos({ line, col })
                                        }
                                    />
                                    {settings.minimap && props.activeFile && (
                                        <Minimap
                                            editorHostRef={editorHostRef}
                                            content={activeContent}
                                            isVisible={settings.minimap}
                                            onToggle={() =>
                                                update('minimap', !settings.minimap)
                                            }
                                        />
                                    )}
                                </div>
                                <StatusBar
                                    activePath={props.activeFile}
                                    line={cursorPos.line}
                                    col={cursorPos.col}
                                    isSaving={false}
                                    onOpenSettings={() => setSettingsOpen(true)}
                                />
                            </div>
                        </div>
                    )}
                    {view === 'preview' && (
                        <CodePreview files={props.files} reloadKey={reloadKey} />
                    )}
                    {view === 'review' && (
                        <DiffPanel
                            messages={props.messages}
                            onAccept={props.onAcceptChanges}
                            onReject={props.onRejectChanges}
                        />
                    )}
                </main>
            </div>

            {isDragging && (
                <div aria-hidden className="fixed inset-0 z-50 cursor-col-resize" />
            )}

            <CommandPalette
                open={paletteOpen}
                onOpenChange={setPaletteOpen}
                commands={commands}
                files={fileList}
                mode={paletteMode}
                onOpenFile={(path) => {
                    props.onSelectFile(path);
                    setView('editor');
                }}
            />

            <EditorSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        </div>
    );
}

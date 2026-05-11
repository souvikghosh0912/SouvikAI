'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, File, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BuilderFiles } from '@/types/code';

interface FileTreeProps {
    files: BuilderFiles;
    activeFile: string | null;
    onSelectFile: (path: string) => void;
    /**
     * When this number changes, every expanded folder is collapsed.
     * Used by the Explorer header's "Collapse Folders" action.
     */
    collapseSignal?: number;
}

interface TreeNode {
    name: string;
    path: string;
    isDir: boolean;
    children: TreeNode[];
}

interface FlatRow {
    node: TreeNode;
    depth: number;
}

function buildTree(files: BuilderFiles): TreeNode {
    const root: TreeNode = { name: '', path: '', isDir: true, children: [] };
    for (const fullPath of Object.keys(files).sort()) {
        const segments = fullPath.split('/');
        let cursor = root;
        segments.forEach((seg, idx) => {
            const isLeaf = idx === segments.length - 1;
            const childPath = segments.slice(0, idx + 1).join('/');
            let child = cursor.children.find((c) => c.name === seg);
            if (!child) {
                child = { name: seg, path: childPath, isDir: !isLeaf, children: [] };
                cursor.children.push(child);
            }
            cursor = child;
        });
    }
    sortNode(root);
    return root;
}

function sortNode(node: TreeNode) {
    node.children.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortNode);
}

/** Flatten the tree into the list of currently-visible rows. */
function flatten(root: TreeNode, expanded: Set<string>): FlatRow[] {
    const rows: FlatRow[] = [];
    const walk = (node: TreeNode, depth: number) => {
        for (const child of node.children) {
            rows.push({ node: child, depth });
            if (child.isDir && expanded.has(child.path)) {
                walk(child, depth + 1);
            }
        }
    };
    walk(root, 0);
    return rows;
}

/**
 * Accessible file tree following the WAI-ARIA Authoring Practices for the
 * tree pattern: single tabbable element (roving tabindex), arrow-key
 * navigation, type-ahead, expand/collapse via Right/Left, Enter/Space to
 * activate, Home/End to jump.
 *
 *  Up / Down       — move focus
 *  Right           — expand folder, or move into first child
 *  Left            — collapse folder, or move to parent
 *  Home / End      — first / last visible row
 *  Enter / Space   — open file or toggle folder
 *  Letter keys     — typeahead jump
 */
export function FileTree({ files, activeFile, onSelectFile, collapseSignal }: FileTreeProps) {
    const tree = useMemo(() => buildTree(files), [files]);

    // Default-expand the top-level folders so the tree isn't a wall of
    // collapsed entries on first render.
    const [expanded, setExpanded] = useState<Set<string>>(() => {
        const s = new Set<string>();
        for (const child of tree.children) {
            if (child.isDir) s.add(child.path);
        }
        return s;
    });

    const [focusedPath, setFocusedPath] = useState<string | null>(activeFile);

    // Track the current visible flattened list.
    const rows = useMemo(() => flatten(tree, expanded), [tree, expanded]);
    const rowsRef = useRef(rows);
    rowsRef.current = rows;

    const treeRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Collapse-all signal from the Explorer header.
    useEffect(() => {
        if (collapseSignal === undefined) return;
        setExpanded(new Set());
    }, [collapseSignal]);

    // When the active file changes externally, expand its ancestors and
    // sync our internal focus.
    useEffect(() => {
        if (!activeFile) return;
        const segments = activeFile.split('/');
        if (segments.length > 1) {
            setExpanded((prev) => {
                const next = new Set(prev);
                for (let i = 1; i < segments.length; i++) {
                    next.add(segments.slice(0, i).join('/'));
                }
                return next;
            });
        }
        setFocusedPath(activeFile);
    }, [activeFile]);

    const focusRow = useCallback((path: string | null) => {
        if (!path) return;
        setFocusedPath(path);
        // Defer focus until after the row has rendered with tabIndex=0.
        requestAnimationFrame(() => {
            itemRefs.current[path]?.focus();
        });
    }, []);

    const toggleFolder = useCallback((path: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    }, []);

    // Type-ahead buffer.
    const typeahead = useRef<{ buffer: string; timer: number | null }>({
        buffer: '',
        timer: null,
    });

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
            const all = rowsRef.current;
            const currentIdx = all.findIndex((r) => r.node.path === focusedPath);

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = all[Math.min(all.length - 1, currentIdx + 1)];
                if (next) focusRow(next.node.path);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const next = all[Math.max(0, currentIdx - 1)];
                if (next) focusRow(next.node.path);
                return;
            }
            if (e.key === 'Home') {
                e.preventDefault();
                if (all[0]) focusRow(all[0].node.path);
                return;
            }
            if (e.key === 'End') {
                e.preventDefault();
                if (all.length) focusRow(all[all.length - 1].node.path);
                return;
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                const row = all[currentIdx];
                if (!row) return;
                if (row.node.isDir) {
                    if (!expanded.has(row.node.path)) {
                        toggleFolder(row.node.path);
                    } else {
                        // Already expanded → move to first child.
                        const child = all[currentIdx + 1];
                        if (child && child.depth > row.depth) focusRow(child.node.path);
                    }
                }
                return;
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const row = all[currentIdx];
                if (!row) return;
                if (row.node.isDir && expanded.has(row.node.path)) {
                    toggleFolder(row.node.path);
                } else {
                    // Find parent.
                    for (let i = currentIdx - 1; i >= 0; i--) {
                        if (all[i].depth < row.depth) {
                            focusRow(all[i].node.path);
                            break;
                        }
                    }
                }
                return;
            }
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const row = all[currentIdx];
                if (!row) return;
                if (row.node.isDir) toggleFolder(row.node.path);
                else onSelectFile(row.node.path);
                return;
            }
            // Type-ahead: a single printable character jumps to the next
            // visible row whose name starts with the buffered string.
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const ta = typeahead.current;
                ta.buffer += e.key.toLowerCase();
                if (ta.timer) window.clearTimeout(ta.timer);
                ta.timer = window.setTimeout(() => { ta.buffer = ''; }, 600);

                const startIdx = currentIdx + 1;
                const total = all.length;
                for (let i = 0; i < total; i++) {
                    const row = all[(startIdx + i) % total];
                    if (row.node.name.toLowerCase().startsWith(ta.buffer)) {
                        focusRow(row.node.path);
                        return;
                    }
                }
            }
        },
        [focusedPath, expanded, focusRow, toggleFolder, onSelectFile],
    );

    if (rows.length === 0) {
        return (
            <div className="text-[12px] text-editor-fg-subtle py-4 px-3">
                No files yet.
            </div>
        );
    }

    const tabbablePath = focusedPath ?? activeFile ?? rows[0]?.node.path ?? null;

    return (
        <div
            ref={treeRef}
            role="tree"
            aria-label="Project files"
            aria-multiselectable={false}
            onKeyDown={handleKeyDown}
            className="text-[13px] text-editor-fg-muted py-1 select-none focus:outline-none"
        >
            {rows.map(({ node, depth }) => {
                const isActive = activeFile === node.path;
                const isFocused = tabbablePath === node.path;
                const isOpen = node.isDir && expanded.has(node.path);

                return (
                    <div
                        key={node.path}
                        ref={(el) => { itemRefs.current[node.path] = el; }}
                        role="treeitem"
                        aria-level={depth + 1}
                        aria-selected={isActive}
                        aria-expanded={node.isDir ? isOpen : undefined}
                        tabIndex={isFocused ? 0 : -1}
                        onClick={() => {
                            if (node.isDir) toggleFolder(node.path);
                            else {
                                onSelectFile(node.path);
                                setFocusedPath(node.path);
                            }
                        }}
                        onFocus={() => setFocusedPath(node.path)}
                        style={{ paddingLeft: 8 + depth * 12 + (node.isDir ? 0 : 16) }}
                        className={cn(
                            'flex items-center gap-1.5 h-[22px] pr-2 cursor-pointer transition-colors',
                            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-editor-accent',
                            isActive
                                ? 'bg-editor-bg-3 text-editor-fg'
                                : 'text-editor-fg-muted hover:bg-editor-bg-3 hover:text-editor-fg',
                        )}
                    >
                        {node.isDir ? (
                            <>
                                <ChevronRight
                                    aria-hidden="true"
                                    className={cn(
                                        'h-3 w-3 shrink-0 transition-transform motion-reduce:transition-none',
                                        isOpen && 'rotate-90',
                                    )}
                                />
                                {isOpen ? (
                                    <FolderOpen aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                    <Folder aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                                )}
                            </>
                        ) : (
                            <File aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span className="truncate">{node.name}</span>
                    </div>
                );
            })}
        </div>
    );
}

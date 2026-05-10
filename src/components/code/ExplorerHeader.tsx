'use client';

import {
    Files,
    Search,
    LayoutGrid,
    FilePlus,
    FolderPlus,
    RefreshCw,
    ChevronsDownUp,
    MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SimpleTooltip } from '@/components/ui';

interface ExplorerHeaderProps {
    title: string;
    onCollapseAll?: () => void;
}

/**
 * Two-row header that sits above the file tree and visually mimics
 * the VS Code "Explorer" panel:
 *
 *   1. A thin activity-bar strip with the active section icons
 *      (Files / Search / Extensions). Files is the active surface.
 *   2. The "EXPLORER · <project>" title row with the standard tree
 *      action icons aligned right (new file, new folder, refresh,
 *      collapse all, more actions).
 *
 * All hover surfaces use sharp, square edges scoped to the editor
 * theme tokens so the chrome reads the same as the editor pane.
 */
export function ExplorerHeader({ title, onCollapseAll }: ExplorerHeaderProps) {
    return (
        <div className="shrink-0">
            {/* Activity strip — inert visual only; the project's chat is the
                real navigation, but the strip preserves the IDE silhouette. */}
            <div className="flex items-center gap-0.5 h-9 px-1.5 bg-editor-bg-2">
                <ActivityIcon active label="Explorer" icon={<Files className="h-5 w-5" />} />
                <ActivityIcon label="Search" icon={<Search className="h-5 w-5" />} />
                <ActivityIcon label="Extensions" icon={<LayoutGrid className="h-5 w-5" />} />
            </div>

            {/* Title + tree actions row */}
            <div className="group/header flex items-center h-9 pl-3 pr-1 bg-editor-bg-2">
                <span
                    className="text-[11px] font-semibold uppercase tracking-wide text-editor-fg-subtle truncate"
                    title={title}
                >
                    {title}
                </span>

                <div className="ml-auto flex items-center opacity-0 group-hover/header:opacity-100 focus-within:opacity-100 transition-opacity">
                    <TreeAction label="New File" icon={<FilePlus className="h-4 w-4" />} />
                    <TreeAction label="New Folder" icon={<FolderPlus className="h-4 w-4" />} />
                    <TreeAction label="Refresh Explorer" icon={<RefreshCw className="h-4 w-4" />} />
                    <TreeAction
                        label="Collapse Folders"
                        icon={<ChevronsDownUp className="h-4 w-4" />}
                        onClick={onCollapseAll}
                    />
                    <TreeAction label="Views and More Actions…" icon={<MoreHorizontal className="h-4 w-4" />} />
                </div>
            </div>
        </div>
    );
}

function ActivityIcon({
    icon,
    label,
    active = false,
}: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
}) {
    return (
        <SimpleTooltip content={label} side="bottom">
            <button
                type="button"
                aria-label={label}
                aria-pressed={active}
                className={cn(
                    'inline-flex items-center justify-center h-8 w-8 transition-colors',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-editor-accent',
                    active
                        ? 'text-editor-fg'
                        : 'text-editor-fg-subtle hover:text-editor-fg',
                )}
            >
                {icon}
            </button>
        </SimpleTooltip>
    );
}

function TreeAction({
    icon,
    label,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
}) {
    return (
        <SimpleTooltip content={label} side="bottom">
            <button
                type="button"
                onClick={onClick}
                aria-label={label}
                className={cn(
                    'inline-flex items-center justify-center h-6 w-6 transition-colors',
                    'text-editor-fg-muted hover:text-editor-fg hover:bg-editor-bg-3',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-editor-accent',
                )}
            >
                {icon}
            </button>
        </SimpleTooltip>
    );
}

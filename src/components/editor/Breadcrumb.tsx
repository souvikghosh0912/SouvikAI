'use client';

import { ChevronRight, File } from 'lucide-react';

interface BreadcrumbProps {
    activePath: string | null;
}

export function Breadcrumb({ activePath }: BreadcrumbProps) {
    if (!activePath) return null;

    const segments = activePath.split('/');

    return (
        <nav
            aria-label="File path"
            className="flex items-center gap-0.5 px-3 py-1 text-[13px] text-editor-fg-muted bg-editor-bg border-b border-editor-border overflow-x-auto scrollbar-hide shrink-0"
        >
            <ol className="flex items-center gap-0.5">
                {segments.map((seg, i) => {
                    const isLast = i === segments.length - 1;
                    return (
                        <li key={i} className="flex items-center gap-0.5 shrink-0">
                            {i > 0 && (
                                <ChevronRight
                                    aria-hidden="true"
                                    className="w-3.5 h-3.5 opacity-50"
                                />
                            )}
                            <span
                                aria-current={isLast ? 'page' : undefined}
                                className={`flex items-center gap-1 px-0.5 rounded transition-colors ${
                                    isLast
                                        ? 'text-editor-fg'
                                        : 'hover:text-editor-fg cursor-pointer'
                                }`}
                            >
                                {isLast && (
                                    <File
                                        aria-hidden="true"
                                        className="w-3.5 h-3.5 shrink-0"
                                    />
                                )}
                                {seg}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

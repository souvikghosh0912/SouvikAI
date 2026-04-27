'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import ShinyText from '@/components/ui/ShinyText';
import type { WebSearchState, WebSearchResult } from '@/types/chat';

interface WebSearchIndicatorProps {
    webSearch: WebSearchState;
}

/**
 * Inline timeline row for a web-search tool call.
 *
 *  • Searching → single shimmer line "Searching · <query>".
 *  • Done      → query (left) + "N results" (right). Clicking the row expands
 *                a vertical card listing each source as `[favicon] title … domain`.
 *
 * Designed to live inside <ThinkingTimeline> (i.e. its parent supplies the
 * timeline's left-rail icon and connector line).
 */
export function WebSearchIndicator({ webSearch }: WebSearchIndicatorProps) {
    const [open, setOpen] = useState(false);

    if (webSearch.status === 'searching') {
        return (
            <ShinyText
                text={webSearch.query ? `Searching · ${webSearch.query}` : 'Searching the web…'}
                speed={2.5}
                delay={0.4}
                color="#6b6b6b"
                shineColor="#e0e0e0"
                spread={90}
                className="text-sm font-medium"
            />
        );
    }

    const { query, results } = webSearch;

    return (
        <div className="w-full">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="group flex items-center justify-between gap-3 w-full text-left"
                aria-expanded={open}
            >
                <span className="text-sm text-foreground/85 font-medium truncate">
                    {query}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    {results.length} result{results.length !== 1 ? 's' : ''}
                    <ChevronDown
                        className={cn(
                            'h-3 w-3 transition-transform duration-200',
                            open && 'rotate-180',
                        )}
                    />
                </span>
            </button>

            <div
                className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    open ? 'max-h-[260px] opacity-100 mt-2' : 'max-h-0 opacity-0',
                )}
            >
                <div className="rounded-lg border border-border/50 bg-muted/15 overflow-y-auto max-h-[240px] divide-y divide-border/30 scrollbar-thin">
                    {results.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground italic">
                            No results found.
                        </p>
                    ) : (
                        results.map((r, i) => <SourceRow key={i} result={r} />)
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Source row ───────────────────────────────────────────────────────────────

function SourceRow({ result }: { result: WebSearchResult }) {
    let domain = '';
    try {
        domain = new URL(result.url).hostname.replace(/^www\./, '');
    } catch {
        domain = result.url;
    }

    return (
        <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            title={result.title}
            className="group/row flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 transition-colors no-underline"
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={result.favicon}
                alt=""
                width={14}
                height={14}
                className="rounded-sm opacity-80 shrink-0"
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                }}
            />
            <span className="flex-1 truncate text-xs text-foreground/85 group-hover/row:text-foreground">
                {result.title}
            </span>
            <span className="text-[11px] text-muted-foreground/70 shrink-0 max-w-[40%] truncate">
                {domain}
            </span>
        </a>
    );
}

'use client';

import { useState } from 'react';
import { Globe, ChevronDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WebSearchState, WebSearchResult } from '@/types/chat';
import ShinyText from '@/components/ui/ShinyText';

interface WebSearchIndicatorProps {
    webSearch: WebSearchState;
}

/**
 * Renders two states:
 *  1. Shimmer "Searching the web…"  while webSearch.status === 'searching'
 *  2. Clickable badge "Searched the web · N sources" when done,
 *     which expands to show each source card.
 */
export function WebSearchIndicator({ webSearch }: WebSearchIndicatorProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (webSearch.status === 'searching') {
        return (
            <div className="flex items-center gap-2 py-1 mb-2 animate-fade-in">
                <Globe className="h-4 w-4 text-blue-400/60 animate-pulse shrink-0" />
                <ShinyText
                    text="Searching the web…"
                    speed={2.5}
                    delay={0.4}
                    color="#6b6b6b"
                    shineColor="#e0e0e0"
                    spread={90}
                    className="text-sm font-medium"
                />
            </div>
        );
    }

    const { results } = webSearch;

    return (
        <div className="mb-3 animate-fade-in">
            {/* ── Collapsed badge ─────────────────────────────── */}
            <button
                onClick={() => setIsOpen(o => !o)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1 rounded-md group"
            >
                <Globe className="h-4 w-4 shrink-0 text-blue-400/70" />
                <span className="font-medium">
                    Searched the web&nbsp;·&nbsp;{results.length} source{results.length !== 1 ? 's' : ''}
                </span>
                <ChevronDown
                    className={cn(
                        'h-3.5 w-3.5 transition-transform duration-200',
                        isOpen && 'rotate-180',
                    )}
                />
            </button>

            {/* ── Expandable source list ───────────────────────── */}
            <div
                className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    isOpen ? 'max-h-[480px] opacity-100 mt-2' : 'max-h-0 opacity-0',
                )}
            >
                <div className="flex flex-col gap-1.5 pl-1">
                    {results.map((result, i) => (
                        <SourceCard key={i} result={result} index={i + 1} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Source card ───────────────────────────────────────────────────────────────

function SourceCard({ result, index }: { result: WebSearchResult; index: number }) {
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
            className="group/card flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/50 hover:border-border/80 transition-all duration-150 no-underline"
        >
            {/* Index number */}
            <span className="text-[11px] font-mono text-muted-foreground/40 shrink-0 mt-0.5 w-4 text-right select-none">
                {index}
            </span>

            {/* Content */}
            <div className="flex flex-col min-w-0 gap-0.5 flex-1">
                {/* Domain + favicon */}
                <div className="flex items-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={result.favicon}
                        alt=""
                        width={14}
                        height={14}
                        className="rounded-sm opacity-70 shrink-0"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                    <span className="text-[11px] text-muted-foreground/60 truncate">
                        {domain}
                    </span>
                </div>

                {/* Title */}
                <p className="text-sm font-medium text-foreground/85 line-clamp-1 group-hover/card:text-blue-400 transition-colors">
                    {result.title}
                </p>

                {/* Snippet */}
                {result.snippet && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {result.snippet}
                    </p>
                )}
            </div>

            {/* External link icon */}
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30 group-hover/card:text-blue-400 transition-colors shrink-0 mt-0.5" />
        </a>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { Clock, Globe, CheckCircle2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import ShinyText from '@/components/ui/ShinyText';
import { WebSearchIndicator } from './WebSearchIndicator';
import type { WebSearchState } from '@/types/chat';

interface ThinkingTimelineProps {
    /** Raw text from inside the model's <think>...</think> block(s). */
    thinkContent: string;
    /** True while the model is actively streaming reasoning. */
    isThinking: boolean;
    /** True while the whole assistant message is still in flight. */
    isLoading: boolean;
    /** Optional web-search tool state attached to this message. */
    webSearch?: WebSearchState;
}

// ── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Splits raw <think> content into a header title + ordered "thought steps".
 * Models are instructed to emit `<title>summary</title>` as the first line and
 * separate reasoning paragraphs with blank lines, but we degrade gracefully if
 * either is missing.
 */
function parseThinking(text: string): { title: string | null; steps: string[] } {
    let title: string | null = null;
    let body = text;

    const titleMatch = body.match(/<title>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
        title = titleMatch[1].trim();
        body = body.replace(titleMatch[0], '').trim();
    }

    const steps = body
        .split(/\n\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean);

    return { title, steps };
}

/**
 * Fallback header text when the model didn't emit a <title>. Uses the first
 * step's opening words, capped at 9 tokens, with trailing punctuation trimmed.
 */
function deriveTitle(steps: string[]): string {
    const first = steps[0];
    if (!first) return 'Thoughts';
    const words = first.split(/\s+/).slice(0, 9).join(' ');
    return words.replace(/[.,;:!?]+$/, '') || 'Thoughts';
}

// ── Component ────────────────────────────────────────────────────────────────

export function ThinkingTimeline({
    thinkContent,
    isThinking,
    isLoading,
    webSearch,
}: ThinkingTimelineProps) {
    const [open, setOpen] = useState(false);

    const { title: parsedTitle, steps } = parseThinking(thinkContent);
    const isSearching = webSearch?.status === 'searching';
    const inProgress = isThinking || isSearching;

    const titleText =
        parsedTitle ??
        (isSearching
            ? 'Searching the web…'
            : isThinking
                ? 'Thinking…'
                : deriveTitle(steps));

    const showShimmer = !parsedTitle && inProgress;
    const hasBody = steps.length > 0 || !!webSearch;
    const isComplete = !isLoading && hasBody;

    // Auto-open while the model is still working so the user sees progress;
    // auto-close on completion to keep the conversation tidy.
    useEffect(() => {
        if (inProgress) setOpen(true);
        else setOpen(false);
    }, [inProgress]);

    return (
        <div className="my-1 not-prose animate-fade-in">
            {/* ── Header ─────────────────────────────────────────────── */}
            <button
                type="button"
                onClick={() => hasBody && setOpen((o) => !o)}
                className={cn(
                    'group flex items-center gap-2 text-sm transition-colors',
                    hasBody
                        ? 'cursor-pointer text-muted-foreground hover:text-foreground'
                        : 'cursor-default text-muted-foreground',
                )}
                aria-expanded={open}
                disabled={!hasBody}
            >
                {showShimmer ? (
                    <ShinyText
                        text={titleText}
                        speed={2.5}
                        delay={0.4}
                        color="#6b6b6b"
                        shineColor="#e0e0e0"
                        spread={90}
                        className="text-sm font-medium"
                    />
                ) : (
                    <span className="font-medium">{titleText}</span>
                )}
                {hasBody && (
                    <ChevronDown
                        className={cn(
                            'h-3.5 w-3.5 opacity-60 transition-transform duration-200 group-hover:opacity-100',
                            open && 'rotate-180',
                        )}
                    />
                )}
            </button>

            {/* ── Body (timeline) ────────────────────────────────────── */}
            <div
                className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    open && hasBody ? 'max-h-[1400px] opacity-100 mt-2' : 'max-h-0 opacity-0',
                )}
            >
                <div className="relative pl-7">
                    {/* Vertical connector line */}
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/50" />

                    {/* Search step (always above thinking when present) */}
                    {webSearch && (
                        <TimelineRow icon={<Globe className="h-3.5 w-3.5" />}>
                            <WebSearchIndicator webSearch={webSearch} />
                        </TimelineRow>
                    )}

                    {/* Thinking steps */}
                    {steps.map((step, i) => (
                        <TimelineRow key={i} icon={<Clock className="h-3.5 w-3.5" />}>
                            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap m-0">
                                {step}
                            </p>
                        </TimelineRow>
                    ))}

                    {/* Done footer */}
                    {isComplete && (
                        <TimelineRow
                            last
                            icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/80" />}
                        >
                            <p className="text-sm text-muted-foreground m-0">Done</p>
                        </TimelineRow>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Timeline row helper ──────────────────────────────────────────────────────

function TimelineRow({
    icon,
    children,
    last,
}: {
    icon: React.ReactNode;
    children: React.ReactNode;
    last?: boolean;
}) {
    return (
        <div className={cn('relative flex items-start gap-3', last ? 'mb-0' : 'mb-3')}>
            {/* Icon sits on top of the connector line, masked by the page bg. */}
            <span className="absolute -left-[19px] top-0.5 h-5 w-5 rounded-full bg-background flex items-center justify-center text-muted-foreground/70">
                {icon}
            </span>
            <div className="flex-1 min-w-0">{children}</div>
        </div>
    );
}

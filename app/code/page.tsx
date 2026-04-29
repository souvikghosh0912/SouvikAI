'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    BookOpen,
    LayoutDashboard,
    LayoutPanelTop,
    Loader2,
    Mail,
    Sparkles,
    type LucideIcon,
} from 'lucide-react';
import { Button, SimpleTooltip } from '@/components/ui';
import { BuilderChatInput } from '@/components/code/BuilderChatInput';
import { useAuth } from '@/hooks/useAuth';

interface Starter {
    title: string;
    description: string;
    prompt: string;
    Icon: LucideIcon;
}

const STARTERS: Starter[] = [
    {
        title: 'SaaS landing',
        description: 'Hero, features, and pricing tiers',
        prompt: 'A SaaS landing page with hero, features, and pricing',
        Icon: LayoutPanelTop,
    },
    {
        title: 'Personal blog',
        description: 'Minimal, clean reading layout',
        prompt: 'A minimal personal blog with a clean reading layout',
        Icon: BookOpen,
    },
    {
        title: 'Dashboard',
        description: 'Sidebar navigation and stat cards',
        prompt: 'A dashboard with sidebar nav and stat cards',
        Icon: LayoutDashboard,
    },
    {
        title: 'Waitlist page',
        description: 'Hero, signup form, and confirmation',
        prompt: 'A waitlist page with a form and a hero image',
        Icon: Mail,
    },
];

const STACK = ['Next.js', 'Tailwind', 'TypeScript'];

/**
 * Forge home: a focused composer that captures the user's first prompt,
 * provisions a new workspace in Supabase, and routes them to /code/[id]
 * where the agent immediately picks up the pending message.
 *
 * The page is laid out as four quiet horizontal bands of decreasing
 * weight — eyebrow, hero, composer + stack strip, starters, footer —
 * so the eye lands on the input first and the rest of the page reads
 * as supporting structure.
 */
export default function CodeLandingPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/signin');
        }
    }, [authLoading, isAuthenticated, router]);

    const handleSend = useCallback(
        async (message: string) => {
            const trimmed = message.trim();
            if (!trimmed || creating) return;
            setCreating(true);
            setCreateError(null);
            try {
                const res = await fetch('/api/code/workspaces', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ initialMessage: trimmed }),
                });
                if (!res.ok) {
                    let msg = `Couldn't start a new build (${res.status})`;
                    try {
                        const data = await res.json();
                        if (data?.error) msg = data.error;
                    } catch {
                        /* ignore */
                    }
                    throw new Error(msg);
                }
                const data = (await res.json()) as { id: string };
                router.push(`/code/${data.id}`);
            } catch (err) {
                setCreateError((err as Error)?.message || 'Something went wrong.');
                setCreating(false);
            }
        },
        [creating, router],
    );

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Slim top bar — escape hatch back to chat. Matches the
                workspace header rhythm (h-10) so navigating in/out of a
                build doesn't visually shift. */}
            <header className="shrink-0 flex items-center gap-2 h-10 px-3 border-b border-border-subtle">
                <SimpleTooltip content="Back to chat" side="bottom">
                    <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7 text-foreground-muted hover:text-foreground"
                    >
                        <Link href="/" aria-label="Back to chat">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                </SimpleTooltip>
                <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-md bg-foreground text-background flex items-center justify-center">
                        <Sparkles className="h-3 w-3" />
                    </div>
                    <span className="text-[13px] font-semibold text-foreground">
                        Forge
                    </span>
                </div>
            </header>

            <main className="flex-1 flex items-start justify-center px-4 py-10 sm:py-16">
                <div className="w-full max-w-2xl">
                    {/* ── Eyebrow + Hero ────────────────────────────────── */}
                    <div className="flex flex-col items-center text-center">
                        <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-surface-2 border border-border-subtle text-[11px] font-medium text-foreground-muted uppercase tracking-wider">
                            <Sparkles className="h-3 w-3" />
                            Forge
                        </span>

                        <h1 className="mt-5 text-3xl sm:text-4xl md:text-[40px] md:leading-[1.1] font-semibold tracking-tight text-foreground text-balance">
                            What will you build today?
                        </h1>
                        <p className="mt-3 text-foreground-muted text-[15px] leading-relaxed text-pretty max-w-md">
                            Describe an app, a page, or a component. Forge
                            scaffolds a Next.js + Tailwind project and writes the
                            code for you.
                        </p>
                    </div>

                    {/* ── Composer ──────────────────────────────────────── */}
                    <div className="mt-7">
                        {creating ? (
                            <div className="flex items-center justify-center gap-2 h-[124px] rounded-2xl border border-border bg-surface text-foreground-muted">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-[14px]">Creating your build…</span>
                            </div>
                        ) : (
                            <BuilderChatInput
                                variant="centered"
                                placeholder="A pricing page with three tiers and a FAQ section…"
                                onSend={handleSend}
                                autoFocus
                            />
                        )}

                        {createError && (
                            <div
                                role="alert"
                                className="mt-3 px-3 py-2 rounded-md text-[13px] bg-destructive/10 text-destructive border border-destructive/20"
                            >
                                {createError}
                            </div>
                        )}

                        {/* Quiet stack strip, sits flush under the composer
                            so it reads as composer metadata rather than a
                            separate section. */}
                        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-foreground-subtle">
                            <span>Built with</span>
                            <div className="flex items-center gap-1.5">
                                {STACK.map((s, i) => (
                                    <span key={s} className="flex items-center gap-1.5">
                                        <span className="text-foreground-muted font-medium">
                                            {s}
                                        </span>
                                        {i < STACK.length - 1 && (
                                            <span aria-hidden className="text-foreground-subtle/60">
                                                ·
                                            </span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Starters ──────────────────────────────────────── */}
                    <div className="mt-12">
                        <div className="flex items-baseline justify-between mb-3">
                            <h2 className="text-[12px] font-medium text-foreground-muted uppercase tracking-wider">
                                Start from a template
                            </h2>
                            <span className="text-[11px] text-foreground-subtle">
                                Tap to begin
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {STARTERS.map((s) => (
                                <button
                                    key={s.title}
                                    type="button"
                                    disabled={creating}
                                    onClick={() => handleSend(s.prompt)}
                                    className="group flex items-start gap-3 p-3 rounded-lg border border-border-subtle bg-surface text-left transition-colors hover:bg-surface-2 hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="shrink-0 h-8 w-8 rounded-md bg-surface-2 border border-border-subtle flex items-center justify-center text-foreground-muted transition-colors group-hover:text-foreground group-hover:border-border">
                                        <s.Icon className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[13px] font-medium text-foreground">
                                            {s.title}
                                        </span>
                                        <span className="block text-[12px] text-foreground-muted truncate">
                                            {s.description}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Footer disclaimer ─────────────────────────────── */}
                    <p className="mt-10 text-center text-[11px] text-foreground-subtle">
                        Forge uses your selected AI model. Token usage counts
                        against your quota.
                    </p>
                </div>
            </main>
        </div>
    );
}

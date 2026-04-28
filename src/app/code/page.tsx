'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { Button, SimpleTooltip } from '@/components/ui';
import { BuilderChatInput } from '@/components/code/BuilderChatInput';
import { useAuth } from '@/hooks/useAuth';

/** Same key the workspace page reads on mount to autostart the first turn. */
const PENDING_KEY = (id: string) => `souvik:builder-pending:${id}`;

const SUGGESTIONS = [
    'A SaaS landing page with hero, features, and pricing',
    'A minimal personal blog with a clean reading layout',
    'A dashboard with sidebar nav and stat cards',
    'A waitlist page with a form and a hero image',
];

/**
 * Builder home: a focused composer that captures the user's first prompt and
 * routes them to a fresh workspace at /code/[id].
 */
export default function CodeLandingPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/signin');
        }
    }, [authLoading, isAuthenticated, router]);

    const handleSend = useCallback(
        (message: string) => {
            const id = generateBuilderId();
            try {
                sessionStorage.setItem(
                    PENDING_KEY(id),
                    JSON.stringify({ message, ts: Date.now() }),
                );
            } catch {
                // sessionStorage unavailable (private mode etc.) — fall through;
                // the workspace page will simply render without auto-sending.
            }
            router.push(`/code/${id}`);
        },
        [router],
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
            {/* Slim top bar — escape hatch back to chat */}
            <header className="shrink-0 flex items-center gap-2 h-12 px-4 border-b border-border-subtle">
                <SimpleTooltip content="Back to chat" side="bottom">
                    <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        className="h-8 w-8 text-foreground-muted hover:text-foreground"
                    >
                        <Link href="/" aria-label="Back to chat">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                </SimpleTooltip>
                <div className="flex items-center gap-2 text-foreground">
                    <div className="h-6 w-6 rounded-md bg-foreground text-background flex items-center justify-center">
                        <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[13px] font-semibold">Builder</span>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-2xl">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground text-balance">
                            What are you going to build today?
                        </h1>
                        <p className="mt-3 text-foreground-muted text-[15px] text-pretty">
                            Describe an app, a page, or a component. Builder spins up a
                            Next.js + Tailwind project and writes the code for you.
                        </p>
                    </div>

                    <BuilderChatInput
                        variant="centered"
                        placeholder="A pricing page with three tiers and a FAQ section…"
                        onSend={handleSend}
                        autoFocus
                    />

                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                        {SUGGESTIONS.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => handleSend(s)}
                                className="text-[13px] text-foreground-muted hover:text-foreground bg-surface hover:bg-surface-2 border border-border rounded-full px-3 py-1.5 transition-colors"
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <p className="mt-8 text-center text-[12px] text-foreground-subtle">
                        Builder uses your selected AI model. Token usage counts against
                        your quota.
                    </p>
                </div>
            </main>
        </div>
    );
}

function generateBuilderId(): string {
    // Crypto-grade UUID when available; safe fallback otherwise.
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

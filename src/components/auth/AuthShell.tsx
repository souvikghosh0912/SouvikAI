'use client';

import Link from 'next/link';
import { AuthFooter } from './AuthFooter';

/**
 * AuthShell — split-pane wrapper used by every page in /(auth)/.
 *
 * Left:  brand top-left, form vertically centered, footer bottom-left.
 * Right: hidden on <lg, a quiet brand aside on lg+. Monochrome only — no
 *        gradients, no images.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
            {/* ── Form column ─────────────────────────────────────────── */}
            <div className="relative flex min-h-screen flex-col px-6 sm:px-10 lg:px-16 py-8 lg:py-10 safe-top safe-bottom">
                {/* Brand mark */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
                    >
                        <BrandMark />
                        <span className="font-semibold tracking-tight text-[15px]">
                            Souvik AI
                        </span>
                    </Link>
                </div>

                {/* Form */}
                <div className="flex-1 flex items-center justify-center py-10">
                    <div className="w-full max-w-[400px]">
                        {children}
                    </div>
                </div>

                {/* Footer */}
                <AuthFooter />
            </div>

            {/* ── Decorative aside (lg+) ──────────────────────────────── */}
            <aside className="hidden lg:flex relative flex-col justify-between bg-surface border-l border-border p-12 overflow-hidden">
                {/* Subtle hairline grid backdrop */}
                <div
                    aria-hidden
                    className="absolute inset-0 opacity-[0.35] dark:opacity-[0.5] pointer-events-none"
                    style={{
                        backgroundImage:
                            'linear-gradient(to right, hsl(var(--border-subtle)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border-subtle)) 1px, transparent 1px)',
                        backgroundSize: '48px 48px',
                        maskImage:
                            'radial-gradient(ellipse at center, black 30%, transparent 80%)',
                        WebkitMaskImage:
                            'radial-gradient(ellipse at center, black 30%, transparent 80%)',
                    }}
                />

                {/* Wordmark top-right */}
                <div className="relative flex items-center justify-end">
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground-subtle">
                        v 1.0
                    </span>
                </div>

                {/* Centered statement */}
                <div className="relative max-w-md">
                    <p className="text-3xl font-semibold leading-tight tracking-tight text-balance">
                        AI that gets out of your way.
                    </p>
                    <p className="mt-4 text-sm text-foreground-muted leading-relaxed text-pretty">
                        A focused, private chat workspace — built for thinking, writing, and
                        shipping. No clutter. No tracking. Just answers that stream as fast
                        as you can read.
                    </p>
                </div>

                {/* Feature row */}
                <ul className="relative grid grid-cols-3 gap-6 border-t border-border-subtle pt-6">
                    <FeatureItem label="Private" sub="Your data stays yours" />
                    <FeatureItem label="Fast" sub="Real-time streaming" />
                    <FeatureItem label="Open" sub="Bring your own model" />
                </ul>
            </aside>
        </div>
    );
}

function FeatureItem({ label, sub }: { label: string; sub: string }) {
    return (
        <li>
            <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-foreground">
                {label}
            </p>
            <p className="text-[12px] text-foreground-muted mt-1.5 leading-snug">{sub}</p>
        </li>
    );
}

function BrandMark() {
    return (
        <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background font-semibold text-[12px] tracking-tight"
        >
            S
        </span>
    );
}

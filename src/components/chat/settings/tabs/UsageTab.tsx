/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { useQuota } from '@/hooks/useQuota';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function UsageTab() {
    const { user } = useAuth();
    const { models } = useChat();

    if (!user || !models || models.length === 0) {
        return (
            <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
            </div>
        );
    }

    return (
        <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-1 duration-200 pb-4">
            {models.map((model) => (
                <ModelUsageCard
                    key={model.id}
                    modelId={model.id}
                    models={models}
                />
            ))}
        </div>
    );
}

function ModelUsageCard({
    modelId,
    models,
}: {
    modelId: string;
    models: any[];
}) {
    const model = models.find((m) => m.id === modelId);
    const quota = useQuota(modelId, models);

    if (!model) return null;

    const displayName =
        model.displayName || (model as any).display_name || model.id;
    const isPro = model.id.includes('pro');

    const pct = quota.loading ? 0 : Math.min(quota.pct * 100, 100);
    const pctLabel = quota.loading
        ? '—'
        : quota.pct >= 1
            ? '100%'
            : `${(quota.pct * 100).toFixed(1)}%`;

    return (
        <div className="rounded-md border border-border bg-surface px-4 py-3.5 space-y-3">
            {/* Title row */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    {isPro && (
                        <Sparkles
                            className="h-3.5 w-3.5 text-warning shrink-0"
                            strokeWidth={1.75}
                        />
                    )}
                    <h3 className="text-[13px] font-semibold text-foreground truncate">
                        {displayName}
                    </h3>
                </div>
                {quota.loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground-muted" />
                ) : (
                    <span className="font-mono text-[11px] tabular-nums text-foreground-muted">
                        {pctLabel}
                    </span>
                )}
            </div>

            {/* Progress bar */}
            <div className="relative h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                <div
                    className={cn(
                        'absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out',
                        quota.isExceeded
                            ? 'bg-destructive'
                            : quota.isNearLimit
                                ? 'bg-warning'
                                : 'bg-foreground'
                    )}
                    style={{ width: `${pct}%` }}
                />
            </div>

            {/* Footer numbers */}
            <div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-foreground-muted">
                <span>{quota.used.toLocaleString()} tokens</span>
                <span>{quota.limit.toLocaleString()} limit</span>
            </div>

            {/* Warning */}
            {quota.isNearLimit && !quota.isExceeded && (
                <p className="text-[12px] text-warning">
                    You&apos;re nearing your quota limit.
                </p>
            )}
            {quota.isExceeded && (
                <p className="text-[12px] text-destructive">
                    You&apos;ve exceeded your quota for this rolling window.
                </p>
            )}
        </div>
    );
}

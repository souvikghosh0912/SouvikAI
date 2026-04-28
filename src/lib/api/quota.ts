/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { QUOTA_WINDOW_MS, RPM_LIMIT } from '@/lib/limits';

export interface QuotaCheckResult {
    /** When non-null, the route MUST short-circuit and return this response. */
    response: NextResponse | null;
    /** Sum of tokens used by this user against this model in the current window. */
    tokensUsed: number;
}

/**
 * Run the per-user rate limit (RPM) and the per-model token quota check in
 * parallel against Supabase. Returns either:
 *   - `{ response: <NextResponse>, ... }` — the route should return it as-is
 *   - `{ response: null, tokensUsed }`     — the route may proceed
 *
 * The two underlying queries (`requests_log` count + `token_usage` sum) are
 * issued concurrently — same shape as the inlined version that previously
 * lived in /api/chat and /api/code/agent.
 */
export async function checkRateAndQuota(
    supabase: any,
    userId: string,
    modelId: string,
    quotaLimit: number,
): Promise<QuotaCheckResult> {
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const windowStart = new Date(Date.now() - QUOTA_WINDOW_MS).toISOString();

    const [recentRequestsRes, usageRowsRes] = await Promise.all([
        supabase
            .from('requests_log')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', oneMinuteAgo),
        supabase
            .from('token_usage')
            .select('tokens_used')
            .eq('user_id', userId)
            .eq('model_id', modelId)
            .gte('created_at', windowStart),
    ]);

    if ((recentRequestsRes.count ?? 0) >= RPM_LIMIT) {
        return {
            response: NextResponse.json(
                { error: `Rate limit exceeded. You can send up to ${RPM_LIMIT} messages per minute.` },
                { status: 429 },
            ),
            tokensUsed: 0,
        };
    }

    const tokensUsed = ((usageRowsRes.data ?? []) as { tokens_used: number }[]).reduce(
        (sum, r) => sum + r.tokens_used,
        0,
    );

    if (tokensUsed >= quotaLimit) {
        return {
            response: NextResponse.json(
                {
                    error: 'Token quota exceeded for this model. Please wait for the 5-hour window to reset.',
                    quotaExceeded: true,
                    used: tokensUsed,
                    limit: quotaLimit,
                },
                {
                    status: 429,
                    headers: {
                        'X-Quota-Used': String(tokensUsed),
                        'X-Quota-Limit': String(quotaLimit),
                    },
                },
            ),
            tokensUsed,
        };
    }

    return { response: null, tokensUsed };
}

/** Fire-and-forget request log insert. */
export function logRequest(
    supabase: any,
    userId: string,
    modelId: string,
): void {
    supabase
        .from('requests_log')
        .insert({ user_id: userId, model_id: modelId, status: 'completed' } as any)
        .then(({ error }: any) => {
            if (error) console.error('Failed to log request:', error);
        });
}

/** Fire-and-forget token usage insert. */
export function recordTokenUsage(
    supabase: any,
    userId: string,
    modelId: string,
    tokensUsed: number,
): void {
    supabase
        .from('token_usage')
        .insert({ user_id: userId, model_id: modelId, tokens_used: tokensUsed } as any)
        .then(({ error }: any) => {
            if (error) console.error('Failed to record token usage:', error);
        });
}

/** Rough token estimate: ~4 chars per token. */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

import { NextResponse } from 'next/server';

interface SupabaseLikeError {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
}

/**
 * Build a 500 response that surfaces the underlying Supabase / Postgres
 * error fields (`code`, `message`, `hint`) instead of hiding them behind a
 * generic message. Keeps logs and the client UI honest about what actually
 * went wrong (missing tables, RLS denials, FK violations, etc).
 */
export function surfaceServerError(
    err: unknown,
    fallback: string,
    logTag: string,
): NextResponse {
    const e = (err ?? {}) as SupabaseLikeError;
    console.error(logTag, {
        message: e.message,
        code: e.code,
        details: e.details,
        hint: e.hint,
        raw: err,
    });

    const detail =
        e.message ||
        (typeof err === 'string' ? err : fallback);

    return NextResponse.json(
        {
            error: `${fallback}: ${detail}`,
            code: e.code,
            hint: e.hint,
        },
        { status: 500 },
    );
}

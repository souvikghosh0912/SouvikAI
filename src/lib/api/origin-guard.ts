import { NextRequest, NextResponse } from 'next/server';

/**
 * Lightweight CSRF guard: when a browser-style cross-origin request is made
 * we reject. Server-to-server calls and some mobile clients don't send
 * Origin — those are allowed through unchanged.
 *
 * Returns a 403 NextResponse when the origin is mismatched, otherwise null
 * (i.e. continue processing).
 */
export function rejectCrossOrigin(request: NextRequest): NextResponse | null {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (!origin || !host) return null;

    try {
        const originHost = new URL(origin).host;
        // Strip the port for comparison when both sides use standard ports.
        const normalise = (h: string) => h.replace(/:(?:80|443)$/, '');
        if (normalise(originHost) !== normalise(host)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
    } catch {
        // Malformed Origin header — deny to be safe.
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return null;
}

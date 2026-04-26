import { NextRequest, NextResponse } from 'next/server';
import { searchWeb } from '@/lib/web-search';

/**
 * GET /api/tools/web-search?q=<query>
 * Pass-through wrapper used when the caller already has a focused query string.
 */
export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q')?.trim();

    if (!query) {
        return NextResponse.json(
            { error: 'Query parameter "q" is required' },
            { status: 400 },
        );
    }

    try {
        const data = await searchWeb(query);
        return NextResponse.json(data);
    } catch (error) {
        console.error('[Web Search API] Error:', error);
        return NextResponse.json({ query, results: [] });
    }
}

/**
 * POST /api/tools/web-search
 * Body: { message: string; history?: { role: string; content: string }[] }
 *
 * The user's message is rarely a good search query on its own (e.g.
 * "Hey, what's the latest version of Next.js?"). This handler rewrites it
 * into a focused, search-engine-ready query using a fast cheap model, then
 * runs that query through the Tavily-first provider chain.
 *
 * Response: { query: string; results: WebSearchResult[] }
 *   - `query` is the *rewritten* query so the UI can show the user what was
 *     actually searched for (e.g. "Next.js latest stable version 2026").
 */
export async function POST(request: NextRequest) {
    const { message, history } = await request.json();

    if (typeof message !== 'string' || message.trim().length === 0) {
        return NextResponse.json(
            { error: 'Body field "message" is required' },
            { status: 400 },
        );
    }

    const query = await rewriteToSearchQuery(message, Array.isArray(history) ? history : []);

    try {
        const data = await searchWeb(query);
        // Always echo the rewritten query back, even if the provider chain
        // happened to pick something slightly different internally.
        return NextResponse.json({ query, results: data.results });
    } catch (error) {
        console.error('[Web Search API] POST error:', error);
        return NextResponse.json({ query, results: [] });
    }
}

/**
 * Ask llama-3.1-8b-instruct (fast/cheap) to rewrite the user's natural-language
 * message into a concrete search query. Falls back to the trimmed raw message
 * if the rewriter is unavailable or misbehaves.
 */
async function rewriteToSearchQuery(
    message: string,
    history: Array<{ role: string; content: string }>,
): Promise<string> {
    const fallback = message.trim().slice(0, 300);

    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    if (!apiKey) return fallback;

    // Up to 4 most recent turns of context, each capped — references like
    // "what about its release date?" need the prior topic to be searchable.
    const contextLines = history
        .slice(-4)
        .map((m) => {
            const role = m.role === 'assistant' ? 'Assistant' : 'User';
            return `${role}: ${String(m.content).slice(0, 200)}`;
        })
        .join('\n');

    const prompt = `You rewrite a user's chat message into a single concise web search query.

Rules:
- Output ONLY the search query, nothing else (no quotes, no explanation, no prefixes like "Search:").
- Maximum 12 words.
- Resolve pronouns and references using the prior conversation if needed.
- Keep proper nouns, version numbers, dates, and technical terms exactly.
- If the user's message itself is already a clean search query, output it unchanged (trimmed).
- Do NOT answer the question. Do NOT add commentary.

${contextLines ? `Prior conversation:\n${contextLines}\n\n` : ''}User's latest message:
${message.slice(0, 500)}

Search query:`;

    // 6-second hard timeout — query rewriting must never block search noticeably.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6_000);

    try {
        const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'meta/llama-3.1-8b-instruct',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
                max_tokens: 40,
                stream: false,
            }),
            signal: controller.signal,
        });

        if (!res.ok) return fallback;

        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content?.trim() ?? '';

        // Sanitise: take only the first line, strip wrapping quotes/markdown,
        // drop common prefixes the model occasionally adds, hard-cap length.
        const cleaned = raw
            .split('\n')[0]
            .replace(/^(?:search\s*query\s*:|query\s*:|search\s*:)\s*/i, '')
            .replace(/^["'`*_]+|["'`*_]+$/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 300);

        return cleaned.length >= 2 ? cleaned : fallback;
    } catch {
        return fallback;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * web-search.ts
 * DuckDuckGo HTML scraper — zero external API keys required.
 * Called directly by the chat route; also exposed via /api/tools/web-search.
 */

export interface WebSearchResult {
    title: string;
    url: string;
    snippet: string;
    favicon: string;
}

export interface WebSearchResponse {
    query: string;
    results: WebSearchResult[];
}

/**
 * Perform a web search via DuckDuckGo's HTML endpoint.
 * Returns up to `limit` results (default 5).
 */
export async function searchWeb(
    query: string,
    limit = 5,
): Promise<WebSearchResponse> {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const response = await fetch(searchUrl, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(9_000),
    });

    if (!response.ok) {
        throw new Error(`DuckDuckGo returned HTTP ${response.status}`);
    }

    const html = await response.text();
    const results = parseResults(html, limit);
    return { query, results };
}

// ── Parsing ───────────────────────────────────────────────────────────────────

function parseResults(html: string, limit: number): WebSearchResult[] {
    const results: WebSearchResult[] = [];

    /**
     * DuckDuckGo HTML structure (simplified):
     *   <a class="result__a" href="//duckduckgo.com/l/?uddg=<encoded>&...">Title</a>
     *   <a class="result__snippet" ...>Snippet…</a>
     *
     * We extract titles/URLs and snippets separately then pair them by index.
     */
    const titleRe =
        /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    const snippetRe =
        /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

    const entries: { url: string; title: string }[] = [];
    const snippets: string[] = [];

    let m: RegExpExecArray | null;

    while ((m = titleRe.exec(html)) !== null) {
        const url = decodeDDGUrl(m[1]);
        const title = stripHtml(m[2]);
        if (url && title) entries.push({ url, title });
    }

    while ((m = snippetRe.exec(html)) !== null) {
        snippets.push(stripHtml(m[1]));
    }

    for (let i = 0; i < Math.min(entries.length, limit); i++) {
        const { url, title } = entries[i];
        const snippet = snippets[i] ?? '';

        let domain = '';
        try {
            domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {
            continue; // skip malformed URLs
        }

        results.push({
            title,
            url,
            snippet,
            favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=16`,
        });
    }

    return results;
}

/**
 * DuckDuckGo wraps outbound links:
 *   //duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com&rut=…
 * We decode the `uddg` param to get the real URL.
 */
function decodeDDGUrl(raw: string): string | null {
    try {
        if (raw.includes('uddg=')) {
            const full = raw.startsWith('//') ? `https:${raw}` : raw;
            const uddg = new URL(full).searchParams.get('uddg');
            return uddg ? decodeURIComponent(uddg) : null;
        }
        if (raw.startsWith('http')) return raw;
        if (raw.startsWith('//')) return `https:${raw}`;
        return null;
    } catch {
        return null;
    }
}

function stripHtml(html: string): string {
    return html
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Format search results as a readable context block to inject into the
 * system prompt sent to the LLM.
 */
export function formatSearchContext(
    query: string,
    results: WebSearchResult[],
): string {
    const lines = [
        `Web search results for: "${query}"`,
        '',
        ...results.map(
            (r, i) =>
                `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`,
        ),
        '',
        'Use the above results to inform your response. Cite source numbers like [1] when referencing them.',
    ];
    return lines.join('\n');
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatSearchContext, type WebSearchResult } from '@/lib/web-search';

/**
 * Injects tool-use instructions and search results into an apiMessages array.
 *
 * Two-phase contract with the model:
 *  1. First pass — `tool === 'searchWeb'` and no results yet. Append usage
 *     instructions to the system prompt so the model emits a `<search>` tag.
 *  2. Second pass — results have been fetched on the client. Insert a system
 *     message containing the formatted results and forbid further `<search>`
 *     emissions (the model otherwise tends to recurse).
 *
 * Mutates `apiMessages` in place — chosen over returning a new array because
 * the caller already builds the array as `let` and the splice on the second
 * pass needs to happen at length-1.
 */
export function applyWebSearchTool(
    apiMessages: any[],
    args: {
        tool?: string;
        searchResults?: WebSearchResult[];
        searchResultsQuery?: string;
    },
): void {
    const { tool, searchResults, searchResultsQuery } = args;

    if (tool === 'searchWeb' && (!searchResults || searchResults.length === 0)) {
        apiMessages[0].content += [
            '',
            '',
            '[TOOL AVAILABLE: searchWeb]',
            "You can search the web for real-time or up-to-date information. To do so, output ONE line containing ONLY a <search> tag whose contents are concise search keywords derived from the user's request. Do NOT include any other text, explanation, or <think> block — just the tag.",
            '',
            'Format:  <search>KEYWORDS</search>',
            'Example: if the user asks "what is the latest version of Next.js?", you must output exactly:',
            '<search>latest Next.js version</search>',
            '',
            'Replace the keywords with what is actually relevant to the user\'s prompt. Never output the literal placeholder text "KEYWORDS" or "your search query".',
        ].join('\n');
        return;
    }

    if (searchResults && searchResults.length > 0) {
        apiMessages.splice(apiMessages.length - 1, 0, {
            role: 'system' as const,
            content:
                formatSearchContext(searchResultsQuery || 'Search', searchResults) +
                '\n\nIMPORTANT: The web search has already been performed. Do NOT emit another <search> tag under any circumstances. Answer the user using the results above and cite sources like [1], [2].',
        });
    }
}

/**
 * Injects recalled facts and `<remember>` tool instructions into the system
 * prompt, when the user has memory enabled.
 *
 * Unlike `applyWebSearchTool` this isn't a two-phase tool — the model can
 * emit `<remember>` at any point in its answer and the client extracts it
 * from the finished stream (see `send-stream.ts`), so there's no result to
 * splice back in on a second pass.
 */
export function applyMemoryTool(
    apiMessages: any[],
    args: { enabled: boolean; memories: string[] },
): void {
    const { enabled, memories } = args;
    if (!enabled) return;

    const parts: string[] = [];

    if (memories.length > 0) {
        parts.push(
            '',
            '',
            '[WHAT YOU KNOW ABOUT THIS USER]',
            memories.map((m) => `- ${m}`).join('\n'),
            "Use this naturally; don't announce that you're \"recalling\" it unless relevant.",
        );
    }

    parts.push(
        '',
        '',
        '[TOOL AVAILABLE: remember]',
        'When the user shares a durable fact worth recalling in future conversations (stable preferences, identity, tools/stack they use, ongoing projects — NOT one-off request details), emit it as its own tag anywhere in your response: <remember>the fact, phrased in third person</remember>. Only do this for genuinely durable info, at most one or two per response, and never for sensitive data (health, financial, political/religious views) unless the user explicitly asks you to remember it.',
    );

    apiMessages[0].content += parts.join('\n');
}

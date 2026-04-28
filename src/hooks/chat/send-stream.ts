import type { Message, WebSearchResult } from '@/types/chat';
import type { AttachmentPayload } from '@/types/attachments';

export interface RunChatCompletionOptions {
    sessionId: string;
    /** Id of the just-inserted user message — used by the server to dedupe. */
    userMessageId: string;
    content: string;
    attachments: AttachmentPayload[];
    /** 'auto' is mapped to the default model id by the caller. */
    model: string;
    customSystemPrompt: string;
    tool?: string;
    signal: AbortSignal;
    /** Used to flip the assistant bubble into the "Searching the web…" state. */
    assistantId: string;
    /** Apply a partial mutation to the assistant message in the chat state. */
    onMutateAssistant: (mutate: (msg: Message) => Message) => void;
    /** Update assistant content as tokens stream in (with `<search>` tags stripped). */
    onAssistantContent: (content: string) => void;
}

/**
 * Drive one assistant turn end-to-end:
 *
 *   1. POST to /api/chat with the user message and any tool hints.
 *   2. Stream the response, applying tokens to the assistant bubble.
 *   3. If the model emits a `<search>` tag (web-search tool), abort the
 *      current stream, run the web search via /api/tools/web-search, then
 *      recursively re-call /api/chat with the search results injected.
 *   4. Return the final assistant content with any stray `<search>` tags
 *      stripped, so callers can safely persist it to the DB.
 *
 * Pure async function — no React state references — which makes the chat
 * streaming pipeline testable in isolation from the hook.
 */
export async function runChatCompletion(opts: RunChatCompletionOptions): Promise<string> {
    return runCompletion(opts, opts.tool, undefined, undefined);
}

async function runCompletion(
    opts: RunChatCompletionOptions,
    currentTool: string | undefined,
    currentSearchResults: WebSearchResult[] | undefined,
    currentSearchQuery: string | undefined,
): Promise<string> {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId: opts.sessionId,
            messageId: opts.userMessageId,
            content: opts.content,
            attachments: opts.attachments,
            model: opts.model === 'auto' ? 'souvik-ai-1' : opts.model,
            systemPrompt: opts.customSystemPrompt,
            tool: currentTool,
            searchResults: currentSearchResults,
            searchResultsQuery: currentSearchQuery,
        }),
        signal: opts.signal,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to get response' }));
        throw new Error(error.error || 'Failed to get response');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let assistantContent = '';
    let searchIntercepted = false;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        assistantContent += decoder.decode(value);

        // ── Client-side tool coordination ──────────────────────────────────
        // The model emits exactly one `<search>` tag. We tear down the
        // current stream the moment we see it close, run the search on the
        // server, and re-call the chat endpoint with the results injected.
        if (currentTool === 'searchWeb' && !currentSearchResults && !searchIntercepted) {
            const searchMatch = assistantContent.match(/<search>([\s\S]*?)<\/search>/);
            if (searchMatch) {
                searchIntercepted = true;
                const query = searchMatch[1].trim();

                // 1. Stop the current stream — we're pivoting.
                await reader.cancel();

                // 2. Flip UI to "Searching the web…" shimmer.
                opts.onMutateAssistant((m) => ({
                    ...m,
                    content: '',
                    webSearch: { query, status: 'searching', results: [] },
                }));

                // 3. Run the search.
                let results: WebSearchResult[] = [];
                try {
                    const res = await fetch(`/api/tools/web-search?q=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    results = data.results || [];
                } catch (e) {
                    console.error('[Chat] Search failed, falling back:', e);
                }

                // 4. Mark the search as done with sources.
                opts.onMutateAssistant((m) => ({
                    ...m,
                    webSearch: { query, status: 'done', results },
                }));

                // 5. Recurse with the results in hand.
                return await runCompletion(opts, undefined, results, query);
            }
            // Still streaming the `<search>` tag — don't show partials yet.
            if (assistantContent.includes('<search')) continue;
        }

        // Safety net: strip stray `<search>…</search>` tags from the
        // visible content so they never leak into the rendered bubble or
        // the persisted DB row.
        const visibleContent = assistantContent.replace(/<search>[\s\S]*?<\/search>/gi, '');
        opts.onAssistantContent(visibleContent);
    }

    return assistantContent.replace(/<search>[\s\S]*?<\/search>/gi, '').trim();
}

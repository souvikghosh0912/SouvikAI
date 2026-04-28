/**
 * Fire-and-forget AI-generated chat title for a session that just had its
 * first exchange. Failures are silent — the placeholder remains.
 */
export function generateAndApplyTitle(opts: {
    sessionId: string;
    userMessage: string;
    /** Final assistant content with `<think>…</think>` blocks already stripped. */
    assistantMessage: string;
    onTitleResolved: (title: string) => void;
}): void {
    fetch('/api/chat/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId: opts.sessionId,
            userMessage: opts.userMessage,
            assistantMessage: opts.assistantMessage,
        }),
    })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
            if (data?.title) opts.onTitleResolved(data.title);
        })
        .catch(() => {
            /* title failure is silent */
        });
}

/**
 * Build the placeholder title shown the moment the user sends the first
 * message in a new chat. Replaced asynchronously by the AI title.
 */
export function buildPlaceholderTitle(content: string, maxLen = 40): string {
    return content.slice(0, maxLen) + (content.length > maxLen ? '…' : '');
}

/** Strip the `<think>` blocks NVIDIA NIM models emit before the title call. */
export function stripThinkBlocks(content: string): string {
    return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

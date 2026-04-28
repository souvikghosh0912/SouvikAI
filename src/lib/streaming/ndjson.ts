/**
 * Read newline-delimited JSON events from a streaming response body.
 *
 * Designed to be tolerant of:
 *  - Partial chunks that split a line in the middle (buffered until the
 *    next chunk completes the line).
 *  - Empty lines emitted as keep-alives.
 *  - Single malformed lines — those are skipped without tearing down the
 *    rest of the stream.
 *
 * A trailing line without a newline is parsed once the upstream closes.
 */
export async function consumeNDJSONStream<T>(
    body: ReadableStream<Uint8Array>,
    onEvent: (ev: T) => void,
): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
                onEvent(JSON.parse(trimmed) as T);
            } catch {
                // Malformed line — skip, don't tear down the stream.
            }
        }
    }

    const trailing = buffer.trim();
    if (trailing) {
        try {
            onEvent(JSON.parse(trailing) as T);
        } catch {
            /* ignore */
        }
    }
}

/**
 * Encode a single event as one NDJSON line (object + trailing newline).
 * Used by streaming server routes that produce events of an arbitrary shape.
 */
export function encodeNDJSONEvent<T>(ev: T): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(ev) + '\n');
}

/**
 * Google AI (Gemini) streaming client.
 *
 * Mirrors the interface exposed by `nvidia-nim.ts` so the chat route can swap
 * providers with a minimal branch. Key differences from the NVIDIA path:
 *
 *   1. Gemini uses a `contents[]` array (not `messages[]`), with `parts`.
 *   2. The system prompt travels as a top-level `systemInstruction` field,
 *      not as a `{ role: 'system', … }` message.
 *   3. The streaming endpoint returns newline-delimited JSON objects, not SSE.
 *   4. We re-emit each text chunk as a plain string so the caller gets the
 *      same `ReadableStream<string>` that `parseSSEStream` would produce.
 *
 * Docs: https://ai.google.dev/api/generate-content#v1beta.models.streamGenerateContent
 */

/** The subset of message roles that the chat route passes to us. */
export type GeminiRole = 'user' | 'assistant' | 'system';

export interface GeminiMessage {
    role: GeminiRole;
    content: string;
}

/** Shape of a single chunk in Gemini's streaming NDJSON response. */
interface GeminiStreamChunk {
    candidates?: {
        content?: {
            parts?: { text?: string }[];
        };
        finishReason?: string;
    }[];
    error?: {
        code: number;
        message: string;
        status: string;
    };
}

/**
 * Convert OpenAI-style messages into the Gemini `contents[]` + optional
 * `systemInstruction` fields expected by the REST API.
 */
function buildGeminiPayload(messages: GeminiMessage[]): {
    systemInstruction?: { parts: { text: string }[] };
    contents: { role: string; parts: { text: string }[] }[];
} {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    // Gemini only supports a single system instruction.
    const systemText = systemMessages.map((m) => m.content).join('\n\n');

    // Gemini uses 'user' and 'model' (not 'assistant').
    const contents = conversationMessages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
    }));

    return {
        ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
        contents,
    };
}

/**
 * Stream a chat completion from the Google Gemini API.
 *
 * Returns a `ReadableStream<string>` of plain text chunks — the same surface
 * that `parseSSEStream` returns for the NVIDIA path — so the chat route can
 * treat both providers identically after this call.
 */
export async function streamGoogleCompletion(
    messages: GeminiMessage[],
    options: {
        model: string;
        temperature: number;
        maxTokens: number;
        signal?: AbortSignal;
    }
): Promise<ReadableStream<string>> {
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
        throw new Error('Google AI API key not configured (GOOGLE_AI_API_KEY)');
    }

    const { systemInstruction, contents } = buildGeminiPayload(messages);

    const endpoint =
        `https://generativelanguage.googleapis.com/v1beta/models/` +
        `${encodeURIComponent(options.model)}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...(systemInstruction ? { systemInstruction } : {}),
            contents,
            generationConfig: {
                temperature: options.temperature,
                maxOutputTokens: options.maxTokens,
            },
        }),
        signal: options.signal,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google AI API error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
        throw new Error('Google AI returned an empty response body');
    }

    // Decode the SSE stream (alt=sse) and emit only text deltas.
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream<string>({
        async start(controller) {
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        controller.close();
                        break;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;

                        const raw = line.slice(6).trim();
                        if (!raw || raw === '[DONE]') continue;

                        let chunk: GeminiStreamChunk;
                        try {
                            chunk = JSON.parse(raw) as GeminiStreamChunk;
                        } catch {
                            // Skip malformed lines silently.
                            continue;
                        }

                        // Surface API-level errors embedded in the stream.
                        if (chunk.error) {
                            controller.error(
                                new Error(`Google AI stream error: ${chunk.error.message}`)
                            );
                            return;
                        }

                        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (typeof text === 'string' && text.length > 0) {
                            controller.enqueue(text);
                        }
                    }
                }
            } catch (err) {
                controller.error(err);
            } finally {
                reader.releaseLock();
            }
        },
    });
}

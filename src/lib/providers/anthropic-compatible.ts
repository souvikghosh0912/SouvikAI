/**
 * Generic Anthropic-compatible Messages API streaming client.
 *
 * Parameterized by `baseUrl`/`apiKey` so it can serve any Anthropic-shaped
 * endpoint (freemodel.dev's anthropic surface, admin-defined custom
 * providers). System messages are pulled out into a top-level `system`
 * field, mirroring how `google-ai.ts` handles Gemini's `systemInstruction`.
 */

interface AnthropicCompatibleMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface AnthropicStreamEvent {
    type: string;
    delta?: {
        type?: string;
        text?: string;
    };
    error?: {
        type: string;
        message: string;
    };
}

export async function streamAnthropicCompatible(
    messages: AnthropicCompatibleMessage[],
    options: {
        baseUrl: string;
        apiKey: string;
        model: string;
        temperature: number;
        maxTokens: number;
        signal?: AbortSignal;
    }
): Promise<ReadableStream<string>> {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');
    const systemText = systemMessages.map((m) => m.content).join('\n\n');

    const url = `${options.baseUrl.replace(/\/+$/, '')}/v1/messages`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': options.apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: options.model,
            ...(systemText ? { system: systemText } : {}),
            messages: conversationMessages.map((m) => ({ role: m.role, content: m.content })),
            temperature: options.temperature,
            max_tokens: options.maxTokens,
            stream: true,
        }),
        signal: options.signal,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic-compatible API error (${response.status}): ${error}`);
    }

    if (!response.body) {
        throw new Error('No response body');
    }

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
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        const data = line.slice(6).trim();
                        if (!data) continue;

                        let event: AnthropicStreamEvent;
                        try {
                            event = JSON.parse(data) as AnthropicStreamEvent;
                        } catch {
                            continue;
                        }

                        if (event.type === 'error' || event.error) {
                            controller.error(
                                new Error(`Anthropic-compatible stream error: ${event.error?.message ?? 'unknown error'}`)
                            );
                            return;
                        }

                        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                            const text = event.delta.text;
                            if (typeof text === 'string' && text.length > 0) {
                                controller.enqueue(text);
                            }
                        }

                        if (event.type === 'message_stop') {
                            controller.close();
                            return;
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

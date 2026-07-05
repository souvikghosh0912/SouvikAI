/**
 * Generic OpenAI-compatible chat-completions streaming client.
 *
 * Parameterized by `baseUrl`/`apiKey` so it can serve any OpenAI-shaped
 * endpoint (freemodel.dev's openai surface, admin-defined custom providers,
 * self-hosted vLLM/Ollama, OpenRouter, etc). `baseUrl` is expected to already
 * include the version segment (e.g. `https://api.example.com/v1`); this
 * appends `/chat/completions` to it.
 */

interface OpenAICompatibleMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface OpenAICompatibleStreamResponse {
    choices: {
        delta: {
            role?: string;
            content?: string;
            reasoning_content?: string;
        };
        finish_reason: string | null;
    }[];
}

export async function streamOpenAICompatible(
    messages: OpenAICompatibleMessage[],
    options: {
        baseUrl: string;
        apiKey: string;
        model: string;
        temperature: number;
        maxTokens: number;
        signal?: AbortSignal;
    }
): Promise<ReadableStream<string>> {
    const url = `${options.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify({
            model: options.model,
            messages,
            temperature: options.temperature,
            max_tokens: options.maxTokens,
            stream: true,
        }),
        signal: options.signal,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI-compatible API error (${response.status}): ${error}`);
    }

    if (!response.body) {
        throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream<string>({
        async start(controller) {
            let buffer = '';
            let inReasoning = false;

            try {
                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        if (inReasoning) controller.enqueue('\n</think>\n\n');
                        controller.close();
                        break;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            if (inReasoning) controller.enqueue('\n</think>\n\n');
                            controller.close();
                            return;
                        }

                        try {
                            const parsed = JSON.parse(data) as OpenAICompatibleStreamResponse;
                            const delta = parsed.choices[0]?.delta;
                            if (!delta) continue;

                            const r = delta.reasoning_content;
                            const c = delta.content;

                            if (typeof r === 'string' && r.length > 0) {
                                if (!inReasoning) {
                                    controller.enqueue('<think>\n');
                                    inReasoning = true;
                                }
                                controller.enqueue(r);
                            }

                            if (typeof c === 'string' && c.length > 0) {
                                if (inReasoning) {
                                    controller.enqueue('\n</think>\n\n');
                                    inReasoning = false;
                                }
                                controller.enqueue(c);
                            }
                        } catch {
                            // Skip malformed JSON
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

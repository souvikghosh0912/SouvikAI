/**
 * Dispatches a chat completion to an admin-defined custom provider, based on
 * the request protocol stored on its `custom_providers` row.
 */
import { streamOpenAICompatible } from '@/lib/providers/openai-compatible';
import { streamAnthropicCompatible } from '@/lib/providers/anthropic-compatible';
import { streamGeminiCompatible } from '@/lib/providers/gemini-compatible';

interface CustomProviderMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export async function streamCustomProviderCompletion(
    messages: CustomProviderMessage[],
    options: {
        baseUrl: string;
        apiKey: string;
        protocol: 'openai' | 'anthropic' | 'gemini';
        model: string;
        temperature: number;
        maxTokens: number;
        signal?: AbortSignal;
    }
): Promise<ReadableStream<string>> {
    const { baseUrl, apiKey, model, temperature, maxTokens, signal } = options;

    switch (options.protocol) {
        case 'anthropic':
            return streamAnthropicCompatible(messages, { baseUrl, apiKey, model, temperature, maxTokens, signal });
        case 'gemini':
            return streamGeminiCompatible(messages, { baseUrl, apiKey, model, temperature, maxTokens, signal });
        case 'openai':
        default:
            return streamOpenAICompatible(messages, { baseUrl, apiKey, model, temperature, maxTokens, signal });
    }
}

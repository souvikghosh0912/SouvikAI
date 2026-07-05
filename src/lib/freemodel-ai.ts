/**
 * freemodel.dev client.
 *
 * freemodel.dev exposes two API surfaces depending on the underlying model
 * family: an OpenAI-compatible one for OpenAI-style models, and an
 * Anthropic-compatible one for Anthropic-style models. The model's `protocol`
 * column picks which one to call.
 */
import { streamOpenAICompatible } from '@/lib/providers/openai-compatible';
import { streamAnthropicCompatible } from '@/lib/providers/anthropic-compatible';

const FREEMODEL_OPENAI_BASE_URL = 'https://api.freemodel.dev/v1';
const FREEMODEL_ANTHROPIC_BASE_URL = 'https://cc.freemodel.dev';

interface FreemodelMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export async function streamFreemodelCompletion(
    messages: FreemodelMessage[],
    options: {
        model: string;
        protocol: 'openai' | 'anthropic';
        temperature: number;
        maxTokens: number;
        signal?: AbortSignal;
    }
): Promise<ReadableStream<string>> {
    const apiKey = process.env.FREEMODEL_API_KEY;

    if (!apiKey) {
        throw new Error('freemodel.dev API key not configured (FREEMODEL_API_KEY)');
    }

    if (options.protocol === 'anthropic') {
        return streamAnthropicCompatible(messages, {
            baseUrl: FREEMODEL_ANTHROPIC_BASE_URL,
            apiKey,
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            signal: options.signal,
        });
    }

    return streamOpenAICompatible(messages, {
        baseUrl: FREEMODEL_OPENAI_BASE_URL,
        apiKey,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        signal: options.signal,
    });
}

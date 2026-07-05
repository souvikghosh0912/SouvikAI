import { createServiceClient } from '@/lib/supabase/server';

/**
 * Resolve the system prompt content for a chat request, with a short
 * in-process cache per lookup key so every request doesn't round-trip to
 * Postgres. Prompts are admin-editable at any time, so the cache uses a
 * short TTL (not indefinite like the old file-based cache) and is bypassed
 * entirely in development.
 */
const CACHE_TTL_MS = 60_000;
const FALLBACK_PROMPT = 'You are SouvikAI, a helpful and concise AI assistant.';

interface CacheEntry {
    content: string;
    cachedAt: number;
}

const _cache = new Map<string, CacheEntry>();

function getCached(key: string): string | null {
    if (process.env.NODE_ENV === 'development') return null;
    const entry = _cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
        _cache.delete(key);
        return null;
    }
    return entry.content;
}

function setCached(key: string, content: string) {
    _cache.set(key, { content, cachedAt: Date.now() });
}

async function fetchDefaultPrompt(): Promise<string | null> {
    const cached = getCached('__default__');
    if (cached !== null) return cached;

    try {
        const supabase = await createServiceClient();
        const { data } = await supabase
            .from('system_prompts')
            .select('content')
            .eq('is_default', true)
            .single();
        const content = (data as { content: string } | null)?.content ?? null;
        if (content) setCached('__default__', content);
        return content;
    } catch {
        return null;
    }
}

async function fetchPromptById(id: string): Promise<string | null> {
    const cached = getCached(id);
    if (cached !== null) return cached;

    try {
        const supabase = await createServiceClient();
        const { data } = await supabase
            .from('system_prompts')
            .select('content')
            .eq('id', id)
            .single();
        const content = (data as { content: string } | null)?.content ?? null;
        if (content) setCached(id, content);
        return content;
    } catch {
        return null;
    }
}

/**
 * Resolve the system prompt for a given model's `system_prompt_id`.
 * NULL (unassigned) falls back to the prompt with is_default = true.
 * Any failure falls back to a hardcoded safety-net string.
 */
export async function getSystemPromptForModel(systemPromptId: string | null): Promise<string> {
    if (systemPromptId) {
        const content = await fetchPromptById(systemPromptId);
        if (content) return content;
    }

    const defaultContent = await fetchDefaultPrompt();
    if (defaultContent) return defaultContent;

    console.warn('[Chat] Could not resolve a system prompt from the database, using hardcoded fallback');
    return FALLBACK_PROMPT;
}

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Load `system_prompt.txt` lazily and cache it in-process.
 *
 * - Avoids module-level synchronous fs reads that crash some serverless
 *   runtimes at cold-start (process.cwd() can resolve unexpectedly).
 * - In development the cache is bypassed so edits to the file take effect
 *   without restarting the dev server.
 */
let _cache: string | null = null;

export async function getChatSystemPrompt(): Promise<string> {
    if (process.env.NODE_ENV === 'development') {
        _cache = null;
    }
    if (_cache !== null) return _cache;

    try {
        _cache = await fs.readFile(
            path.join(process.cwd(), 'system_prompt.txt'),
            'utf-8',
        );
    } catch {
        console.warn('[Chat] Could not read system_prompt.txt, using default');
        _cache = 'You are SouvikAI, a helpful and concise AI assistant.';
    }
    return _cache;
}

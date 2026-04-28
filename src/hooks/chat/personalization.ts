import type { ChatPreferences } from '@/hooks/useChatPreferences';

/**
 * Convert the user's chat preferences into a plain-English block that the
 * model can follow. Returns the empty string when no preferences are
 * non-default, so callers don't need to special-case "nothing to add".
 *
 * Kept separate from useChat so each preference is documented in one place
 * and adding a new one (e.g. "language") is an isolated change.
 */
export function buildPersonalizationBlock(p: ChatPreferences): string {
    const lines: string[] = [];

    if (p.toneStyle !== 'default') {
        const toneMap: Record<string, string> = {
            formal:    'Use a formal, professional tone.',
            casual:    'Use a casual, conversational tone.',
            technical: 'Use a precise, technical tone with domain-specific terminology.',
            friendly:  'Use a friendly, approachable tone.',
        };
        const line = toneMap[p.toneStyle];
        if (line) lines.push(line);
    }
    if (p.warmth !== 'default') {
        lines.push(p.warmth === 'more'
            ? 'Be warm and personal in your responses.'
            : 'Keep responses professional and impersonal.');
    }
    if (p.enthusiasm !== 'default') {
        lines.push(p.enthusiasm === 'more'
            ? 'Be enthusiastic and energetic.'
            : 'Be measured and understated in tone.');
    }
    if (p.headersAndLists !== 'default') {
        lines.push(p.headersAndLists === 'more'
            ? 'Use markdown headers and bullet lists generously to structure your answers.'
            : 'Avoid markdown headers and bullet lists; prefer flowing prose.');
    }
    if (p.emoji !== 'default') {
        lines.push(p.emoji === 'more'
            ? 'Include relevant emoji throughout your responses.'
            : 'Do not use emoji in your responses.');
    }

    return lines.filter(Boolean).join(' ');
}

/**
 * Compose the final custom system prompt sent to the API: the user's saved
 * `systemPrompt` (if marked safe) plus the personalization block, joined by
 * a blank line.
 */
export function composeCustomSystemPrompt(p: ChatPreferences): string {
    const personalization = buildPersonalizationBlock(p);
    return [
        p.isSystemPromptSafe && p.systemPrompt ? p.systemPrompt : '',
        personalization,
    ].filter(Boolean).join('\n\n');
}

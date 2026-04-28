/**
 * Milestone tool — emits a short progress label that the UI renders in the
 * agent's vertical timeline.
 *
 * Tag form (only one variant — milestones always have a body):
 *
 *   <milestone>Adding the hero section</milestone>
 *
 * Self-closing milestones are not allowed; an open tag without a close is
 * dropped on flush.
 */
import type { ParseableTool, PromptTool } from './types';

export const milestoneTool: ParseableTool & PromptTool = {
    id: 'milestone',
    tagStartPattern: /<milestone[\s>/]/gi,

    promptSection: `### Milestones

Use a milestone before each major step so the user sees your progress in real
time. Keep them short (3–7 words). Examples:

  <milestone>Planning the layout</milestone>
  <milestone>Adding the hero section</milestone>
  <milestone>Wiring up the contact form</milestone>`,

    parse(rest, final) {
        // Full open + close form — the only valid variant.
        const full = /^<milestone\s*>([\s\S]*?)<\/milestone>/i.exec(rest);
        if (full) {
            return {
                status: 'complete',
                event: { type: 'milestone', text: full[1].trim() },
                consumed: full[0].length,
            };
        }
        // Stray closing tag (no preceding open) — drop it silently.
        if (/^<\/milestone>/i.test(rest)) {
            return { status: 'complete', event: null, consumed: '</milestone>'.length };
        }
        // Open-tag detected but not yet complete.
        if (/^<milestone[\s>]/i.test(rest)) {
            // On flush, drop the dangling open tag and the rest of the buffer.
            if (final) return { status: 'complete', event: null, consumed: rest.length };
            return { status: 'partial' };
        }
        return { status: 'no-match' };
    },
};

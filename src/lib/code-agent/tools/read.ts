/**
 * Read tool — agent-issued tool call that fetches the full contents of one or
 * more existing files. Used when the snapshot in the system prompt is
 * truncated and the agent needs the complete text to make a correct edit.
 *
 * Tag forms:
 *
 *   <read path="app/page.tsx" />            (preferred)
 *   <read path="app/page.tsx"></read>       (open + close, body ignored)
 *
 * After emitting one or more reads, the agent stops; the server feeds the
 * contents back as a synthetic user turn (see {@link renderReadToolResult})
 * and runs another agent phase.
 */
import type { BuilderFiles } from '@/types/code';
import type { ParseableTool, PromptTool } from './types';
import { parseAttrs, sanitizePath } from './utils';

/** Per-file cap on content injected into a read-result message. */
const MAX_READ_RESULT_CHARS_PER_FILE = 32_000;

export const readTool: ParseableTool & PromptTool = {
    id: 'read',
    tagStartPattern: /<read[\s>/]/gi,

    promptSection: `### Reading a file (tool call)

When a file in PROJECT FILES is shown truncated (you'll see
\`[file truncated, original length N chars]\`) and you need the full content
to edit it correctly, request it with a self-closing read tag:

  <read path="app/page.tsx" />

After emitting one or more \`<read>\` tags, STOP your response. The system
will reply with the full contents of every file you requested and you can
then continue your task in a follow-up turn. Do not emit \`<action>\` tags
in the same response as a \`<read>\` — finish your reads first, then act on
the contents you receive back. You may issue at most a couple of read rounds
per turn, so request every file you'll need at once.`,

    parse(rest, final) {
        // Self-closing form (preferred).
        const selfClose = /^<read([^>]*?)\/\s*>/i.exec(rest);
        if (selfClose) {
            const attrs = parseAttrs(selfClose[1]);
            const path = sanitizePath(attrs.path || '');
            return {
                status: 'complete',
                event: path ? { type: 'read', path } : null,
                consumed: selfClose[0].length,
            };
        }
        // Open + close form (body ignored — read is a tool call, not content).
        const full = /^<read([^>]*)>([\s\S]*?)<\/read>/i.exec(rest);
        if (full) {
            const attrs = parseAttrs(full[1]);
            const path = sanitizePath(attrs.path || '');
            return {
                status: 'complete',
                event: path ? { type: 'read', path } : null,
                consumed: full[0].length,
            };
        }
        // Open detected but not yet complete.
        if (/^<read[\s>]/i.test(rest)) {
            if (final) return { status: 'complete', event: null, consumed: rest.length };
            return { status: 'partial' };
        }
        return { status: 'no-match' };
    },
};

/**
 * Render the synthetic user message that fulfils a batch of `<read>` tool
 * calls. Each requested file is included in full (subject to a generous
 * per-file cap), or marked NOT FOUND if it doesn't exist in the workspace.
 *
 * Duplicate paths in the request are deduped — the model sometimes asks for
 * the same file twice if it's iterating.
 */
export function renderReadToolResult(
    paths: string[],
    files: BuilderFiles,
): string {
    const seen = new Set<string>();
    const blocks: string[] = [];
    for (const p of paths) {
        if (seen.has(p)) continue;
        seen.add(p);
        const raw = files[p];
        if (raw === undefined) {
            blocks.push(`--- FILE NOT FOUND: ${p} ---`);
            continue;
        }
        let content = raw;
        let suffix = '';
        if (content.length > MAX_READ_RESULT_CHARS_PER_FILE) {
            content = content.slice(0, MAX_READ_RESULT_CHARS_PER_FILE);
            suffix = `\n... [further content truncated; original length ${raw.length} chars]`;
        }
        blocks.push(`--- FILE: ${p} ---\n${content}${suffix}\n--- END FILE ---`);
    }
    return [
        '<read-result>',
        blocks.join('\n\n'),
        '</read-result>',
        '',
        'Above are the full contents you requested. Continue your previous task using these contents — emit milestones, file actions, and a final summary as usual. Do not emit `<read>` again unless you genuinely need another file.',
    ].join('\n');
}

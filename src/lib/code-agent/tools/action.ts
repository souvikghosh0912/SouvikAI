/**
 * `<action>` tag parser.
 *
 * The four file-action subtools (create / edit / delete / rename) all share
 * the `<action>` tag namespace and disambiguate via the `type=` attribute.
 * This module owns the tag-level parsing — once a tag is matched, attribute
 * extraction and validation are delegated to the relevant subtool's
 * {@link FileActionTool.buildAction} method, and persistence is delegated
 * to its {@link FileActionTool.execute}.
 */
import type { BuilderFileAction } from '@/types/code';
import type { DB, FileActionTool, ParseableTool, PromptTool } from './types';
import { parseAttrs, stripCDATA, trimActionBody } from './utils';
import { createTool } from './create';
import { editTool } from './edit';
import { deleteTool } from './delete';
import { renameTool } from './rename';

/** Registry of every file-action subtool, keyed by its `type=` attribute. */
export const FILE_ACTION_TOOLS: Record<BuilderFileAction['kind'], FileActionTool> = {
    create: createTool,
    edit: editTool,
    delete: deleteTool,
    rename: renameTool,
};

/** Build a {@link BuilderFileAction} by dispatching to the right subtool. */
function buildActionFromAttrs(
    attrs: Record<string, string>,
    body: string,
): BuilderFileAction | null {
    const type = (attrs.type || '').toLowerCase() as BuilderFileAction['kind'];
    const tool = FILE_ACTION_TOOLS[type];
    if (!tool) return null;
    return tool.buildAction(attrs, body);
}

/**
 * The streaming-parser entry for every `<action>` tag, regardless of subtype.
 * Parses both the self-closing and open+close forms.
 */
export const actionTool: ParseableTool & PromptTool = {
    id: 'action',
    tagStartPattern: /<action[\s>/]/gi,

    /**
     * Concatenated docs for every file-action subtool. Order matches the
     * order users typically reach for: create → edit → delete → rename.
     */
    promptSection: [
        '### File actions',
        '',
        createTool.promptSection,
        '',
        editTool.promptSection,
        '',
        deleteTool.promptSection,
        '',
        renameTool.promptSection,
    ].join('\n'),

    parse(rest, final) {
        // Self-closing form — used by `delete` and `rename`.
        const selfClose = /^<action([^>]*?)\/\s*>/i.exec(rest);
        if (selfClose) {
            const attrs = parseAttrs(selfClose[1]);
            const action = buildActionFromAttrs(attrs, '');
            return {
                status: 'complete',
                event: action ? { type: 'action', action } : null,
                consumed: selfClose[0].length,
            };
        }
        // Open + close form — used by `create` and `edit`.
        const fullAction = /^<action([^>]*)>([\s\S]*?)<\/action>/i.exec(rest);
        if (fullAction) {
            const attrs = parseAttrs(fullAction[1]);
            const body = trimActionBody(stripCDATA(fullAction[2]));
            const action = buildActionFromAttrs(attrs, body);
            return {
                status: 'complete',
                event: action ? { type: 'action', action } : null,
                consumed: fullAction[0].length,
            };
        }
        // Open detected but not yet complete.
        if (/^<action[\s>]/i.test(rest)) {
            if (final) return { status: 'complete', event: null, consumed: rest.length };
            return { status: 'partial' };
        }
        return { status: 'no-match' };
    },
};

/**
 * Persist a parsed file action by routing to the relevant subtool's executor.
 * Throws on hard errors (e.g. workspace file cap reached); callers swallow
 * per-action errors so a single bad action doesn't tear down the whole turn.
 */
export async function executeFileAction(
    supabase: DB,
    workspaceId: string,
    action: BuilderFileAction,
): Promise<void> {
    const tool = FILE_ACTION_TOOLS[action.kind];
    if (!tool) throw new Error(`Unknown file action kind: ${(action as { kind: string }).kind}`);
    await tool.execute(supabase, workspaceId, action);
}

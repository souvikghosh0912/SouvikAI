/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Rename / move action tool. Self-closing — preserves the source file's
 * contents. If the destination already exists it is overwritten.
 *
 *   <action type="rename" from="app/Hero.tsx" to="app/components/Hero.tsx" />
 *
 * Done as two SQL statements (delete-destination → update-path) so the
 * `(workspace_id, path)` unique index never trips. If the workspace's
 * `active_file` pointed at the source, it follows the move.
 */
import type { BuilderFileAction } from '@/types/code';
import type { FileActionTool } from './types';
import { sanitizePath } from './utils';

export const renameTool: FileActionTool = {
    actionType: 'rename',
    selfClosing: true,

    promptSection: `To RENAME or MOVE a file, output a self-closing tag with \`from\` and \`to\`:

  <action type="rename" from="app/Hero.tsx" to="app/components/Hero.tsx" />

Renames preserve the file's contents — do not also emit a create + delete pair
for the same move. If the destination already exists it will be overwritten.`,

    buildAction(attrs): BuilderFileAction | null {
        const from = sanitizePath(attrs.from || '');
        const to = sanitizePath(attrs.to || '');
        if (!from || !to || from === to) return null;
        return { kind: 'rename', from, to };
    },

    async execute(supabase, workspaceId, action) {
        if (action.kind !== 'rename') return;
        if (action.from === action.to) return; // defensive — also filtered in buildAction
        const sb = supabase as any;

        // Drop destination if it already exists (overwrite semantics).
        const { error: delErr } = await sb
            .from('builder_files')
            .delete()
            .eq('workspace_id', workspaceId)
            .eq('path', action.to);
        if (delErr) throw delErr;

        // Move the source row into the destination path.
        const { error: updErr } = await sb
            .from('builder_files')
            .update({ path: action.to })
            .eq('workspace_id', workspaceId)
            .eq('path', action.from);
        if (updErr) throw updErr;

        // Follow the move with the workspace's active_file pointer if needed.
        await sb
            .from('builder_workspaces')
            .update({ active_file: action.to })
            .eq('id', workspaceId)
            .eq('active_file', action.from);
    },
};

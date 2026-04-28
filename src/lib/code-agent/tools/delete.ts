/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Delete-file action tool. Self-closing — never carries a body.
 *
 *   <action type="delete" path="app/old-component.tsx" />
 *
 * No-op if the file doesn't exist (so the model can't crash a turn by
 * referencing a stale path).
 */
import type { BuilderFileAction } from '@/types/code';
import type { FileActionTool } from './types';
import { sanitizePath } from './utils';

export const deleteTool: FileActionTool = {
    actionType: 'delete',
    selfClosing: true,

    promptSection: `To DELETE a file, output a self-closing tag:

  <action type="delete" path="app/old-component.tsx" />`,

    buildAction(attrs): BuilderFileAction | null {
        const path = sanitizePath(attrs.path || '');
        if (!path) return null;
        return { kind: 'delete', path };
    },

    async execute(supabase, workspaceId, action) {
        if (action.kind !== 'delete') return;
        const sb = supabase as any;
        const { error } = await sb
            .from('builder_files')
            .delete()
            .eq('workspace_id', workspaceId)
            .eq('path', action.path);
        if (error) throw error;
    },
};

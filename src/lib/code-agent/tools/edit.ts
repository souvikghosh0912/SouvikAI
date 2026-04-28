/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Edit-file action tool. Replaces an existing file's full contents — the
 * agent never sends diffs.
 *
 *   <action type="edit" path="app/page.tsx">
 *   // full new contents
 *   </action>
 *
 * Implementation is a plain upsert keyed on `(workspace_id, path)` so a
 * misclassified `edit` on a non-existent path silently creates it. This is
 * intentional: file-level type-safety lives in the agent's prompt, not in
 * a runtime check that would just propagate model errors as user-facing 500s.
 */
import type { BuilderFileAction } from '@/types/code';
import type { FileActionTool } from './types';
import { clampContent, sanitizePath } from './utils';

export const editTool: FileActionTool = {
    actionType: 'edit',
    selfClosing: false,

    promptSection: `To REPLACE an existing file (you must always send the full new contents — never
diffs, never partial files, never "// rest unchanged" placeholders), output:

  <action type="edit" path="app/page.tsx">
  // full new contents
  </action>`,

    buildAction(attrs, body): BuilderFileAction | null {
        const path = sanitizePath(attrs.path || '');
        if (!path) return null;
        return { kind: 'edit', path, content: body };
    },

    async execute(supabase, workspaceId, action) {
        if (action.kind !== 'edit') return;
        const sb = supabase as any;
        const { error } = await sb
            .from('builder_files')
            .upsert(
                {
                    workspace_id: workspaceId,
                    path: action.path,
                    content: clampContent(action.content),
                },
                { onConflict: 'workspace_id,path' },
            );
        if (error) throw error;
    },
};

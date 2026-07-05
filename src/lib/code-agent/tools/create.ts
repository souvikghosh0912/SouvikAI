/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Create-file action tool. New paths only — re-using `create` on an existing
 * path overwrites it (idempotent upsert).
 *
 *   <action type="create" path="app/components/Hero.tsx">
 *   // complete file contents go here
 *   </action>
 */
import type { BuilderFileAction } from '@/types/code';
import type { FileActionTool } from './types';
import { clampContent, sanitizePath } from './utils';

/** Cap on total files in a workspace — protects against runaway models. */
const MAX_FILES_PER_WORKSPACE = 200;

export const createTool: FileActionTool = {
    actionType: 'create',
    selfClosing: false,

    promptSection: `To CREATE a new file, output:

  <action type="create" path="app/components/Hero.tsx">
  // complete file contents go here, exactly as they should be saved
  </action>`,

    buildAction(attrs, body): BuilderFileAction | null {
        const path = sanitizePath(attrs.path || '');
        if (!path) return null;
        return { kind: 'create', path, content: body };
    },

    async execute(supabase, workspaceId, action) {
        if (action.kind !== 'create') return;
        const sb = supabase as any;

        // Workspace-wide file cap. Skip the check when we're upserting an
        // existing path (that's an in-place update, not new growth).
        const { count, error: cErr } = await supabase
            .from('builder_files')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId);
        if (cErr) throw cErr;
        if ((count ?? 0) >= MAX_FILES_PER_WORKSPACE) {
            const { data: existing, error: exErr } = await supabase
                .from('builder_files')
                .select('id')
                .eq('workspace_id', workspaceId)
                .eq('path', action.path)
                .maybeSingle();
            if (exErr) throw exErr;
            if (!existing) {
                throw new Error(
                    `Workspace file limit reached (${MAX_FILES_PER_WORKSPACE}). Delete unused files before adding more.`,
                );
            }
        }

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

export const CREATE_TOOL_LIMITS = { MAX_FILES_PER_WORKSPACE };

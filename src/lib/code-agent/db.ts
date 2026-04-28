/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Workspace persistence layer for the Builder agent.
 *
 * This module owns:
 *   • Reads of workspace state (files + messages + summary listings).
 *   • Workspace lifecycle CRUD (create / rename / delete / set-active-file).
 *   • Direct, user-driven file edits from the editor (`upsert`/`delete`).
 *   • Persisting agent-emitted file actions (delegated to per-tool executors
 *     in {@link ./tools/action.ts}).
 *
 * Per-action tool logic (the rules for what `<action type="create">` does
 * versus `<action type="rename">`) lives in `./tools/{create,edit,delete,
 * rename}.ts`. This file is the integration point — it dispatches to those
 * executors via {@link executeFileAction}.
 */
import type { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';
import type {
    BuilderFileAction,
    BuilderFiles,
    BuilderMessage,
    BuilderStep,
    BuilderWorkspace,
    BuilderWorkspaceSummary,
} from '@/types/code';
import { BASE_TEMPLATE, DEFAULT_ACTIVE_FILE } from './template';
import { executeFileAction } from './tools/action';
import { CREATE_TOOL_LIMITS } from './tools/create';
import { clampContent, MAX_FILE_BYTES } from './tools/utils';

/**
 * The cookie-bound server Supabase client. We pin DB to the factory's return
 * type so reads (`.select()`) stay schema-typed, but cast to `any` at write
 * sites because @supabase/ssr's strict Insert/Update types collapse to `never`
 * with our schema marker. This matches the existing pattern in branch-chat.ts.
 */
type DB = Awaited<ReturnType<typeof createClient>>;

type WorkspaceRow = Database['public']['Tables']['builder_workspaces']['Row'];
type FileRow = Database['public']['Tables']['builder_files']['Row'];
type MessageRow = Database['public']['Tables']['builder_messages']['Row'];

const MAX_TITLE_LEN = 200;

function deriveTitle(message: string): string {
    const stripped = message.replace(/\s+/g, ' ').trim();
    if (!stripped) return 'New build';
    return stripped.length > MAX_TITLE_LEN
        ? stripped.slice(0, MAX_TITLE_LEN - 1).trimEnd() + '…'
        : stripped;
}

// ── Reads ────────────────────────────────────────────────────────────────────

/**
 * Fetch a workspace's full state (files + chat transcript) for the given user.
 * RLS enforces ownership; we re-check defensively.
 */
export async function loadWorkspaceForUser(
    supabase: DB,
    workspaceId: string,
    userId: string,
): Promise<BuilderWorkspace | null> {
    const [wsRes, filesRes, messagesRes] = await Promise.all([
        supabase
            .from('builder_workspaces')
            .select('*')
            .eq('id', workspaceId)
            .eq('user_id', userId)
            .maybeSingle(),
        supabase
            .from('builder_files')
            .select('path, content')
            .eq('workspace_id', workspaceId)
            .order('path', { ascending: true }),
        supabase
            .from('builder_messages')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: true }),
    ]);

    const ws = wsRes.data as WorkspaceRow | null;
    if (!ws) return null;

    const files: BuilderFiles = {};
    for (const row of (filesRes.data ?? []) as Pick<FileRow, 'path' | 'content'>[]) {
        files[row.path] = row.content;
    }

    const messages: BuilderMessage[] = ((messagesRes.data ?? []) as MessageRow[]).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        steps: Array.isArray(m.steps) ? (m.steps as unknown as BuilderStep[]) : [],
        errored: m.errored,
        createdAt: new Date(m.created_at).getTime(),
    }));

    return {
        id: ws.id,
        title: ws.title,
        files,
        activeFile: ws.active_file,
        messages,
        createdAt: new Date(ws.created_at).getTime(),
        updatedAt: new Date(ws.updated_at).getTime(),
    };
}

/**
 * List a user's workspaces (most recently updated first). Lightweight — does
 * not include files or messages.
 */
export async function listWorkspacesForUser(
    supabase: DB,
    userId: string,
    limit = 50,
): Promise<BuilderWorkspaceSummary[]> {
    const { data, error } = await supabase
        .from('builder_workspaces')
        .select('id, title, active_file, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    type SummaryRow = Pick<WorkspaceRow, 'id' | 'title' | 'active_file' | 'created_at' | 'updated_at'>;
    return ((data ?? []) as SummaryRow[]).map((row) => ({
        id: row.id,
        title: row.title,
        activeFile: row.active_file,
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at).getTime(),
    }));
}

/**
 * Cheap fetch of a workspace's `path → content` map. Used by the agent route
 * between phases of a tool-using turn (after running file actions, the
 * agent's next prompt needs the freshly applied content).
 */
export async function fetchWorkspaceFiles(
    supabase: DB,
    workspaceId: string,
): Promise<BuilderFiles> {
    const { data, error } = await supabase
        .from('builder_files')
        .select('path, content')
        .eq('workspace_id', workspaceId);
    if (error) throw error;
    const out: BuilderFiles = {};
    for (const row of (data ?? []) as Pick<FileRow, 'path' | 'content'>[]) {
        out[row.path] = row.content;
    }
    return out;
}

// ── Writes — workspace lifecycle ─────────────────────────────────────────────

/**
 * Create a fresh workspace pre-loaded with the base Next.js + Tailwind template
 * and (optionally) an initial user message. Returns the new workspace id.
 *
 * Done as three sequential inserts (workspace → files → first message) so the
 * RLS policies on the child tables can verify the parent already exists.
 */
export async function createWorkspaceForUser(
    supabase: DB,
    userId: string,
    opts: { initialMessage?: string } = {},
): Promise<string> {
    const title = opts.initialMessage ? deriveTitle(opts.initialMessage) : 'New build';
    const sb = supabase as any;

    const wsInsert = await sb
        .from('builder_workspaces')
        .insert({
            user_id: userId,
            title,
            active_file: DEFAULT_ACTIVE_FILE,
        })
        .select('id')
        .single();

    if (wsInsert.error || !wsInsert.data) {
        throw wsInsert.error ?? new Error('Failed to create workspace');
    }
    const workspaceId = (wsInsert.data as { id: string }).id;

    // Seed the virtual filesystem with the starter template.
    const fileRows = Object.entries(BASE_TEMPLATE).map(([path, content]) => ({
        workspace_id: workspaceId,
        path,
        content,
    }));
    const filesInsert = await sb.from('builder_files').insert(fileRows);
    if (filesInsert.error) {
        // Roll back — the workspace is empty / orphaned otherwise.
        await sb.from('builder_workspaces').delete().eq('id', workspaceId);
        throw filesInsert.error;
    }

    if (opts.initialMessage && opts.initialMessage.trim()) {
        const msgInsert = await sb.from('builder_messages').insert({
            workspace_id: workspaceId,
            user_id: userId,
            role: 'user',
            content: opts.initialMessage.trim(),
            steps: [],
        });
        if (msgInsert.error) {
            await sb.from('builder_workspaces').delete().eq('id', workspaceId);
            throw msgInsert.error;
        }
    }

    return workspaceId;
}

export async function deleteWorkspaceForUser(
    supabase: DB,
    workspaceId: string,
    userId: string,
): Promise<boolean> {
    const { error, count } = await supabase
        .from('builder_workspaces')
        .delete({ count: 'exact' })
        .eq('id', workspaceId)
        .eq('user_id', userId);

    if (error) throw error;
    return (count ?? 0) > 0;
}

export async function renameWorkspace(
    supabase: DB,
    workspaceId: string,
    userId: string,
    title: string,
): Promise<void> {
    const trimmed = title.trim();
    if (!trimmed) throw new Error('Title cannot be empty');
    const safe = trimmed.length > MAX_TITLE_LEN ? trimmed.slice(0, MAX_TITLE_LEN) : trimmed;
    const { error } = await (supabase as any)
        .from('builder_workspaces')
        .update({ title: safe })
        .eq('id', workspaceId)
        .eq('user_id', userId);
    if (error) throw error;
}

export async function setWorkspaceActiveFile(
    supabase: DB,
    workspaceId: string,
    userId: string,
    path: string | null,
): Promise<void> {
    const { error } = await (supabase as any)
        .from('builder_workspaces')
        .update({ active_file: path })
        .eq('id', workspaceId)
        .eq('user_id', userId);
    if (error) throw error;
}

// ── Writes — agent-driven file actions ───────────────────────────────────────

/**
 * Apply a single agent file action to the database by routing to the
 * relevant tool's executor. See `./tools/{create,edit,delete,rename}.ts`
 * for per-action behaviour.
 */
export async function applyFileAction(
    supabase: DB,
    workspaceId: string,
    action: BuilderFileAction,
): Promise<void> {
    await executeFileAction(supabase, workspaceId, action);
}

// ── Writes — chat messages ───────────────────────────────────────────────────

/**
 * Persist a single chat message (user or assistant). For assistant messages,
 * `steps` carries the timeline (milestones + applied actions).
 *
 * Returns the database-assigned id so the client can replace any optimistic
 * placeholder.
 */
export async function insertBuilderMessage(
    supabase: DB,
    args: {
        workspaceId: string;
        userId: string;
        role: 'user' | 'assistant';
        content: string;
        steps?: BuilderStep[];
        errored?: boolean;
    },
): Promise<string> {
    const { data, error } = await (supabase as any)
        .from('builder_messages')
        .insert({
            workspace_id: args.workspaceId,
            user_id: args.userId,
            role: args.role,
            content: args.content,
            steps: args.steps ?? [],
            errored: !!args.errored,
        })
        .select('id')
        .single();
    if (error || !data) throw error ?? new Error('Failed to insert builder message');
    return (data as { id: string }).id;
}

// ── Writes — direct (editor-driven) file mutations ───────────────────────────

/**
 * Update the contents of a single file in a workspace. Used by the editor's
 * direct text edits. Creates the row if it doesn't exist.
 */
export async function upsertWorkspaceFile(
    supabase: DB,
    workspaceId: string,
    userId: string,
    path: string,
    content: string,
): Promise<void> {
    // Ownership guard — RLS handles this too, but a single explicit query
    // gives us a clean 404 / 403 path on mismatch.
    const { data: ws } = await supabase
        .from('builder_workspaces')
        .select('id')
        .eq('id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle();
    if (!ws) throw new Error('Workspace not found');

    const { error } = await (supabase as any)
        .from('builder_files')
        .upsert(
            { workspace_id: workspaceId, path, content: clampContent(content) },
            { onConflict: 'workspace_id,path' },
        );
    if (error) throw error;
}

export async function deleteWorkspaceFile(
    supabase: DB,
    workspaceId: string,
    userId: string,
    path: string,
): Promise<void> {
    const { data: ws } = await supabase
        .from('builder_workspaces')
        .select('id')
        .eq('id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle();
    if (!ws) throw new Error('Workspace not found');

    const { error } = await (supabase as any)
        .from('builder_files')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('path', path);
    if (error) throw error;
}

/**
 * Aggregated workspace-storage limits. The per-tool details (e.g. `MAX_FILES_
 * PER_WORKSPACE`) live alongside the tool that enforces them and are
 * re-exported here for backwards compatibility.
 */
export const BUILDER_DB_LIMITS = {
    MAX_FILE_BYTES,
    MAX_FILES_PER_WORKSPACE: CREATE_TOOL_LIMITS.MAX_FILES_PER_WORKSPACE,
    MAX_TITLE_LEN,
};

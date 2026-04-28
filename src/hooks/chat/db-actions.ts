/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Message, ChatSession } from '@/types/chat';
import type { MessageAttachment } from '@/types/attachments';
import { mapSessionRow } from './session-mapper';

/**
 * Supabase client passed in by useChat. Typed as `any` deliberately —
 * the typed `SupabaseClient<Database>` produced by `createClient()` carries
 * a generic shape that breaks structural compatibility with the un-typed
 * client other parts of the code use, so we keep the boundary loose here
 * (the real schema enforcement lives in the route handlers).
 */
type Db = any;

/**
 * Thin wrappers around the Supabase calls used by useChat. Each wrapper:
 *
 *  - Runs in fire-and-forget mode where the original code did
 *    (insert message, set placeholder title, delete assistant on
 *    regenerate, …) but logs failures with a tagged prefix.
 *  - Uses `as any` only at the boundary so the rest of the hook stays
 *    typed against domain models.
 */

// ── Sessions ────────────────────────────────────────────────────────────────

export async function fetchUserSessions(
    supabase: Db,
    userId: string,
): Promise<any[] | null> {
    const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
    if (error) return null;
    return data ?? null;
}

export async function fetchSessionMeta(
    supabase: Db,
    sessionId: string,
): Promise<{ isArchived: boolean; branchedFromTitle: string | null }> {
    const { data } = await (supabase as any)
        .from('chat_sessions')
        .select('is_archived, branched_from_title')
        .eq('id', sessionId)
        .single();
    return {
        isArchived: data?.is_archived ?? false,
        branchedFromTitle: data?.branched_from_title ?? null,
    };
}

export async function createSession(
    supabase: Db,
    userId: string,
    projectId: string | null,
): Promise<ChatSession | null> {
    const insertPayload: { user_id: string; title: string; project_id?: string | null } = {
        user_id: userId,
        title: 'New Chat',
    };
    if (projectId) insertPayload.project_id = projectId;

    const result: any = await (supabase as any)
        .from('chat_sessions')
        .insert(insertPayload)
        .select()
        .single();

    if (result.error || !result.data) return null;
    return mapSessionRow(result.data);
}

export async function deleteSession(
    supabase: Db,
    sessionId: string,
): Promise<void> {
    await supabase.from('chat_sessions').delete().eq('id', sessionId);
}

export async function updateSessionPinned(
    supabase: Db,
    sessionId: string,
    pinned: boolean,
): Promise<void> {
    await (supabase as any)
        .from('chat_sessions')
        .update({ is_pinned: pinned })
        .eq('id', sessionId);
}

export async function updateSessionArchived(
    supabase: Db,
    sessionId: string,
    archived: boolean,
): Promise<void> {
    await (supabase as any)
        .from('chat_sessions')
        .update({ is_archived: archived })
        .eq('id', sessionId);
}

export async function updateSessionTitle(
    supabase: Db,
    sessionId: string,
    title: string,
): Promise<void> {
    const { error } = await (supabase as any)
        .from('chat_sessions')
        .update({ title })
        .eq('id', sessionId);
    if (error) console.error('[useChat] Failed to update session title:', error);
}

/** Fire-and-forget — used for the placeholder title on first message. */
export function setSessionTitleAsync(
    supabase: Db,
    sessionId: string,
    title: string,
): void {
    (supabase as any)
        .from('chat_sessions')
        .update({ title })
        .eq('id', sessionId)
        .then(({ error }: any) => {
            if (error) console.error('[useChat] Failed to set placeholder title:', error);
        });
}

// ── Messages ────────────────────────────────────────────────────────────────

export async function fetchSessionMessages(
    supabase: Db,
    sessionId: string,
): Promise<Message[] | null> {
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

    if (error || !data) return null;
    return (data as any[]).map((m) => ({
        id: m.id,
        sessionId: m.session_id,
        userId: m.user_id,
        role: m.role,
        content: m.content,
        createdAt: new Date(m.created_at),
        attachments: Array.isArray(m.attachments)
            ? (m.attachments as MessageAttachment[])
            : undefined,
    }));
}

/** Fire-and-forget user message insert. */
export function insertUserMessageAsync(
    supabase: Db,
    payload: {
        id: string;
        sessionId: string;
        userId: string;
        content: string;
        attachments: MessageAttachment[] | null;
    },
): void {
    (supabase as any).from('chat_messages').insert({
        id: payload.id,
        session_id: payload.sessionId,
        user_id: payload.userId,
        role: 'user',
        content: payload.content,
        attachments: payload.attachments,
    }).then(({ error }: any) => {
        if (error) console.error('[useChat] Failed to save user message:', error);
    });
}

export async function insertAssistantMessage(
    supabase: Db,
    payload: {
        id: string;
        sessionId: string;
        userId: string;
        content: string;
    },
): Promise<void> {
    await (supabase as any).from('chat_messages').insert({
        id: payload.id,
        session_id: payload.sessionId,
        user_id: payload.userId,
        role: 'assistant',
        content: payload.content,
    });
}

/** Fire-and-forget assistant message delete (regenerate flow). */
export function deleteAssistantMessageAsync(
    supabase: Db,
    messageId: string,
): void {
    (supabase as any)
        .from('chat_messages')
        .delete()
        .eq('id', messageId)
        .then(({ error }: any) => {
            if (error) console.error('[useChat] Failed to delete assistant message:', error);
        });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ChatSession } from '@/types/chat';

/**
 * Pure mapping helpers for `chat_sessions` rows.
 *
 * Extracted from useChat so the component-tree-facing hook is only about
 * orchestration. Adding a new column should be a one-line change here, not
 * a hunt across the hook body.
 */

/** Sort: pinned chats first, then most recently updated. */
export function sortSessionsByPinAndRecency(sessions: ChatSession[]): ChatSession[] {
    return [...sessions].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
}

/** Map a single Supabase row into the client `ChatSession` shape. */
export function mapSessionRow(row: any): ChatSession {
    return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        isPinned: row.is_pinned ?? false,
        isArchived: row.is_archived ?? false,
        projectId: row.project_id ?? null,
        branchedFromSessionId: row.branched_from_session_id ?? null,
        branchedFromTitle: row.branched_from_title ?? null,
    };
}

/**
 * Map an array of Supabase rows into ChatSession[], dropping archived ones
 * (they live in Settings → Archived) and applying the standard sort.
 */
export function mapAndSortSessionList(rows: any[]): ChatSession[] {
    return sortSessionsByPinAndRecency(
        rows.filter((s) => !s.is_archived).map(mapSessionRow),
    );
}

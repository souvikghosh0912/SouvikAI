import type { ChatSession } from '@/types/chat';

export type ChatGroup = { label: string; sessions: ChatSession[] };

/**
 * Bucket the sidebar's loose-chat list into "Pinned" / "Today" /
 * "Previous 7 days" / "Older" groups, in display order. Empty buckets are
 * dropped so the UI doesn't render hollow section headers.
 */
export function groupSessions(sessions: ChatSession[]): ChatGroup[] {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const pinned: ChatSession[] = [];
    const today: ChatSession[] = [];
    const week: ChatSession[] = [];
    const older: ChatSession[] = [];

    for (const s of sessions) {
        if (s.isPinned) {
            pinned.push(s);
            continue;
        }
        const t = new Date(s.updatedAt).getTime();
        const diff = now - t;
        if (diff < DAY) today.push(s);
        else if (diff < 7 * DAY) week.push(s);
        else older.push(s);
    }

    const groups: ChatGroup[] = [];
    if (pinned.length) groups.push({ label: 'Pinned', sessions: pinned });
    if (today.length) groups.push({ label: 'Today', sessions: today });
    if (week.length) groups.push({ label: 'Previous 7 days', sessions: week });
    if (older.length) groups.push({ label: 'Older', sessions: older });
    return groups;
}

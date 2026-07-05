import { AIModel } from '@/types/chat';

/** Human-readable label + style for each model visibility level. */
export const VISIBILITY_META: Record<
    AIModel['visibility'],
    { label: string; description: string; className: string }
> = {
    public: {
        label: 'Public',
        description: 'Visible to everyone.',
        className: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
    },
    selected: {
        label: 'Selected users',
        description: 'Only visible to users you mark as trusted.',
        className: 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30',
    },
    internal: {
        label: 'Internal',
        description: 'Not visible to anyone yet (reserved for future role-based access).',
        className: 'bg-zinc-500/15 text-zinc-400 ring-1 ring-zinc-500/30',
    },
};

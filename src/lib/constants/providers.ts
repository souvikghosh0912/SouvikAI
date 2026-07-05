import { AIModel } from '@/types/chat';

/** Human-readable label + style for each known provider. */
export const PROVIDER_META: Record<
    AIModel['provider'],
    { label: string; className: string }
> = {
    nvidia: {
        label: 'NVIDIA',
        className: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
    },
    google: {
        label: 'Google',
        className: 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30',
    },
    freemodel: {
        label: 'freemodel.dev',
        className: 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30',
    },
    custom: {
        label: 'Custom',
        className: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
    },
};

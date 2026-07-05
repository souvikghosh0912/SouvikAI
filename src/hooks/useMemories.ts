'use client';

import { useEffect, useState } from 'react';

export interface MemoryEntry {
    id: string;
    content: string;
    source: 'manual' | 'auto';
    createdAt: string;
}

/**
 * Fetch-backed hook for Settings > Memory. Modeled on `useModels.ts` but with
 * mutations, since this tab both reads and writes `/api/settings/memory`.
 * Mutations optimistically update local state; on failure they refetch to
 * resync rather than trying to hand-roll a rollback.
 */
export function useMemories() {
    const [memories, setMemories] = useState<MemoryEntry[]>([]);
    const [enabled, setEnabledState] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = async () => {
        try {
            const res = await fetch('/api/settings/memory', { cache: 'no-store' });
            if (!res.ok) throw new Error(`Failed to load memories (${res.status})`);
            const data = await res.json();
            setMemories(Array.isArray(data.memories) ? data.memories : []);
            setEnabledState(!!data.enabled);
        } catch (err) {
            console.error('[useMemories] Failed to load:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const addMemory = async (content: string) => {
        const res = await fetch('/api/settings/memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, source: 'manual' }),
        });
        if (!res.ok) throw new Error('Failed to add memory');
        const data = await res.json();
        setMemories((prev) => {
            if (prev.some((m) => m.id === data.memory.id)) return prev;
            return [data.memory, ...prev];
        });
    };

    const deleteMemory = async (id: string) => {
        setMemories((prev) => prev.filter((m) => m.id !== id));
        const res = await fetch(`/api/settings/memory/${id}`, { method: 'DELETE' });
        if (!res.ok) await refresh();
    };

    const setEnabled = async (value: boolean) => {
        setEnabledState(value);
        const res = await fetch('/api/settings/memory', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: value }),
        });
        if (!res.ok) await refresh();
    };

    return { memories, enabled, isLoading, addMemory, deleteMemory, setEnabled };
}

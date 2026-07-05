'use client';

import { useState } from 'react';
import { useMemories } from '@/hooks/useMemories';
import { MAX_MEMORY_CONTENT_CHARS } from '@/lib/limits';
import { Input, Button } from '@/components/ui';
import { Loader2, BrainCircuit, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionLabel, SettingsCard, SettingRow, Toggle } from '../primitives';

export function MemoryTab() {
    const { memories, enabled, isLoading, addMemory, deleteMemory, setEnabled } = useMemories();
    const [draft, setDraft] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    if (isLoading) {
        return (
            <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
            </div>
        );
    }

    const handleAdd = async () => {
        const content = draft.trim();
        if (!content || isAdding) return;
        setIsAdding(true);
        try {
            await addMemory(content);
            setDraft('');
        } catch (e) {
            console.error('[MemoryTab] Failed to add memory:', e);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await deleteMemory(id);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-1 animate-in fade-in slide-in-from-bottom-1 duration-200 pb-4">
            <SectionLabel>Memory</SectionLabel>
            <SettingsCard>
                <SettingRow
                    label="Remember things across chats"
                    description="When on, SouvikAI can save durable facts about you and recall them in future conversations."
                    control={<Toggle checked={enabled} onChange={setEnabled} label="Toggle memory" />}
                />
            </SettingsCard>

            <SectionLabel>Saved memories</SectionLabel>
            <div className="flex items-center gap-2">
                <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, MAX_MEMORY_CONTENT_CHARS))}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAdd();
                    }}
                    placeholder="e.g. I'm a backend engineer who mostly writes Go"
                    className="h-9 text-[12.5px] bg-surface-2"
                />
                <Button
                    size="sm"
                    onClick={handleAdd}
                    disabled={!draft.trim() || isAdding}
                >
                    {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Add
                </Button>
            </div>

            {memories.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 h-40 text-center mt-2">
                    <div className="h-10 w-10 rounded-md bg-surface-2 border border-border flex items-center justify-center">
                        <BrainCircuit className="h-5 w-5 text-foreground-subtle" strokeWidth={1.5} />
                    </div>
                    <div>
                        <p className="text-[13px] font-medium text-foreground">Nothing saved yet</p>
                        <p className="text-[12px] text-foreground-muted mt-0.5">
                            SouvikAI will remember useful facts as you chat, or add your own above.
                        </p>
                    </div>
                </div>
            ) : (
                <SettingsCard className="mt-2">
                    {memories.map((memory) => {
                        const isDeleting = deletingId === memory.id;
                        return (
                            <div
                                key={memory.id}
                                className={cn(
                                    'group flex items-center gap-3 px-3.5 py-2.5 transition-opacity',
                                    isDeleting && 'opacity-50'
                                )}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] text-foreground leading-snug">
                                        {memory.content}
                                    </p>
                                    <p className="text-[11px] text-foreground-subtle mt-0.5">
                                        {memory.source === 'auto' ? 'Learned automatically' : 'Added by you'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(memory.id)}
                                    disabled={isDeleting}
                                    aria-label="Delete memory"
                                    className={cn(
                                        'h-7 w-7 flex items-center justify-center rounded-md shrink-0 transition-colors',
                                        'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                                        'text-foreground-muted hover:text-destructive hover:bg-destructive/10',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                                    )}
                                >
                                    {isDeleting ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </SettingsCard>
            )}
        </div>
    );
}

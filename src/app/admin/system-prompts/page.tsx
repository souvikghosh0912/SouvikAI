'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { SystemPromptsTable } from '@/components/admin';
import { useAdmin } from '@/hooks/useAdmin';
import { SystemPrompt } from '@/types/chat';
import { Loader2 } from 'lucide-react';

export default function AdminSystemPromptsPage() {
    const router = useRouter();
    const { systemPrompts, isLoading, deleteSystemPrompt } = useAdmin();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async (prompt: SystemPrompt) => {
        if (!confirm(`Delete system prompt "${prompt.name}"? This cannot be undone.`)) return;
        setDeletingId(prompt.id);
        setError(null);
        const result = await deleteSystemPrompt(prompt.id);
        if (!result.success) {
            setError(result.error || 'Failed to delete system prompt');
        }
        setDeletingId(null);
    };

    if (isLoading && systemPrompts.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">System Prompts</h1>
                    <p className="text-muted-foreground">
                        Create named system prompts and assign each one to specific models.
                    </p>
                </div>
                <Button onClick={() => router.push('/admin/system-prompts/new')}>New System Prompt</Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <SystemPromptsTable prompts={systemPrompts} isDeleting={deletingId} onDelete={handleDelete} />
        </div>
    );
}

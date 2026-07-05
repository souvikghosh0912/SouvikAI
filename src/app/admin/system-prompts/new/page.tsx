'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SystemPromptForm, SystemPromptFormValues } from '@/components/admin';
import { useAdmin } from '@/hooks/useAdmin';

export default function NewSystemPromptPage() {
    const router = useRouter();
    const { createSystemPrompt } = useAdmin();
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (values: SystemPromptFormValues) => {
        setIsSaving(true);
        setError(null);
        const result = await createSystemPrompt(values);
        setIsSaving(false);
        if (!result.success) {
            setError(result.error || 'Failed to create system prompt');
            return;
        }
        router.push('/admin/system-prompts');
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold">New System Prompt</h1>
                <p className="text-muted-foreground">Create a new prompt to assign to one or more models.</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
                <SystemPromptForm
                    isSaving={isSaving}
                    error={error}
                    submitLabel="Create Prompt"
                    onSubmit={handleSubmit}
                    onCancel={() => router.push('/admin/system-prompts')}
                />
            </div>
        </div>
    );
}

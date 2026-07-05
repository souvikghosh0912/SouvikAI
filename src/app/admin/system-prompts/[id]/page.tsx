'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { SystemPromptForm, SystemPromptFormValues } from '@/components/admin';
import { useAdmin } from '@/hooks/useAdmin';
import { Star } from 'lucide-react';

export default function SystemPromptEditPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { systemPrompts, models, isLoading, updateSystemPrompt, deleteSystemPrompt, setDefaultSystemPrompt } = useAdmin();

    const prompt = systemPrompts.find((p) => p.id === id) ?? null;
    const assignedModels = prompt
        ? models.filter((m) => m.system_prompt_id === id || (prompt.is_default && !m.system_prompt_id))
        : [];

    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSettingDefault, setIsSettingDefault] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (values: SystemPromptFormValues) => {
        if (!prompt) return;
        setIsSaving(true);
        setError(null);
        const result = await updateSystemPrompt(prompt.id, values);
        setIsSaving(false);
        if (!result.success) {
            setError(result.error || 'Failed to update system prompt');
            return;
        }
        router.push('/admin/system-prompts');
    };

    const handleDelete = async () => {
        if (!prompt) return;
        if (!confirm(`Delete system prompt "${prompt.name}"? This cannot be undone.`)) return;
        setIsDeleting(true);
        setError(null);
        const result = await deleteSystemPrompt(prompt.id);
        setIsDeleting(false);
        if (!result.success) {
            setError(result.error || 'Failed to delete system prompt');
            return;
        }
        router.push('/admin/system-prompts');
    };

    const handleSetDefault = async () => {
        if (!prompt) return;
        setIsSettingDefault(true);
        setError(null);
        const result = await setDefaultSystemPrompt(prompt.id);
        setIsSettingDefault(false);
        if (!result.success) {
            setError(result.error || 'Failed to set default system prompt');
        }
    };

    if (isLoading && !prompt) {
        return <p className="text-muted-foreground">Loading system prompt...</p>;
    }

    if (!isLoading && !prompt) {
        return (
            <div className="space-y-4">
                <p className="text-muted-foreground">System prompt not found.</p>
                <Button variant="outline" onClick={() => router.push('/admin/system-prompts')}>
                    Back to System Prompts
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        Edit System Prompt
                        {prompt?.is_default && <Star className="h-5 w-5 text-amber-400 fill-amber-400" />}
                    </h1>
                    <p className="text-muted-foreground">Update this prompt&apos;s content, name, or status.</p>
                </div>
                <Button
                    variant="outline"
                    onClick={handleSetDefault}
                    disabled={isSettingDefault || prompt?.is_default || prompt?.status !== 'production'}
                >
                    {prompt?.is_default ? 'Default Prompt' : isSettingDefault ? 'Setting...' : 'Set as Default'}
                </Button>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
                {prompt && (
                    <SystemPromptForm
                        initialValues={{ name: prompt.name, content: prompt.content, status: prompt.status }}
                        isSaving={isSaving}
                        error={error}
                        submitLabel="Save Changes"
                        onSubmit={handleSubmit}
                        onCancel={() => router.push('/admin/system-prompts')}
                    />
                )}
            </div>

            <div className="bg-card rounded-lg border border-border p-6 space-y-3">
                <h2 className="text-sm font-semibold">Assigned Models ({assignedModels.length})</h2>
                {assignedModels.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No models currently follow this prompt.</p>
                ) : (
                    <ul className="space-y-1">
                        {assignedModels.map((m) => (
                            <li key={m.id} className="text-sm text-muted-foreground">
                                {m.displayName}{' '}
                                {prompt?.is_default && !m.system_prompt_id && (
                                    <span className="text-xs">(via default fallback)</span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="flex justify-end">
                <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDelete}
                    disabled={isDeleting || prompt?.is_default || assignedModels.length > 0}
                >
                    {isDeleting ? 'Deleting...' : 'Delete Prompt'}
                </Button>
            </div>
        </div>
    );
}

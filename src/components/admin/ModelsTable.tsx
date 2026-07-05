'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, SimpleTooltip } from '@/components/ui';
import { AIModel, SystemPrompt } from '@/types/chat';
import { PROVIDER_META } from '@/lib/constants/providers';
import { VISIBILITY_META } from '@/lib/constants/visibility';
import { Settings2, ShieldAlert, ShieldCheck } from 'lucide-react';

interface ModelsTableProps {
    models: AIModel[];
    systemPrompts: SystemPrompt[];
    isEditMode: boolean;
    onUpdate: (modelId: string, updates: Partial<AIModel>) => Promise<{ success: boolean }>;
}

function ProviderBadge({ provider }: { provider: AIModel['provider'] }) {
    const meta = PROVIDER_META[provider] ?? PROVIDER_META.nvidia;
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.className}`}
        >
            {meta.label}
        </span>
    );
}

function VisibilityBadge({ model }: { model: AIModel }) {
    const visibility = model.visibility ?? 'public';
    const meta = VISIBILITY_META[visibility] ?? VISIBILITY_META.public;
    const label = visibility === 'selected' ? `${meta.label} (${model.trusted_user_count ?? 0})` : meta.label;
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.className}`}
        >
            {label}
        </span>
    );
}

export function ModelsTable({ models, systemPrompts, isEditMode, onUpdate }: ModelsTableProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleToggleSuspend = async (model: AIModel) => {
        setIsLoading(true);
        await onUpdate(model.id, { is_suspended: !model.is_suspended });
        setIsLoading(false);
    };

    if (!models || models.length === 0) {
        return (
            <div className="flex justify-center p-8 bg-card rounded-lg border border-border">
                <p className="text-muted-foreground">No models configured.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-6 py-3 font-medium">Internal ID</th>
                                <th className="px-6 py-3 font-medium">Display Name</th>
                                <th className="px-6 py-3 font-medium">Provider</th>
                                <th className="px-6 py-3 font-medium">API Identifier (Name)</th>
                                <th className="px-6 py-3 font-medium">Quota Limit</th>
                                <th className="px-6 py-3 font-medium">System Prompt</th>
                                <th className="px-6 py-3 font-medium">Visibility</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                {isEditMode && <th className="px-6 py-3 text-right font-medium text-destructive">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {models.map((model) => {
                                const assignedPrompt = model.system_prompt_id
                                    ? systemPrompts.find((p) => p.id === model.system_prompt_id)
                                    : null;
                                return (
                                <tr key={model.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs">{model.id}</td>
                                    <td className="px-6 py-4 font-medium">{model.displayName}</td>
                                    <td className="px-6 py-4">
                                        <ProviderBadge provider={model.provider ?? 'nvidia'} />
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{model.name}</td>
                                    <td className="px-6 py-4">{model.quota_limit.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        {assignedPrompt ? (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30">
                                                {assignedPrompt.name}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                                                Default
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <VisibilityBadge model={model} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${model.is_suspended ? 'bg-destructive/20 text-destructive' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                            {model.is_suspended ? 'Suspended' : 'Active'}
                                        </span>
                                    </td>
                                    {isEditMode && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <SimpleTooltip content="Configure model">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={isLoading}
                                                        onClick={() => router.push(`/admin/models/${model.id}`)}
                                                        className="h-8 w-8 p-0"
                                                        aria-label="Configure model"
                                                    >
                                                        <Settings2 className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                </SimpleTooltip>
                                                <SimpleTooltip
                                                    content={model.is_suspended ? 'Reactivate model' : 'Suspend model'}
                                                >
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={isLoading}
                                                        onClick={() => handleToggleSuspend(model)}
                                                        className="h-8 w-8 p-0"
                                                        aria-label={model.is_suspended ? 'Reactivate model' : 'Suspend model'}
                                                    >
                                                        {model.is_suspended ? (
                                                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                                        ) : (
                                                            <ShieldAlert className="h-4 w-4 text-destructive" />
                                                        )}
                                                    </Button>
                                                </SimpleTooltip>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

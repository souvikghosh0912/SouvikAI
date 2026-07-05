'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    Button,
    Input,
    Label,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui';
import { CustomProviderPickerDialog } from '@/components/admin';
import { useAdmin } from '@/hooks/useAdmin';
import { AIModel } from '@/types/chat';
import { PROVIDER_META } from '@/lib/constants/providers';

interface ModelEditDraft {
    displayName: string;
    apiName: string;
    provider: AIModel['provider'];
    protocol: 'openai' | 'anthropic';
    customProviderId: string | null;
    customProviderName: string | null;
    quotaLimit: string;
    systemPromptId: string | null;
}

function draftKey(modelId: string) {
    return `admin:model-edit-draft:${modelId}`;
}

export default function ModelConfigPage() {
    const { modelId } = useParams<{ modelId: string }>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { models, systemPrompts, isLoading, updateModel } = useAdmin();

    const model = models.find((m) => m.id === modelId) ?? null;
    const initialized = useRef(false);

    const [displayName, setDisplayName] = useState('');
    const [apiName, setApiName] = useState('');
    const [provider, setProvider] = useState<AIModel['provider']>('nvidia');
    const [protocol, setProtocol] = useState<'openai' | 'anthropic'>('openai');
    const [customProviderId, setCustomProviderId] = useState<string | null>(null);
    const [customProviderName, setCustomProviderName] = useState<string | null>(null);
    const [quotaLimit, setQuotaLimit] = useState('');
    const [systemPromptId, setSystemPromptId] = useState<string | null>(null);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize the form from the loaded model, once — background refreshes
    // of `models` (e.g. after save) shouldn't clobber in-progress edits.
    useEffect(() => {
        if (initialized.current || !model) return;
        initialized.current = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setDisplayName(model.displayName || (model as any).display_name || '');
        setApiName(model.name || '');
        setProvider(model.provider ?? 'nvidia');
        setProtocol(model.protocol ?? 'openai');
        setCustomProviderId(model.custom_provider_id ?? null);
        setQuotaLimit((model.quota_limit || 0).toString());
        setSystemPromptId(model.system_prompt_id ?? null);

        const draftRaw = sessionStorage.getItem(draftKey(modelId));
        if (draftRaw) {
            sessionStorage.removeItem(draftKey(modelId));
            try {
                const draft = JSON.parse(draftRaw) as ModelEditDraft;
                setDisplayName(draft.displayName);
                setApiName(draft.apiName);
                setProvider(draft.provider);
                setProtocol(draft.protocol);
                setCustomProviderId(draft.customProviderId);
                setCustomProviderName(draft.customProviderName);
                setQuotaLimit(draft.quotaLimit);
                setSystemPromptId(draft.systemPromptId);
            } catch {
                // ignore malformed draft
            }
        }
    }, [model, modelId]);

    // Returning from the "add new provider" page with a freshly created provider.
    useEffect(() => {
        const newProviderId = searchParams.get('newProviderId');
        const newProviderName = searchParams.get('newProviderName');
        if (!newProviderId) return;
        setProvider('custom');
        setCustomProviderId(newProviderId);
        setCustomProviderName(newProviderName ? decodeURIComponent(newProviderName) : null);
        router.replace(`/admin/models/${modelId}`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // Resolve the saved custom provider's display name when it wasn't just picked/created.
    useEffect(() => {
        if (provider !== 'custom' || !customProviderId || customProviderName) return;
        fetch('/api/admin/custom-providers')
            .then((res) => res.json())
            .then((data) => {
                if (!Array.isArray(data)) return;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const match = data.find((p: any) => p.id === customProviderId);
                if (match) setCustomProviderName(match.name);
            })
            .catch(() => {});
    }, [provider, customProviderId, customProviderName]);

    const handleAddNewProvider = () => {
        const draft: ModelEditDraft = {
            displayName,
            apiName,
            provider,
            protocol,
            customProviderId,
            customProviderName,
            quotaLimit,
            systemPromptId,
        };
        sessionStorage.setItem(draftKey(modelId), JSON.stringify(draft));
        router.push(`/admin/models/providers/new?returnTo=${encodeURIComponent(`/admin/models/${modelId}`)}`);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const updates: Partial<AIModel> = {
            displayName,
            name: apiName,
            provider,
            quota_limit: parseInt(quotaLimit, 10),
            system_prompt_id: systemPromptId,
            ...(provider === 'freemodel' ? { protocol } : {}),
            ...(provider === 'custom' ? { custom_provider_id: customProviderId } : {}),
        };
        const result = await updateModel(modelId, updates);
        setIsSaving(false);
        if (result.success) {
            router.push('/admin/models');
        }
    };

    const isSaveDisabled =
        isSaving ||
        !displayName.trim() ||
        !apiName.trim() ||
        !quotaLimit.trim() ||
        (provider === 'custom' && !customProviderId);

    if (isLoading && !model) {
        return <p className="text-muted-foreground">Loading model...</p>;
    }

    if (!isLoading && !model) {
        return (
            <div className="space-y-4">
                <p className="text-muted-foreground">Model not found.</p>
                <Button variant="outline" onClick={() => router.push('/admin/models')}>
                    Back to Model Configurations
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold">Configure Model</h1>
                <p className="text-muted-foreground">Edit this model&apos;s name, provider, identifier, and quota.</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-6 space-y-4">
                {/* Internal ID — read-only */}
                <div className="space-y-2">
                    <Label>Internal ID</Label>
                    <Input value={modelId} disabled className="bg-muted font-mono text-xs" />
                    <p className="text-xs text-muted-foreground">Internal ID cannot be changed.</p>
                </div>

                {/* Display name */}
                <div className="space-y-2">
                    <Label htmlFor="edit-display-name">Display Name</Label>
                    <Input
                        id="edit-display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Velocity 1"
                    />
                </div>

                {/* Provider selector */}
                <div className="space-y-2">
                    <Label htmlFor="edit-provider">Provider</Label>
                    <div className="flex gap-3" id="edit-provider" role="group" aria-label="Provider selection">
                        {(Object.keys(PROVIDER_META) as AIModel['provider'][]).map((p) => {
                            const meta = PROVIDER_META[p];
                            const isSelected = provider === p;
                            return (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setProvider(p)}
                                    aria-pressed={isSelected}
                                    className={[
                                        'flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all',
                                        isSelected
                                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                            : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/50',
                                    ].join(' ')}
                                >
                                    {meta.label}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {provider === 'google' &&
                            'Uses GOOGLE_AI_API_KEY. Model identifier must be a valid Gemini model (e.g. gemini-2.0-flash).'}
                        {provider === 'nvidia' &&
                            'Uses NVIDIA_NIM_API_KEY. Model identifier must be a valid NVIDIA NIM slug.'}
                        {provider === 'freemodel' &&
                            'Uses FREEMODEL_API_KEY. Pick the format below to match the model.'}
                        {provider === 'custom' &&
                            'Uses a saved custom provider’s base URL, API key, and format.'}
                    </p>
                </div>

                {/* freemodel.dev format sub-selector */}
                {provider === 'freemodel' && (
                    <div className="space-y-2">
                        <Label htmlFor="edit-freemodel-protocol">Format</Label>
                        <Select value={protocol} onValueChange={(v) => setProtocol(v as 'openai' | 'anthropic')}>
                            <SelectTrigger id="edit-freemodel-protocol">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="openai">OpenAI-style (api.freemodel.dev)</SelectItem>
                                <SelectItem value="anthropic">Anthropic-style (cc.freemodel.dev)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Custom provider picker */}
                {provider === 'custom' && (
                    <div className="space-y-2">
                        <Label>Custom Provider</Label>
                        {customProviderId ? (
                            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5">
                                <span className="text-sm font-medium">
                                    {customProviderName ?? customProviderId}
                                </span>
                                <Button variant="outline" size="sm" onClick={() => setIsPickerOpen(true)}>
                                    Change
                                </Button>
                            </div>
                        ) : (
                            <Button variant="outline" className="w-full" onClick={() => setIsPickerOpen(true)}>
                                Choose or add a custom provider
                            </Button>
                        )}
                    </div>
                )}

                {/* API identifier */}
                <div className="space-y-2">
                    <Label htmlFor="edit-api-name">API Identifier (Name)</Label>
                    <Input
                        id="edit-api-name"
                        value={apiName}
                        onChange={(e) => setApiName(e.target.value)}
                        placeholder={
                            provider === 'google'
                                ? 'e.g. gemini-2.0-flash'
                                : 'e.g. qwen/qwen3.5-122b-a10b'
                        }
                        className="font-mono text-xs"
                    />
                </div>

                {/* Quota */}
                <div className="space-y-2">
                    <Label htmlFor="edit-quota">Quota Limit (Tokens / 5 hrs)</Label>
                    <Input
                        id="edit-quota"
                        type="number"
                        value={quotaLimit}
                        onChange={(e) => setQuotaLimit(e.target.value)}
                        placeholder="500000"
                    />
                </div>

                {/* System Prompt */}
                <div className="space-y-2">
                    <Label htmlFor="edit-system-prompt">System Prompt</Label>
                    <Select
                        value={systemPromptId ?? '__default__'}
                        onValueChange={(v) => setSystemPromptId(v === '__default__' ? null : v)}
                    >
                        <SelectTrigger id="edit-system-prompt">
                            <SelectValue placeholder="Default (inherited)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__default__">
                                Default (inherited)
                            </SelectItem>
                            {systemPrompts.map((prompt) => (
                                <SelectItem key={prompt.id} value={prompt.id}>
                                    {prompt.name}
                                    {prompt.is_default ? ' ★' : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        Overrides the default system prompt for this model. Select &quot;Default (inherited)&quot; to use the fallback.
                    </p>
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => router.push('/admin/models')} disabled={isSaving}>
                    Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaveDisabled}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            <CustomProviderPickerDialog
                open={isPickerOpen}
                onOpenChange={setIsPickerOpen}
                onSelect={({ id, name }) => {
                    setCustomProviderId(id);
                    setCustomProviderName(name);
                }}
                onAddNew={handleAddNewProvider}
            />
        </div>
    );
}

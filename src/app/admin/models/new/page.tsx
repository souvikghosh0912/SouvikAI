'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { CustomProviderPickerDialog, ModelTrustedUsersDialog } from '@/components/admin';
import { useAdmin } from '@/hooks/useAdmin';
import { AIModel } from '@/types/chat';
import { PROVIDER_META } from '@/lib/constants/providers';
import { VISIBILITY_META } from '@/lib/constants/visibility';

interface ModelNewDraft {
    id: string;
    displayName: string;
    apiName: string;
    provider: AIModel['provider'];
    protocol: 'openai' | 'anthropic';
    customProviderId: string | null;
    customProviderName: string | null;
    quotaLimit: string;
    systemPromptId: string | null;
    visibility: AIModel['visibility'];
    trustedUserIds: string[];
}

const DRAFT_KEY = 'admin:model-new-draft';
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export default function NewModelPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { systemPrompts, createModel } = useAdmin();

    const [id, setId] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [apiName, setApiName] = useState('');
    const [provider, setProvider] = useState<AIModel['provider']>('nvidia');
    const [protocol, setProtocol] = useState<'openai' | 'anthropic'>('openai');
    const [customProviderId, setCustomProviderId] = useState<string | null>(null);
    const [customProviderName, setCustomProviderName] = useState<string | null>(null);
    const [quotaLimit, setQuotaLimit] = useState('500000');
    const [systemPromptId, setSystemPromptId] = useState<string | null>(null);
    const [visibility, setVisibility] = useState<AIModel['visibility']>('public');
    const [trustedUserIds, setTrustedUserIds] = useState<string[]>([]);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isTrustedUsersDialogOpen, setIsTrustedUsersDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Restore a draft after returning from the "add new custom provider" page.
    useEffect(() => {
        const draftRaw = sessionStorage.getItem(DRAFT_KEY);
        if (!draftRaw) return;
        sessionStorage.removeItem(DRAFT_KEY);
        try {
            const draft = JSON.parse(draftRaw) as ModelNewDraft;
            setId(draft.id);
            setDisplayName(draft.displayName);
            setApiName(draft.apiName);
            setProvider(draft.provider);
            setProtocol(draft.protocol);
            setCustomProviderId(draft.customProviderId);
            setCustomProviderName(draft.customProviderName);
            setQuotaLimit(draft.quotaLimit);
            setSystemPromptId(draft.systemPromptId);
            setVisibility(draft.visibility ?? 'public');
            setTrustedUserIds(draft.trustedUserIds ?? []);
        } catch {
            // ignore malformed draft
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Returning from the "add new provider" page with a freshly created provider.
    useEffect(() => {
        const newProviderId = searchParams.get('newProviderId');
        const newProviderName = searchParams.get('newProviderName');
        if (!newProviderId) return;
        setProvider('custom');
        setCustomProviderId(newProviderId);
        setCustomProviderName(newProviderName ? decodeURIComponent(newProviderName) : null);
        router.replace('/admin/models/new');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const handleAddNewProvider = () => {
        const draft: ModelNewDraft = {
            id,
            displayName,
            apiName,
            provider,
            protocol,
            customProviderId,
            customProviderName,
            quotaLimit,
            systemPromptId,
            visibility,
            trustedUserIds,
        };
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        router.push(`/admin/models/providers/new?returnTo=${encodeURIComponent('/admin/models/new')}`);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        const result = await createModel({
            id: id.trim(),
            name: apiName,
            displayName,
            quota_limit: parseInt(quotaLimit, 10),
            provider,
            ...(provider === 'freemodel' ? { protocol } : {}),
            ...(provider === 'custom' ? { custom_provider_id: customProviderId } : {}),
            system_prompt_id: systemPromptId,
            visibility,
            ...(visibility === 'selected' ? { trusted_user_ids: trustedUserIds } : {}),
        });
        setIsSaving(false);
        if (result.success) {
            router.push('/admin/models');
        } else {
            setError(result.error || 'Failed to create model');
        }
    };

    const isSaveDisabled =
        isSaving ||
        !id.trim() ||
        !ID_PATTERN.test(id.trim()) ||
        !displayName.trim() ||
        !apiName.trim() ||
        !quotaLimit.trim() ||
        (provider === 'custom' && !customProviderId);

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold">Add Model</h1>
                <p className="text-muted-foreground">Create a new model, assign a provider, and set who can see it.</p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="bg-card rounded-lg border border-border p-6 space-y-4">
                {/* Internal ID */}
                <div className="space-y-2">
                    <Label htmlFor="new-model-id">Internal ID</Label>
                    <Input
                        id="new-model-id"
                        value={id}
                        onChange={(e) => setId(e.target.value.toLowerCase())}
                        placeholder="e.g. velocity-1"
                        className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                        Lowercase letters, numbers, and hyphens only. Cannot be changed later.
                    </p>
                </div>

                {/* Display name */}
                <div className="space-y-2">
                    <Label htmlFor="new-display-name">Display Name</Label>
                    <Input
                        id="new-display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Velocity 1"
                    />
                </div>

                {/* Provider selector */}
                <div className="space-y-2">
                    <Label htmlFor="new-provider">Provider</Label>
                    <div className="flex gap-3" id="new-provider" role="group" aria-label="Provider selection">
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
                        <Label htmlFor="new-freemodel-protocol">Format</Label>
                        <Select value={protocol} onValueChange={(v) => setProtocol(v as 'openai' | 'anthropic')}>
                            <SelectTrigger id="new-freemodel-protocol">
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
                    <Label htmlFor="new-api-name">API Identifier (Name)</Label>
                    <Input
                        id="new-api-name"
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
                    <Label htmlFor="new-quota">Quota Limit (Tokens / 5 hrs)</Label>
                    <Input
                        id="new-quota"
                        type="number"
                        value={quotaLimit}
                        onChange={(e) => setQuotaLimit(e.target.value)}
                        placeholder="500000"
                    />
                </div>

                {/* System Prompt */}
                <div className="space-y-2">
                    <Label htmlFor="new-system-prompt">System Prompt</Label>
                    <Select
                        value={systemPromptId ?? '__default__'}
                        onValueChange={(v) => setSystemPromptId(v === '__default__' ? null : v)}
                    >
                        <SelectTrigger id="new-system-prompt">
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

                {/* Visibility */}
                <div className="space-y-2">
                    <Label htmlFor="new-visibility">Visibility</Label>
                    <div className="flex gap-3" id="new-visibility" role="group" aria-label="Visibility selection">
                        {(Object.keys(VISIBILITY_META) as AIModel['visibility'][]).map((v) => {
                            const meta = VISIBILITY_META[v];
                            const isSelected = visibility === v;
                            return (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() => setVisibility(v)}
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
                    <p className="text-xs text-muted-foreground">{VISIBILITY_META[visibility].description}</p>

                    {visibility === 'selected' && (
                        <Button variant="outline" className="w-full" onClick={() => setIsTrustedUsersDialogOpen(true)}>
                            Configure selected users ({trustedUserIds.length})
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => router.push('/admin/models')} disabled={isSaving}>
                    Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaveDisabled}>
                    {isSaving ? 'Creating...' : 'Create Model'}
                </Button>
            </div>

            <CustomProviderPickerDialog
                open={isPickerOpen}
                onOpenChange={setIsPickerOpen}
                onSelect={({ id: pid, name }) => {
                    setCustomProviderId(pid);
                    setCustomProviderName(name);
                }}
                onAddNew={handleAddNewProvider}
            />

            <ModelTrustedUsersDialog
                open={isTrustedUsersDialogOpen}
                onOpenChange={setIsTrustedUsersDialogOpen}
                selectedUserIds={trustedUserIds}
                onChange={setTrustedUserIds}
            />
        </div>
    );
}

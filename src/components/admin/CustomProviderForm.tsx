'use client';

import { useState } from 'react';
import { Button, Input, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { CustomProvider } from '@/types/chat';

export interface CustomProviderFormValues {
    name: string;
    base_url: string;
    api_key: string;
    protocol: CustomProvider['protocol'];
}

interface CustomProviderFormProps {
    /** Prefilled values when editing an existing provider. API key is never prefilled. */
    initialValues?: { name: string; base_url: string; protocol: CustomProvider['protocol'] };
    /** When true, the API key field is optional — blank means "keep the existing key". */
    isEdit?: boolean;
    isSaving: boolean;
    error?: string | null;
    submitLabel: string;
    onSubmit: (values: CustomProviderFormValues) => void;
    onCancel: () => void;
}

export function CustomProviderForm({
    initialValues,
    isEdit = false,
    isSaving,
    error,
    submitLabel,
    onSubmit,
    onCancel,
}: CustomProviderFormProps) {
    const [name, setName] = useState(initialValues?.name ?? '');
    const [baseUrl, setBaseUrl] = useState(initialValues?.base_url ?? '');
    const [apiKey, setApiKey] = useState('');
    const [protocol, setProtocol] = useState<CustomProvider['protocol']>(initialValues?.protocol ?? 'openai');

    const isSubmitDisabled =
        isSaving || !name.trim() || !baseUrl.trim() || (!isEdit && !apiKey.trim());

    return (
        <div className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-2">
                <Label htmlFor="cp-name">Name</Label>
                <Input
                    id="cp-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. My OpenRouter Account"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="cp-base-url">Base URL</Label>
                <Input
                    id="cp-base-url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.example.com/v1"
                    className="font-mono text-xs"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="cp-api-key">API Key</Label>
                <Input
                    id="cp-api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={isEdit ? 'Leave blank to keep existing key' : 'sk-...'}
                    className="font-mono text-xs"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="cp-protocol">Format</Label>
                <Select value={protocol} onValueChange={(v) => setProtocol(v as CustomProvider['protocol'])}>
                    <SelectTrigger id="cp-protocol">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="openai">OpenAI-compatible</SelectItem>
                        <SelectItem value="anthropic">Anthropic-compatible</SelectItem>
                        <SelectItem value="gemini">Gemini-compatible</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                    Cancel
                </Button>
                <Button
                    onClick={() => onSubmit({ name: name.trim(), base_url: baseUrl.trim(), api_key: apiKey.trim(), protocol })}
                    disabled={isSubmitDisabled}
                >
                    {isSaving ? 'Saving...' : submitLabel}
                </Button>
            </div>
        </div>
    );
}

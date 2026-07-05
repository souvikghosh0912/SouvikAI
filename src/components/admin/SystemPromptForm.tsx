'use client';

import { useState } from 'react';
import {
    Button,
    Input,
    Label,
    Textarea,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui';
import { SystemPrompt } from '@/types/chat';

export interface SystemPromptFormValues {
    name: string;
    content: string;
    status: SystemPrompt['status'];
}

interface SystemPromptFormProps {
    initialValues?: SystemPromptFormValues;
    isSaving: boolean;
    error?: string | null;
    submitLabel: string;
    onSubmit: (values: SystemPromptFormValues) => void;
    onCancel: () => void;
}

export function SystemPromptForm({
    initialValues,
    isSaving,
    error,
    submitLabel,
    onSubmit,
    onCancel,
}: SystemPromptFormProps) {
    const [name, setName] = useState(initialValues?.name ?? '');
    const [content, setContent] = useState(initialValues?.content ?? '');
    const [status, setStatus] = useState<SystemPrompt['status']>(initialValues?.status ?? 'experimental');

    const isSubmitDisabled = isSaving || !name.trim() || !content.trim();

    return (
        <div className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-2">
                <Label htmlFor="sp-name">Name</Label>
                <Input
                    id="sp-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Friendly Support Tone"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="sp-status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as SystemPrompt['status'])}>
                    <SelectTrigger id="sp-status">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="experimental">Experimental</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    Only production prompts can be assigned to a model or set as the default.
                </p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="sp-content">Content</Label>
                <Textarea
                    id="sp-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter the system prompt..."
                    className="min-h-[400px] font-mono text-sm"
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                    Cancel
                </Button>
                <Button
                    onClick={() => onSubmit({ name: name.trim(), content, status })}
                    disabled={isSubmitDisabled}
                >
                    {isSaving ? 'Saving...' : submitLabel}
                </Button>
            </div>
        </div>
    );
}

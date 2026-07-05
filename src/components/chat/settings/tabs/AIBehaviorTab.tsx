'use client';

import { useState, useEffect } from 'react';
import { useChatPreferences } from '@/hooks/useChatPreferences';
import type {
    ToneStyle,
    CharacteristicLevel,
} from '@/hooks/useChatPreferences';
import { Textarea, Button } from '@/components/ui';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    InlineSelect,
    SectionLabel,
    SettingsCard,
    SettingRow,
} from '../primitives';

const TONE_OPTIONS: { value: ToneStyle; label: string }[] = [
    { value: 'default', label: 'Default' },
    { value: 'formal', label: 'Formal' },
    { value: 'casual', label: 'Casual' },
    { value: 'technical', label: 'Technical' },
    { value: 'friendly', label: 'Friendly' },
];

const LEVEL_OPTIONS: { value: CharacteristicLevel; label: string }[] = [
    { value: 'less', label: 'Less' },
    { value: 'default', label: 'Default' },
    { value: 'more', label: 'More' },
];

export function PersonalizationTab() {
    const { preferences, updatePreference, isLoaded } = useChatPreferences();
    const [localPrompt, setLocalPrompt] = useState(preferences.systemPrompt);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (isLoaded) setLocalPrompt(preferences.systemPrompt);
    }, [isLoaded, preferences.systemPrompt]);

    if (!isLoaded) {
        return (
            <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
            </div>
        );
    }

    const handleSave = async () => {
        setIsSaving(true);
        setSaved(false);
        try {
            const res = await fetch('/api/settings/moderate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ systemPrompt: localPrompt }),
            });
            const data = await res.json();
            updatePreference('systemPrompt', localPrompt);
            updatePreference('isSystemPromptSafe', !!data.safe);
        } catch {
            updatePreference('systemPrompt', localPrompt);
            updatePreference('isSystemPromptSafe', true);
        } finally {
            setIsSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    const charCount = localPrompt.length;
    const overLimit = charCount > 2000;

    return (
        <div className="space-y-1 animate-in fade-in slide-in-from-bottom-1 duration-200 pb-4">
            {/* Tone */}
            <SectionLabel>Style</SectionLabel>
            <SettingsCard>
                <SettingRow
                    label="Base tone"
                    description="Set how the AI sounds when responding. Doesn't change capabilities."
                    control={
                        <InlineSelect<ToneStyle>
                            value={preferences.toneStyle}
                            options={TONE_OPTIONS}
                            onValueChange={(v) => updatePreference('toneStyle', v)}
                        />
                    }
                />
            </SettingsCard>

            {/* Characteristics */}
            <SectionLabel>Characteristics</SectionLabel>
            <SettingsCard>
                <SettingRow
                    label="Warm"
                    control={
                        <InlineSelect<CharacteristicLevel>
                            value={preferences.warmth}
                            options={LEVEL_OPTIONS}
                            onValueChange={(v) => updatePreference('warmth', v)}
                        />
                    }
                />
                <SettingRow
                    label="Enthusiastic"
                    control={
                        <InlineSelect<CharacteristicLevel>
                            value={preferences.enthusiasm}
                            options={LEVEL_OPTIONS}
                            onValueChange={(v) => updatePreference('enthusiasm', v)}
                        />
                    }
                />
                <SettingRow
                    label="Headers & lists"
                    control={
                        <InlineSelect<CharacteristicLevel>
                            value={preferences.headersAndLists}
                            options={LEVEL_OPTIONS}
                            onValueChange={(v) =>
                                updatePreference('headersAndLists', v)
                            }
                        />
                    }
                />
                <SettingRow
                    label="Emoji"
                    control={
                        <InlineSelect<CharacteristicLevel>
                            value={preferences.emoji}
                            options={LEVEL_OPTIONS}
                            onValueChange={(v) => updatePreference('emoji', v)}
                        />
                    }
                />
            </SettingsCard>

            {/* Custom instructions */}
            <SectionLabel>Custom instructions</SectionLabel>
            <SettingsCard>
                <div className="px-3.5 py-3 space-y-2.5">
                    <Textarea
                        value={localPrompt}
                        onChange={(e) => setLocalPrompt(e.target.value)}
                        placeholder="e.g. I'm a senior TypeScript engineer. Keep responses concise and production-ready."
                        className={cn(
                            'min-h-[110px] bg-surface-2 border-border focus:border-ring text-[12.5px] resize-y rounded-md p-3',
                            'font-mono leading-relaxed',
                            overLimit && 'border-destructive focus:border-destructive'
                        )}
                    />
                    <div className="flex items-center justify-between">
                        <p
                            className={cn(
                                'font-mono text-[11px] tabular-nums',
                                overLimit
                                    ? 'text-destructive'
                                    : 'text-foreground-subtle'
                            )}
                        >
                            {charCount.toLocaleString()} / 2,000
                        </p>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={
                                isSaving ||
                                localPrompt === preferences.systemPrompt ||
                                overLimit
                            }
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Saving
                                </>
                            ) : saved ? (
                                <>
                                    <Check className="h-3.5 w-3.5" />
                                    Saved
                                </>
                            ) : (
                                'Save'
                            )}
                        </Button>
                    </div>
                </div>
            </SettingsCard>
        </div>
    );
}

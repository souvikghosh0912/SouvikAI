/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useChatPreferences } from '@/hooks/useChatPreferences';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionLabel, SettingRow, SettingsCard } from '../primitives';

type SubmitBehavior = 'enter' | 'shift-enter';
type TextSize = 'small' | 'normal' | 'large';

export function PreferencesTab() {
    const { preferences, updatePreference, isLoaded } = useChatPreferences();

    if (!isLoaded) {
        return (
            <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
            </div>
        );
    }

    return (
        <div className="space-y-1 animate-in fade-in slide-in-from-bottom-1 duration-200 pb-4">
            {/* Send behavior */}
            <SectionLabel>Send behavior</SectionLabel>
            <SettingsCard>
                <SettingRow
                    stacked
                    label="When you press Enter"
                    description="Choose what keyboard shortcut submits your message in the chat box."
                    control={
                        <Segmented<SubmitBehavior>
                            value={preferences.submitBehavior}
                            onChange={(v) => updatePreference('submitBehavior', v)}
                            options={[
                                { value: 'enter', label: 'Send' },
                                { value: 'shift-enter', label: 'New line' },
                            ]}
                            ariaLabel="Send behavior"
                        />
                    }
                />
                <SettingRow
                    label={
                        preferences.submitBehavior === 'enter'
                            ? 'Send key: Enter'
                            : 'Send key: ⌘ / Ctrl + Enter'
                    }
                    description={
                        preferences.submitBehavior === 'enter'
                            ? 'Shift + Enter inserts a new line.'
                            : 'Enter inserts a new line.'
                    }
                />
            </SettingsCard>

            {/* Text size */}
            <SectionLabel>Reading</SectionLabel>
            <SettingsCard>
                <SettingRow
                    stacked
                    label="Chat font size"
                    description="Adjust the size of text in AI-generated messages."
                    control={
                        <Segmented<TextSize>
                            value={preferences.textSize}
                            onChange={(v) => updatePreference('textSize', v)}
                            options={[
                                { value: 'small', label: 'Small' },
                                { value: 'normal', label: 'Normal' },
                                { value: 'large', label: 'Large' },
                            ]}
                            ariaLabel="Chat font size"
                        />
                    }
                />
            </SettingsCard>
        </div>
    );
}

/* ── Segmented control (single-border parent, no per-button tiles) ─── */

function Segmented<T extends string>({
    value,
    onChange,
    options,
    ariaLabel,
}: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
    ariaLabel: string;
}) {
    return (
        <div
            role="radiogroup"
            aria-label={ariaLabel}
            className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface-2 p-0.5"
        >
            {options.map((opt) => {
                const isActive = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            'h-7 px-3 rounded-[4px] text-[12px] font-medium transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isActive
                                ? 'bg-surface text-foreground shadow-subtle'
                                : 'text-foreground-muted hover:text-foreground'
                        )}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

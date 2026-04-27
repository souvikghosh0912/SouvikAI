'use client';

/**
 * GeneralTab — Settings → General
 *
 * Visual + behavioural preferences:
 *  - Display: theme, contrast, accent color
 *  - Localisation: language
 *  - Message actions: action bar + regenerate
 *  - Prompt suggestions
 *  - Data: archived chats shortcut
 */

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Loader2, Archive, ChevronRight } from 'lucide-react';
import { useChatPreferences } from '@/hooks/useChatPreferences';
import {
    SettingsCard,
    SettingRow,
    SectionLabel,
    SettingsSelect,
    Toggle,
} from '../primitives';

/* ── Accent palette ──────────────────────────────────────────────── */

const ACCENT_COLORS = [
    { id: 'blue',   label: 'Blue',   hsl: '217 91% 60%', hex: '#3B82F6' },
    { id: 'purple', label: 'Purple', hsl: '262 80% 65%', hex: '#9B59F5' },
    { id: 'green',  label: 'Green',  hsl: '142 71% 45%', hex: '#22C55E' },
    { id: 'orange', label: 'Orange', hsl: '25 95% 53%',  hex: '#F97316' },
    { id: 'rose',   label: 'Rose',   hsl: '347 77% 60%', hex: '#F43F5E' },
    { id: 'slate',  label: 'Slate',  hsl: '220 14% 60%', hex: '#8B98B1' },
] as const;

const LANGUAGES = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'hi',    label: 'Hindi' },
    { value: 'es',    label: 'Spanish' },
    { value: 'fr',    label: 'French' },
    { value: 'de',    label: 'German' },
    { value: 'ja',    label: 'Japanese' },
    { value: 'zh-CN', label: 'Chinese (Simplified)' },
    { value: 'pt-BR', label: 'Portuguese (Brazil)' },
    { value: 'ar',    label: 'Arabic' },
];

/* ── Component ───────────────────────────────────────────────────── */

interface GeneralTabProps {
    onNavigateToArchived?: () => void;
}

export function GeneralTab({ onNavigateToArchived }: GeneralTabProps = {}) {
    const { preferences, updatePreference, isLoaded } = useChatPreferences();
    const { setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // Theme → next-themes
    useEffect(() => {
        if (mounted && isLoaded) setTheme(preferences.theme);
    }, [preferences.theme, mounted, isLoaded, setTheme]);

    // Accent color → --brand and --ring (kept monochrome elsewhere via --primary)
    useEffect(() => {
        if (!mounted || !isLoaded) return;
        const color = ACCENT_COLORS.find((c) => c.id === preferences.accentColor);
        if (color) {
            document.documentElement.style.setProperty('--brand', color.hsl);
            document.documentElement.style.setProperty('--ring', color.hsl);
        }
    }, [preferences.accentColor, mounted, isLoaded]);

    // Contrast → CSS filter
    useEffect(() => {
        if (!mounted || !isLoaded) return;
        const filterMap: Record<string, string> = {
            standard: 'none',
            medium: 'contrast(1.06) saturate(1.04)',
            high: 'contrast(1.15) saturate(1.08)',
        };
        document.documentElement.style.filter =
            filterMap[preferences.contrast] ?? 'none';
        return () => {
            document.documentElement.style.filter = 'none';
        };
    }, [preferences.contrast, mounted, isLoaded]);

    if (!isLoaded || !mounted) {
        return (
            <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
            </div>
        );
    }

    const accentOptions = ACCENT_COLORS.map((c) => ({
        value: c.id,
        label: c.label,
        icon: (
            <span
                className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-border"
                style={{ backgroundColor: c.hex }}
            />
        ),
    }));

    return (
        <div className="space-y-1 animate-in fade-in slide-in-from-bottom-1 duration-200 pb-4">
            {/* Display */}
            <SectionLabel>Display</SectionLabel>
            <SettingsCard>
                <SettingRow
                    label="Appearance"
                    control={
                        <SettingsSelect
                            value={preferences.theme}
                            onValueChange={(v) =>
                                updatePreference('theme', v as 'light' | 'dark' | 'system')
                            }
                            options={[
                                { value: 'dark', label: 'Dark' },
                                { value: 'light', label: 'Light' },
                                { value: 'system', label: 'System' },
                            ]}
                        />
                    }
                />
                <SettingRow
                    label="Contrast"
                    control={
                        <SettingsSelect
                            value={preferences.contrast}
                            onValueChange={(v) =>
                                updatePreference(
                                    'contrast',
                                    v as 'standard' | 'medium' | 'high'
                                )
                            }
                            options={[
                                { value: 'standard', label: 'Standard' },
                                { value: 'medium', label: 'Medium' },
                                { value: 'high', label: 'High' },
                            ]}
                        />
                    }
                />
                <SettingRow
                    label="Accent color"
                    description="Used for selection, focus rings, and brand emphasis."
                    control={
                        <SettingsSelect
                            value={preferences.accentColor}
                            onValueChange={(v) =>
                                updatePreference(
                                    'accentColor',
                                    v as 'blue' | 'purple' | 'green' | 'orange' | 'rose' | 'slate'
                                )
                            }
                            options={accentOptions}
                        />
                    }
                />
            </SettingsCard>

            {/* Localisation */}
            <SectionLabel>Localisation</SectionLabel>
            <SettingsCard>
                <SettingRow
                    label="Language"
                    description="The display language across the interface."
                    control={
                        <SettingsSelect
                            value={preferences.language}
                            onValueChange={(v) => updatePreference('language', v)}
                            options={LANGUAGES}
                            width="w-[170px]"
                        />
                    }
                />
            </SettingsCard>

            {/* Message Actions */}
            <SectionLabel>Message Actions</SectionLabel>
            <SettingsCard>
                <SettingRow
                    label="Show action bar"
                    description="Display Copy and Regenerate buttons below every AI response on hover."
                    control={
                        <Toggle
                            id="toggle-show-message-actions"
                            checked={preferences.showMessageActions}
                            onChange={(v) => updatePreference('showMessageActions', v)}
                            label="Show action bar"
                        />
                    }
                />
                <SettingRow
                    label="Enable Regenerate"
                    description={
                        preferences.showMessageActions
                            ? 'Allow re-running an assistant response with a single click.'
                            : 'Enable the action bar above to use this setting.'
                    }
                    control={
                        <Toggle
                            id="toggle-enable-regenerate"
                            checked={preferences.enableRegenerate}
                            onChange={(v) => updatePreference('enableRegenerate', v)}
                            disabled={!preferences.showMessageActions}
                            label="Enable Regenerate"
                        />
                    }
                />
            </SettingsCard>

            {/* Prompt Suggestions */}
            <SectionLabel>Prompt Suggestions</SectionLabel>
            <SettingsCard>
                <SettingRow
                    label="Show suggestion cards"
                    description="Display quick-start prompt cards when no conversation is active. Clicking a card pre-fills the input."
                    control={
                        <Toggle
                            id="toggle-show-prompt-suggestions"
                            checked={preferences.showPromptSuggestions}
                            onChange={(v) =>
                                updatePreference('showPromptSuggestions', v)
                            }
                            label="Show suggestion cards"
                        />
                    }
                />
            </SettingsCard>

            {/* Data */}
            <SectionLabel>Data</SectionLabel>
            <SettingsCard>
                <SettingRow
                    label="Archived chats"
                    description="Browse chats you've archived. Open them read-only or restore them to your list."
                    control={
                        <button
                            type="button"
                            onClick={onNavigateToArchived}
                            className="group flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium text-foreground-muted hover:text-foreground hover:bg-surface-2 border border-transparent hover:border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <Archive className="h-3.5 w-3.5" strokeWidth={1.5} />
                            <span>View</span>
                            <ChevronRight
                                className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity"
                                strokeWidth={1.5}
                            />
                        </button>
                    }
                />
            </SettingsCard>
        </div>
    );
}

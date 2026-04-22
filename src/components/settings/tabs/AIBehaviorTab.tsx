'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useChatPreferences } from '@/hooks/useChatPreferences';
import type { ToneStyle, CharacteristicLevel } from '@/hooks/useChatPreferences';
import { Textarea, Button } from '@/components/ui';
import { Loader2, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Inline dropdown (plain text + chevron, matches screenshot exactly) ───────

function InlineSelect<T extends string>({
    value,
    options,
    onValueChange,
}: {
    value: T;
    options: { value: T; label: string }[];
    onValueChange: (v: T) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const label = options.find(o => o.value === value)?.label ?? value;
    const isNonDefault = value !== 'default';

    const close = useCallback(() => setOpen(false), []);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) close();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, close]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-normal transition-colors',
                    isNonDefault
                        ? 'bg-white/10 text-foreground hover:bg-white/15'
                        : 'text-foreground hover:bg-white/5',
                )}
            >
                <span>{label}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] bg-[#2a2a2a] border border-white/10 rounded-lg shadow-xl overflow-hidden py-1">
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onValueChange(opt.value); setOpen(false); }}
                            className={cn(
                                'w-full text-left px-3 py-2 text-[13px] transition-colors',
                                opt.value === value
                                    ? 'text-foreground bg-white/10'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Option sets ──────────────────────────────────────────────────────────────

const TONE_OPTIONS: { value: ToneStyle; label: string }[] = [
    { value: 'default',   label: 'Default'   },
    { value: 'formal',    label: 'Formal'    },
    { value: 'casual',    label: 'Casual'    },
    { value: 'technical', label: 'Technical' },
    { value: 'friendly',  label: 'Friendly'  },
];

const LEVEL_OPTIONS: { value: CharacteristicLevel; label: string }[] = [
    { value: 'less',    label: 'Less'    },
    { value: 'default', label: 'Default' },
    { value: 'more',    label: 'More'    },
];

// ─── Row (flat, no card border — separator via border-b) ──────────────────────

function Row({
    label,
    control,
    className,
}: {
    label: string;
    control: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex items-center justify-between py-3', className)}>
            <span className="text-[14px] text-foreground">{label}</span>
            {control}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pb-4">

            {/* Base style and tone */}
            <div className="pb-3 border-b border-border/30">
                <div className="flex items-start justify-between gap-4 py-1">
                    <div className="min-w-0">
                        <p className="text-[14px] text-foreground">Base style and tone</p>
                        <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                            Set the style and tone of how the AI responds to you. This doesn&apos;t impact the AI&apos;s capabilities.
                        </p>
                    </div>
                    <div className="shrink-0 pt-0.5">
                        <InlineSelect<ToneStyle>
                            value={preferences.toneStyle}
                            options={TONE_OPTIONS}
                            onValueChange={(v) => updatePreference('toneStyle', v)}
                        />
                    </div>
                </div>
            </div>

            {/* Characteristics */}
            <div className="pt-4 pb-1">
                <p className="text-[14px] font-semibold text-foreground">Characteristics</p>
                <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                    Choose additional customizations on top of your base style and tone.
                </p>
            </div>

            <div className="divide-y divide-border/30">
                <Row
                    label="Warm"
                    control={
                        <InlineSelect<CharacteristicLevel>
                            value={preferences.warmth}
                            options={LEVEL_OPTIONS}
                            onValueChange={(v) => updatePreference('warmth', v)}
                        />
                    }
                />
                <Row
                    label="Enthusiastic"
                    control={
                        <InlineSelect<CharacteristicLevel>
                            value={preferences.enthusiasm}
                            options={LEVEL_OPTIONS}
                            onValueChange={(v) => updatePreference('enthusiasm', v)}
                        />
                    }
                />
                <Row
                    label="Headers & Lists"
                    control={
                        <InlineSelect<CharacteristicLevel>
                            value={preferences.headersAndLists}
                            options={LEVEL_OPTIONS}
                            onValueChange={(v) => updatePreference('headersAndLists', v)}
                        />
                    }
                />
                <Row
                    label="Emoji"
                    control={
                        <InlineSelect<CharacteristicLevel>
                            value={preferences.emoji}
                            options={LEVEL_OPTIONS}
                            onValueChange={(v) => updatePreference('emoji', v)}
                        />
                    }
                />
            </div>

            {/* Custom instructions */}
            <div className="pt-5 border-t border-border/30 mt-1 space-y-3">
                <p className="text-[14px] text-foreground">Custom instructions</p>
                <Textarea
                    value={localPrompt}
                    onChange={(e) => setLocalPrompt(e.target.value)}
                    placeholder="e.g. I'm a senior TypeScript engineer. Keep responses concise and production-ready."
                    className="min-h-[120px] bg-transparent border-border/40 hover:border-border/70 focus:border-primary text-[13px] resize-y p-3 rounded-lg"
                />
                <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground/60">
                        {localPrompt.length} / 2,000
                    </p>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || localPrompt === preferences.systemPrompt || localPrompt.length > 2000}
                        className="h-8 px-4 text-[12px] rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all flex items-center gap-2"
                    >
                        {isSaving ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                        ) : saved ? (
                            <><Check className="h-3.5 w-3.5" /> Saved</>
                        ) : 'Save'}
                    </Button>
                </div>
            </div>

        </div>
    );
}

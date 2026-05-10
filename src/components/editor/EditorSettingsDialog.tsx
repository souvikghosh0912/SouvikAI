'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useEditorSettings, type EditorTheme } from './EditorSettingsProvider';
import { Switch } from '@/components/ui';
import { cn } from '@/lib/utils';

interface EditorSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const THEME_OPTIONS: { value: EditorTheme; label: string; help: string }[] = [
    { value: 'auto', label: 'Auto', help: 'Match the app theme' },
    { value: 'hc', label: 'High contrast', help: 'WCAG-AAA, accessible focus rings' },
];

const FONT_SIZES = [11, 12, 13, 14, 15, 16, 18, 20];
const TAB_SIZES = [2, 4, 8];

export function EditorSettingsDialog({ open, onOpenChange }: EditorSettingsDialogProps) {
    const { settings, update, reset } = useEditorSettings();

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fadeIn" />
                <DialogPrimitive.Content
                    aria-labelledby="editor-settings-title"
                    aria-describedby="editor-settings-desc"
                    className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(520px,92vw)] max-h-[85vh] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-overlay flex flex-col"
                >
                    <header className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                        <div>
                            <DialogPrimitive.Title
                                id="editor-settings-title"
                                className="text-[14px] font-semibold text-foreground"
                            >
                                Editor settings
                            </DialogPrimitive.Title>
                            <DialogPrimitive.Description
                                id="editor-settings-desc"
                                className="text-[12px] text-foreground-muted mt-0.5"
                            >
                                Preferences are saved to this browser.
                            </DialogPrimitive.Description>
                        </div>
                        <DialogPrimitive.Close
                            aria-label="Close settings"
                            className="p-1 rounded text-foreground-muted hover:text-foreground hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <X className="h-4 w-4" />
                        </DialogPrimitive.Close>
                    </header>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        <Section title="Theme">
                            <div role="radiogroup" aria-label="Editor theme" className="grid grid-cols-2 gap-2">
                                {THEME_OPTIONS.map((opt) => {
                                    const active = settings.theme === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            role="radio"
                                            aria-checked={active}
                                            onClick={() => update('theme', opt.value)}
                                            className={cn(
                                                'text-left p-3 rounded-lg border transition-colors',
                                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                                active
                                                    ? 'border-foreground bg-surface-2'
                                                    : 'border-border-subtle hover:border-border-strong',
                                            )}
                                        >
                                            <div className="text-[13px] font-medium text-foreground">
                                                {opt.label}
                                            </div>
                                            <div className="text-[11px] text-foreground-muted mt-0.5">
                                                {opt.help}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </Section>

                        <Section title="Font size">
                            <ChipGroup
                                ariaLabel="Font size"
                                value={settings.fontSize}
                                options={FONT_SIZES}
                                onChange={(v) => update('fontSize', v)}
                                renderLabel={(v) => `${v}px`}
                            />
                        </Section>

                        <Section title="Indentation">
                            <div className="flex items-center justify-between gap-3">
                                <Label>Tab size</Label>
                                <ChipGroup
                                    ariaLabel="Tab size"
                                    value={settings.tabSize}
                                    options={TAB_SIZES}
                                    onChange={(v) => update('tabSize', v)}
                                    renderLabel={(v) => String(v)}
                                />
                            </div>
                            <Row label="Insert spaces">
                                <Switch
                                    checked={settings.insertSpaces}
                                    onCheckedChange={(v) => update('insertSpaces', v)}
                                    aria-label="Insert spaces instead of tabs"
                                />
                            </Row>
                        </Section>

                        <Section title="View">
                            <Row label="Word wrap">
                                <Switch
                                    checked={settings.wordWrap}
                                    onCheckedChange={(v) => update('wordWrap', v)}
                                    aria-label="Word wrap"
                                />
                            </Row>
                            <Row label="Line numbers">
                                <Switch
                                    checked={settings.lineNumbers}
                                    onCheckedChange={(v) => update('lineNumbers', v)}
                                    aria-label="Show line numbers"
                                />
                            </Row>
                            <Row label="Highlight active line">
                                <Switch
                                    checked={settings.highlightActiveLine}
                                    onCheckedChange={(v) => update('highlightActiveLine', v)}
                                    aria-label="Highlight active line"
                                />
                            </Row>
                            <Row label="Show minimap">
                                <Switch
                                    checked={settings.minimap}
                                    onCheckedChange={(v) => update('minimap', v)}
                                    aria-label="Show minimap"
                                />
                            </Row>
                        </Section>

                        <Section title="Accessibility">
                            <Row
                                label="Reduce motion"
                                help="Disables animations like the cursor blink and tab transitions."
                            >
                                <Switch
                                    checked={settings.reduceMotion}
                                    onCheckedChange={(v) => update('reduceMotion', v)}
                                    aria-label="Reduce motion"
                                />
                            </Row>
                        </Section>
                    </div>

                    <footer className="flex items-center justify-between px-4 py-2.5 border-t border-border-subtle">
                        <button
                            type="button"
                            onClick={reset}
                            className="text-[12px] text-foreground-muted hover:text-foreground"
                        >
                            Reset to defaults
                        </button>
                        <DialogPrimitive.Close className="px-3 h-7 rounded-md text-[12px] font-medium bg-foreground text-background hover:bg-foreground/90">
                            Done
                        </DialogPrimitive.Close>
                    </footer>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground-subtle">
                {title}
            </h3>
            <div className="space-y-2">{children}</div>
        </section>
    );
}

function Row({
    label,
    help,
    children,
}: {
    label: string;
    help?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-3 py-1">
            <div className="flex-1 min-w-0">
                <Label>{label}</Label>
                {help && <p className="text-[11px] text-foreground-muted mt-0.5">{help}</p>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return <div className="text-[13px] text-foreground">{children}</div>;
}

function ChipGroup<T extends string | number>({
    ariaLabel,
    value,
    options,
    onChange,
    renderLabel,
}: {
    ariaLabel: string;
    value: T;
    options: T[];
    onChange: (v: T) => void;
    renderLabel: (v: T) => string;
}) {
    return (
        <div role="radiogroup" aria-label={ariaLabel} className="inline-flex flex-wrap gap-1">
            {options.map((opt) => {
                const active = opt === value;
                return (
                    <button
                        key={String(opt)}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(opt)}
                        className={cn(
                            'h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            active
                                ? 'bg-foreground text-background'
                                : 'bg-surface-2 text-foreground-muted hover:text-foreground',
                        )}
                    >
                        {renderLabel(opt)}
                    </button>
                );
            })}
        </div>
    );
}

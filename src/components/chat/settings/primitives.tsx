'use client';

import * as React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ──────────────────────────────────────────────────────────────────────────
   Shared building blocks for the Settings modal.
   All tabs should compose UIs from these — no per-tab card/row/toggle markup.
   ────────────────────────────────────────────────────────────────────────── */

/* ── Section label ─────────────────────────────────────────────────────── */

export function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-foreground-subtle px-0.5 pt-5 pb-2 first:pt-0">
            {children}
        </p>
    );
}

/* ── Section (label + optional description above a SettingsCard) ──────── */

export function SettingsSection({
    label,
    description,
    children,
}: {
    label: string;
    description?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
                <SectionLabel>{label}</SectionLabel>
            </div>
            {description && (
                <p className="text-[12px] text-foreground-muted -mt-1.5 pb-1 leading-relaxed">
                    {description}
                </p>
            )}
            {children}
        </div>
    );
}

/* ── Card frame for grouped settings rows ──────────────────────────────── */

export function SettingsCard({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'rounded-md border border-border bg-surface overflow-hidden divide-y divide-border-subtle',
                className
            )}
        >
            {children}
        </div>
    );
}

/* ── Single row inside a SettingsCard ──────────────────────────────────── */

export interface SettingRowProps {
    label: string;
    description?: React.ReactNode;
    control?: React.ReactNode;
    /** When true, control sits below description instead of beside the label. */
    stacked?: boolean;
    className?: string;
}

export function SettingRow({
    label,
    description,
    control,
    stacked,
    className,
}: SettingRowProps) {
    if (stacked) {
        return (
            <div className={cn('flex flex-col gap-2 px-3.5 py-3', className)}>
                <div className="space-y-0.5">
                    <p className="text-[13px] font-medium text-foreground leading-none">
                        {label}
                    </p>
                    {description && (
                        <p className="text-[12px] text-foreground-muted leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>
                {control && <div className="pt-0.5">{control}</div>}
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex items-center justify-between gap-4 px-3.5 py-2.5 min-h-[44px]',
                className
            )}
        >
            <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-foreground leading-none">
                    {label}
                </p>
                {description && (
                    <p className="text-[12px] text-foreground-muted mt-1 leading-relaxed max-w-md">
                        {description}
                    </p>
                )}
            </div>
            {control && <div className="shrink-0 flex items-center">{control}</div>}
        </div>
    );
}

/* ── Token-aware toggle (replaces ad-hoc bg-white toggles) ─────────────── */

export function Toggle({
    id,
    checked,
    onChange,
    disabled,
    label,
}: {
    id?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
    label?: string;
}) {
    return (
        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-[20px] w-[34px] shrink-0 cursor-pointer items-center rounded-full',
                'transition-colors duration-200 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                checked
                    ? 'bg-foreground'
                    : 'bg-surface-3 border border-border-strong',
                disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
            )}
        >
            <span
                className={cn(
                    'pointer-events-none block h-[14px] w-[14px] rounded-full',
                    'transform transition-transform duration-200 ease-out',
                    checked
                        ? 'translate-x-[17px] bg-background'
                        : 'translate-x-[3px] bg-foreground/40'
                )}
            />
        </button>
    );
}

/* ── Compact select ────────────────────────────────────────────────────── */

export function SettingsSelect({
    value,
    onValueChange,
    options,
    width = 'w-[140px]',
}: {
    value: string;
    onValueChange: (v: string) => void;
    options: { value: string; label: string; icon?: React.ReactNode }[];
    width?: string;
}) {
    const current = options.find((o) => o.value === value);

    return (
        <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger
                className={cn(
                    width,
                    'h-8 text-[13px] bg-surface-2 border border-border text-foreground px-2.5',
                    'hover:bg-surface-3 hover:border-border-strong',
                    'focus:ring-0 focus:ring-offset-0 focus:border-ring'
                )}
            >
                <span className="flex items-center gap-2 min-w-0">
                    {current?.icon}
                    <SelectValue />
                </span>
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border shadow-overlay">
                {options.map((opt) => (
                    <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-[13px]"
                    >
                        <span className="flex items-center gap-2">
                            {opt.icon}
                            {opt.label}
                        </span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

/* ── Plain-text inline dropdown (used by Personalization tab) ─────────── */

export function InlineSelect<T extends string>({
    value,
    options,
    onValueChange,
    defaultValue = 'default',
}: {
    value: T;
    options: { value: T; label: string }[];
    onValueChange: (v: T) => void;
    /** Highlight when value is anything other than this. Defaults to "default". */
    defaultValue?: T;
}) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);
    const label = options.find((o) => o.value === value)?.label ?? value;
    const isCustom = value !== defaultValue;

    React.useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-[13px] font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                    isCustom
                        ? 'bg-surface-3 text-foreground hover:bg-surface-3/80'
                        : 'text-foreground hover:bg-surface-2'
                )}
            >
                <span>{label}</span>
                <ChevronDown
                    className="h-3 w-3 text-foreground-muted"
                    strokeWidth={1.75}
                />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] bg-popover border border-border rounded-md shadow-overlay overflow-hidden py-1">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                                onValueChange(opt.value);
                                setOpen(false);
                            }}
                            className={cn(
                                'w-full text-left px-2.5 py-1.5 text-[13px] transition-colors',
                                opt.value === value
                                    ? 'text-foreground bg-surface-2'
                                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-2'
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

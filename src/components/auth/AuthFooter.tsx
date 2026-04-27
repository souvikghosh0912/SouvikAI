'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Bottom-left footer for the auth split-pane.
 *
 * Shows a small legal/contact line + a discreet theme toggle.
 */
export function AuthFooter() {
    return (
        <div className="flex items-center justify-between gap-4 pt-6 mt-6 border-t border-border-subtle">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-foreground-subtle">
                <span>&copy; {new Date().getFullYear()} Souvik AI</span>
                <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                >
                    Privacy
                </a>
                <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                >
                    Terms
                </a>
                <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                >
                    Contact
                </a>
            </div>
            <ThemeToggle />
        </div>
    );
}

/** Three-state segmented theme toggle: light / system / dark. */
function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const options: { value: 'light' | 'system' | 'dark'; icon: typeof Sun; label: string }[] = [
        { value: 'light', icon: Sun, label: 'Light theme' },
        { value: 'system', icon: Monitor, label: 'System theme' },
        { value: 'dark', icon: Moon, label: 'Dark theme' },
    ];

    const active = mounted ? theme ?? 'system' : 'system';

    return (
        <div
            role="radiogroup"
            aria-label="Theme"
            className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5"
        >
            {options.map(({ value, icon: Icon, label }) => {
                const isActive = active === value;
                return (
                    <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        aria-label={label}
                        onClick={() => setTheme(value)}
                        className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-sm transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isActive
                                ? 'bg-surface-3 text-foreground'
                                : 'text-foreground-muted hover:text-foreground'
                        )}
                    >
                        <Icon className="h-3.5 w-3.5" strokeWidth={isActive ? 1.75 : 1.5} />
                    </button>
                );
            })}
        </div>
    );
}

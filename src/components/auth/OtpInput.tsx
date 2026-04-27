'use client';

import { useRef, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    hasError?: boolean;
}

const LENGTH = 6;

/**
 * Six single-character boxes that behave as a unified OTP field.
 * Monospaced digits, monochrome design, accent-on-focus.
 */
export function OtpInput({ value, onChange, disabled, hasError }: OtpInputProps) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const digits = value.split('').concat(Array(LENGTH).fill('')).slice(0, LENGTH);

    const focus = (index: number) => {
        const clamped = Math.max(0, Math.min(LENGTH - 1, index));
        inputRefs.current[clamped]?.focus();
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
        const raw = e.target.value.replace(/\D/g, '');
        if (!raw) return;
        const char = raw[raw.length - 1];
        const next = [...digits];
        next[index] = char;
        onChange(next.join(''));
        if (index < LENGTH - 1) focus(index + 1);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace') {
            e.preventDefault();
            const next = [...digits];
            if (next[index]) {
                next[index] = '';
                onChange(next.join(''));
            } else {
                next[Math.max(0, index - 1)] = '';
                onChange(next.join(''));
                focus(index - 1);
            }
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            focus(index - 1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            focus(index + 1);
        }
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
        if (pasted) {
            const next = pasted.split('').concat(Array(LENGTH).fill('')).slice(0, LENGTH);
            onChange(next.join(''));
            focus(Math.min(pasted.length, LENGTH - 1));
        }
    };

    return (
        <div
            className="flex justify-center gap-2"
            role="group"
            aria-label="One-time password"
        >
            {digits.map((digit, i) => {
                const isFilled = !!digit;
                return (
                    <input
                        key={i}
                        ref={(el) => {
                            inputRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        disabled={disabled}
                        autoComplete={i === 0 ? 'one-time-code' : 'off'}
                        aria-label={`Digit ${i + 1}`}
                        aria-invalid={hasError || undefined}
                        onChange={(e) => handleChange(e, i)}
                        onKeyDown={(e) => handleKeyDown(e, i)}
                        onPaste={handlePaste}
                        onFocus={(e) => e.target.select()}
                        className={cn(
                            'w-11 h-12 text-center font-mono text-2xl text-foreground',
                            'rounded-md border bg-surface outline-none',
                            'transition-[border-color,background-color,box-shadow] duration-150 ease-out',
                            'focus:border-ring focus:bg-surface-2 focus:shadow-[0_0_0_1px_hsl(var(--ring))]',
                            hasError
                                ? 'border-destructive focus:border-destructive focus:shadow-[0_0_0_1px_hsl(var(--destructive))]'
                                : isFilled
                                    ? 'border-border-strong'
                                    : 'border-border',
                            disabled && 'opacity-50 cursor-not-allowed'
                        )}
                    />
                );
            })}
        </div>
    );
}

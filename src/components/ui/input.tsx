import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    [
                        'flex h-9 w-full rounded-md border bg-surface px-3 text-sm text-foreground',
                        'border-border-strong',
                        'placeholder:text-foreground-subtle',
                        'transition-[border-color,background-color,box-shadow] duration-150 ease-out',
                        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
                        'focus-visible:outline-none focus-visible:border-ring focus-visible:shadow-[0_0_0_1px_hsl(var(--ring))]',
                        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-2',
                        'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:shadow-[0_0_0_1px_hsl(var(--destructive))]',
                    ].join(' '),
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = 'Input';

export { Input };

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    [
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium',
        'transition-[background-color,border-color,color,box-shadow] duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50',
        '[&_svg]:size-4 [&_svg]:shrink-0',
    ].join(' '),
    {
        variants: {
            variant: {
                default:
                    'bg-primary text-primary-foreground hover:bg-primary/90',
                secondary:
                    'bg-surface-2 text-foreground border border-border hover:bg-surface-3',
                outline:
                    'border border-border-strong bg-transparent text-foreground hover:bg-surface-2',
                ghost:
                    'bg-transparent text-foreground hover:bg-surface-2',
                destructive:
                    'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                link:
                    'h-auto p-0 text-foreground underline-offset-4 hover:underline focus-visible:ring-0 focus-visible:ring-offset-0',
            },
            size: {
                default: 'h-9 px-3.5',
                sm: 'h-8 px-3 text-[13px]',
                lg: 'h-10 px-4',
                xl: 'h-11 px-5 text-[15px]',
                icon: 'h-9 w-9',
                'icon-sm': 'h-8 w-8',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

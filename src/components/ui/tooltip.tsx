'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
    React.ElementRef<typeof TooltipPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
        showArrow?: boolean;
    }
>(({ className, sideOffset = 6, showArrow = true, children, ...props }, ref) => (
    <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                'relative z-[100] max-w-[260px] rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md',
                'animate-in fade-in-0 zoom-in-95',
                'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
                'data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1',
                className,
            )}
            {...props}
        >
            {children}
            {showArrow && <TooltipPrimitive.Arrow className="-my-px fill-popover" />}
        </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * Convenience wrapper that renders a tooltip around any trigger.
 * Use this for the common "wrap-and-add-a-label" pattern; for full control
 * (controlled state, custom side, etc.) compose the primitives directly.
 */
interface SimpleTooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    side?: TooltipPrimitive.TooltipContentProps['side'];
    align?: TooltipPrimitive.TooltipContentProps['align'];
    sideOffset?: number;
    delayDuration?: number;
    /** Hide the tooltip — useful for conditionally suppressing it. */
    disabled?: boolean;
    className?: string;
}

function SimpleTooltip({
    content,
    children,
    side = 'top',
    align = 'center',
    sideOffset = 6,
    delayDuration = 250,
    disabled,
    className,
}: SimpleTooltipProps) {
    if (disabled || !content) return <>{children}</>;
    return (
        <Tooltip delayDuration={delayDuration}>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent side={side} align={align} sideOffset={sideOffset} className={className}>
                {content}
            </TooltipContent>
        </Tooltip>
    );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, SimpleTooltip };

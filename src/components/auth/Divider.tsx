/**
 * Divider — horizontal hairline rule with optional centered label.
 * Used between OAuth and email forms on auth pages.
 */
export function Divider({ children }: { children?: React.ReactNode }) {
    if (!children) {
        return <div className="h-px bg-border-subtle" role="separator" />;
    }

    return (
        <div className="relative flex items-center" role="separator" aria-label={typeof children === 'string' ? children : undefined}>
            <span className="flex-1 h-px bg-border-subtle" />
            <span className="px-3 text-[11px] uppercase tracking-[0.14em] text-foreground-subtle">
                {children}
            </span>
            <span className="flex-1 h-px bg-border-subtle" />
        </div>
    );
}

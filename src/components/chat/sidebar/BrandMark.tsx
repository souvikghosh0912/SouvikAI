/**
 * Small brand mark used at the top of the sidebar. Rendered with the
 * wordmark on desktop (expanded) and as a logo-only square when the sidebar
 * is collapsed or on the mobile drawer header.
 */
export function BrandMark({ withWordmark = true }: { withWordmark?: boolean }) {
    return (
        <div className="flex items-center gap-2 text-foreground">
            <div className="h-6 w-6 rounded-md bg-foreground text-background flex items-center justify-center">
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        d="M12 2C6.477 2 2 6.27 2 11.5c0 2.37.93 4.53 2.46 6.14L3 21.75l4.45-1.45A10.1 10.1 0 0 0 12 21c5.523 0 10-4.27 10-9.5S17.523 2 12 2Z"
                        fill="currentColor"
                    />
                </svg>
            </div>
            {withWordmark && (
                <span className="text-[14px] font-semibold tracking-tight">SouvikAI</span>
            )}
        </div>
    );
}

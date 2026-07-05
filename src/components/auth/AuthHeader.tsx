/**
 * AuthHeader — title + supporting text shown above each auth form.
 *
 * Replaces the per-page hand-rolled CardHeader (gradient circle + giant title).
 */
export function AuthHeader({
    title,
    description,
}: {
    title: string;
    description?: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5 mb-7">
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground leading-tight">
                {title}
            </h1>
            {description && (
                <p className="text-[14px] text-foreground-muted leading-relaxed">
                    {description}
                </p>
            )}
        </div>
    );
}

import * as React from 'react';
import { Button } from '@/components/ui';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * OAuthButton — provider-agnostic, monochrome outline button used at the top
 * of sign-in / sign-up forms. Currently used for Google.
 */
interface OAuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    provider: 'google';
    loading?: boolean;
}

export function OAuthButton({
    provider,
    loading,
    children,
    disabled,
    className,
    ...rest
}: OAuthButtonProps) {
    const label = children ?? `Continue with ${PROVIDER_LABEL[provider]}`;

    return (
        <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={disabled || loading}
            className={cn('w-full justify-center gap-2.5 font-normal', className)}
            {...rest}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <ProviderIcon provider={provider} />
            )}
            <span className="text-[14px]">{label}</span>
        </Button>
    );
}

const PROVIDER_LABEL: Record<OAuthButtonProps['provider'], string> = {
    google: 'Google',
};

function ProviderIcon({ provider }: { provider: OAuthButtonProps['provider'] }) {
    if (provider === 'google') {
        return (
            <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.74-6-6.1S8.7 5.9 12 5.9c1.9 0 3.16.8 3.88 1.5l2.65-2.55C16.86 3.32 14.6 2.4 12 2.4 6.74 2.4 2.5 6.6 2.5 12s4.24 9.6 9.5 9.6c5.48 0 9.1-3.85 9.1-9.27 0-.62-.07-1.1-.16-1.57H12z"
                />
                <path
                    fill="#34A853"
                    d="M3.88 7.36l3.07 2.25c.83-1.6 2.36-2.7 4.05-2.7 1.9 0 3.16.8 3.88 1.5l2.65-2.55C16.86 3.32 14.6 2.4 12 2.4c-3.55 0-6.6 2.04-8.12 4.96z"
                />
                <path
                    fill="#FBBC05"
                    d="M12 21.6c2.6 0 4.78-.86 6.37-2.34l-3.07-2.4c-.83.58-1.94.94-3.3.94-2.54 0-4.7-1.7-5.47-4.06l-3.16 2.44C4.97 19.46 8.2 21.6 12 21.6z"
                />
                <path
                    fill="#4285F4"
                    d="M21.1 12.33c0-.62-.07-1.1-.16-1.57H12v3.9h5.5c-.27 1.5-1.7 4.1-5.5 4.1l3.07 2.4C17.78 19.5 21.1 16.4 21.1 12.33z"
                />
            </svg>
        );
    }
    return null;
}

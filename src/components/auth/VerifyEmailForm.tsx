'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { OtpInput } from './OtpInput';
import { AuthHeader } from './AuthHeader';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

const RESEND_COOLDOWN_SECONDS = 30;
const SESSION_PASSWORD_KEY = 'pending_signup_password';

interface VerifyEmailFormProps {
    email: string;
}

export function VerifyEmailForm({ email }: VerifyEmailFormProps) {
    const router = useRouter();
    const { signIn } = useAuth();

    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
    const [sessionMissing, setSessionMissing] = useState(false);

    useEffect(() => {
        const stored = sessionStorage.getItem(SESSION_PASSWORD_KEY);
        if (!stored) setSessionMissing(true);
    }, []);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const handleResend = useCallback(async () => {
        if (cooldown > 0 || isResending) return;
        setIsResending(true);
        setError('');
        try {
            const res = await fetch('/api/auth/send-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error ?? 'Failed to resend code.');
            } else {
                setCooldown(RESEND_COOLDOWN_SECONDS);
                setCode('');
            }
        } finally {
            setIsResending(false);
        }
    }, [cooldown, isResending, email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (code.replace(/\D/g, '').length < 6) {
            setError('Please enter the full 6-digit code.');
            return;
        }

        const password = sessionStorage.getItem(SESSION_PASSWORD_KEY);
        if (!password) {
            setSessionMissing(true);
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/auth/verify-and-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    code: code.replace(/\D/g, ''),
                    password,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error ?? 'Verification failed. Please try again.');
                return;
            }

            sessionStorage.removeItem(SESSION_PASSWORD_KEY);
            setSuccess(true);

            const { error: signInError } = await signIn(email, password);
            if (signInError) {
                router.push('/signin?verified=1');
            } else {
                router.push('/');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (sessionMissing) {
        return (
            <div>
                <AuthHeader
                    title="Session expired"
                    description="Your sign-up session has expired or is invalid. Please start over to get a new verification code."
                />
                <Button asChild variant="outline" size="lg" className="w-full">
                    <Link href="/signup">
                        <ArrowLeft className="h-4 w-4" />
                        Back to sign up
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div>
            <AuthHeader
                title="Check your email"
                description={
                    <>
                        We sent a 6-digit code to{' '}
                        <span className="text-foreground font-medium">{email}</span>. The
                        code expires in 10 minutes.
                    </>
                }
            />

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div
                        role="alert"
                        className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px] text-destructive text-center animate-slide-up"
                    >
                        {error}
                    </div>
                )}

                {success && (
                    <div
                        role="status"
                        className="flex items-center justify-center gap-2 rounded-md border border-success/40 bg-success/5 px-3 py-2 text-[13px] text-success"
                    >
                        <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
                        Verified. Signing you in&hellip;
                    </div>
                )}

                <OtpInput
                    value={code}
                    onChange={setCode}
                    disabled={isSubmitting || success}
                    hasError={!!error}
                />

                <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={
                        isSubmitting ||
                        success ||
                        code.replace(/\D/g, '').length < 6
                    }
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Verifying
                        </>
                    ) : (
                        'Verify & create account'
                    )}
                </Button>

                <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0 || isResending}
                    className="mx-auto flex items-center gap-1.5 text-[13px] text-foreground-muted hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCw
                        className={`h-3.5 w-3.5 ${isResending ? 'animate-spin' : ''}`}
                        strokeWidth={1.5}
                    />
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
            </form>

            <p className="mt-6 text-center text-[13px] text-foreground-muted">
                Wrong email?{' '}
                <Link
                    href="/signup"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                    Start over
                </Link>
            </p>
        </div>
    );
}

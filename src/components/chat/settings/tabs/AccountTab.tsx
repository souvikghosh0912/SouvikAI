/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { Input, Button } from '@/components/ui';
import { Loader2, CheckCircle2, Copy, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SectionLabel, SettingsCard, SettingRow } from '../primitives';

export function AccountTab() {
    const { user, isLoading } = useAuth();
    const [name, setName] = useState('');
    const [isSavingName, setIsSavingName] = useState(false);
    const [nameSaved, setNameSaved] = useState(false);

    const [isSendingReset, setIsSendingReset] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        const fetchUserData = async () => {
            if (user) {
                const {
                    data: { user: supabaseUser },
                } = await supabase.auth.getUser();
                if (supabaseUser?.user_metadata?.display_name) {
                    setName(supabaseUser.user_metadata.display_name);
                } else {
                    setName(user.email.split('@')[0]);
                }
            }
        };
        fetchUserData();
    }, [user, supabase.auth]);

    const handleSaveName = async () => {
        setIsSavingName(true);
        setNameSaved(false);
        setError(null);
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                data: { display_name: name.trim() },
            });
            if (updateError) throw updateError;
            setNameSaved(true);
            setTimeout(() => setNameSaved(false), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to update name');
        } finally {
            setIsSavingName(false);
        }
    };

    const handleSendPasswordReset = async () => {
        setIsSendingReset(true);
        setResetSent(false);
        setError(null);
        try {
            const response = await fetch('/api/settings/password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            setResetSent(true);
            setTimeout(() => setResetSent(false), 5000);
        } catch (err: any) {
            setError(err.message || 'Failed to send password reset');
        } finally {
            setIsSendingReset(false);
        }
    };

    const handleCopyEmail = async () => {
        if (!user) return;
        await navigator.clipboard.writeText(user.email);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isLoading || !user) {
        return (
            <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
            </div>
        );
    }

    return (
        <div className="space-y-1 animate-in fade-in slide-in-from-bottom-1 duration-200 pb-4">
            {error && (
                <div
                    role="alert"
                    className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
                >
                    {error}
                </div>
            )}

            {/* Profile */}
            <SectionLabel>Profile</SectionLabel>
            <SettingsCard>
                <SettingRow
                    label="Email"
                    description="Your email address cannot be changed."
                    control={
                        <button
                            type="button"
                            onClick={handleCopyEmail}
                            className="flex items-center gap-2 h-8 pl-3 pr-2 rounded-md bg-surface-2 border border-border text-[12px] text-foreground hover:bg-surface-3 transition-colors max-w-[260px]"
                            aria-label="Copy email"
                        >
                            <span className="truncate font-mono">{user.email}</span>
                            <span className="flex h-5 w-5 items-center justify-center text-foreground-muted shrink-0">
                                {copied ? (
                                    <Check className="h-3 w-3 text-success" />
                                ) : (
                                    <Copy className="h-3 w-3" strokeWidth={1.5} />
                                )}
                            </span>
                        </button>
                    }
                />
                <SettingRow
                    stacked
                    label="Display name"
                    description="The name shown across your conversations and account."
                    control={
                        <div className="flex items-center gap-2 max-w-sm">
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. John Doe"
                                className="h-8 text-[13px]"
                            />
                            <Button
                                size="sm"
                                onClick={handleSaveName}
                                disabled={isSavingName || !name.trim()}
                                className="shrink-0"
                            >
                                {isSavingName ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : nameSaved ? (
                                    <>
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Saved
                                    </>
                                ) : (
                                    'Save'
                                )}
                            </Button>
                        </div>
                    }
                />
            </SettingsCard>

            {/* Security */}
            <SectionLabel>Security</SectionLabel>
            <SettingsCard>
                <SettingRow
                    stacked
                    label="Password reset"
                    description={
                        <>
                            We&apos;ll send a secure reset link to{' '}
                            <span className="font-medium text-foreground">
                                {user.email}
                            </span>
                            . The link expires after 30 minutes.
                        </>
                    }
                    control={
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleSendPasswordReset}
                            disabled={isSendingReset || resetSent}
                        >
                            {isSendingReset ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Sending
                                </>
                            ) : resetSent ? (
                                <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Reset email sent
                                </>
                            ) : (
                                'Request password reset'
                            )}
                        </Button>
                    }
                />
            </SettingsCard>
        </div>
    );
}

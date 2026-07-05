'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CustomProviderForm, CustomProviderFormValues } from '@/components/admin';

export default function NewCustomProviderPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnTo = searchParams.get('returnTo') || '/admin/models/providers';
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (values: CustomProviderFormValues) => {
        setIsSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/custom-providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Failed to create custom provider');
                return;
            }
            router.push(`${returnTo}?newProviderId=${data.id}&newProviderName=${encodeURIComponent(data.name)}`);
        } catch {
            setError('Failed to create custom provider');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold">Add Custom Provider</h1>
                <p className="text-muted-foreground">Save a reusable third-party API credential to assign to custom models.</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
                <CustomProviderForm
                    isSaving={isSaving}
                    error={error}
                    submitLabel="Create Provider"
                    onSubmit={handleSubmit}
                    onCancel={() => router.push(returnTo)}
                />
            </div>
        </div>
    );
}

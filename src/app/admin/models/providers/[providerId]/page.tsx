'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { CustomProviderForm, CustomProviderFormValues } from '@/components/admin';
import { CustomProvider } from '@/types/chat';
import { Trash2 } from 'lucide-react';

export default function EditCustomProviderPage() {
    const { providerId } = useParams<{ providerId: string }>();
    const router = useRouter();
    const [provider, setProvider] = useState<CustomProvider | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/admin/custom-providers', { cache: 'no-store' })
            .then((res) => res.json())
            .then((data: CustomProvider[]) => {
                const match = Array.isArray(data) ? data.find((p) => p.id === providerId) : null;
                setProvider(match ?? null);
            })
            .catch(() => setError('Failed to load custom provider'))
            .finally(() => setIsLoading(false));
    }, [providerId]);

    const handleSubmit = async (values: CustomProviderFormValues) => {
        setIsSaving(true);
        setError(null);
        try {
            const body: Partial<CustomProviderFormValues> = { ...values };
            if (!body.api_key) delete body.api_key;
            const res = await fetch(`/api/admin/custom-providers/${providerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Failed to update custom provider');
                return;
            }
            router.push('/admin/models/providers');
        } catch {
            setError('Failed to update custom provider');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!provider) return;
        if (!confirm(`Delete custom provider "${provider.name}"? This cannot be undone.`)) return;
        setIsDeleting(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/custom-providers/${providerId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Failed to delete custom provider');
                return;
            }
            router.push('/admin/models/providers');
        } catch {
            setError('Failed to delete custom provider');
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return <p className="text-muted-foreground">Loading provider...</p>;
    }

    if (!provider) {
        return (
            <div className="space-y-4">
                <p className="text-muted-foreground">Custom provider not found.</p>
                <Button variant="outline" onClick={() => router.push('/admin/models/providers')}>
                    Back to Custom Providers
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Edit Custom Provider</h1>
                    <p className="text-muted-foreground">Update this provider&apos;s credentials or delete it.</p>
                </div>
                <Button
                    variant="ghost"
                    onClick={handleDelete}
                    disabled={isDeleting || isSaving}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
                <CustomProviderForm
                    initialValues={{ name: provider.name, base_url: provider.base_url, protocol: provider.protocol }}
                    isEdit
                    isSaving={isSaving}
                    error={error}
                    submitLabel="Save Changes"
                    onSubmit={handleSubmit}
                    onCancel={() => router.push('/admin/models/providers')}
                />
            </div>
        </div>
    );
}

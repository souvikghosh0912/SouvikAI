'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, SimpleTooltip } from '@/components/ui';
import { useAdmin } from '@/hooks/useAdmin';
import { CustomProvider } from '@/types/chat';
import { Pencil, Trash2 } from 'lucide-react';

const PROTOCOL_LABEL: Record<CustomProvider['protocol'], string> = {
    openai: 'OpenAI-compatible',
    anthropic: 'Anthropic-compatible',
    gemini: 'Gemini-compatible',
};

export default function CustomProvidersPage() {
    const router = useRouter();
    const { isEditMode } = useAdmin();
    const [providers, setProviders] = useState<CustomProvider[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchProviders = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/custom-providers', { cache: 'no-store' });
            const data = await res.json();
            setProviders(Array.isArray(data) ? data : []);
        } catch {
            setError('Failed to load custom providers');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProviders();
    }, [fetchProviders]);

    const handleDelete = async (provider: CustomProvider) => {
        if (!confirm(`Delete custom provider "${provider.name}"? This cannot be undone.`)) return;
        setDeletingId(provider.id);
        setError(null);
        try {
            const res = await fetch(`/api/admin/custom-providers/${provider.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Failed to delete custom provider');
                return;
            }
            await fetchProviders();
        } catch {
            setError('Failed to delete custom provider');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Custom Providers</h1>
                    <p className="text-muted-foreground">Manage reusable third-party API credentials for custom models</p>
                </div>
                {isEditMode && (
                    <Button onClick={() => router.push('/admin/models/providers/new')}>Add Provider</Button>
                )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {isLoading ? (
                <p className="text-muted-foreground">Loading...</p>
            ) : providers.length === 0 ? (
                <div className="flex justify-center p-8 bg-card rounded-lg border border-border">
                    <p className="text-muted-foreground">No custom providers configured.</p>
                </div>
            ) : (
                <div className="bg-card rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Name</th>
                                    <th className="px-6 py-3 font-medium">Base URL</th>
                                    <th className="px-6 py-3 font-medium">Format</th>
                                    <th className="px-6 py-3 font-medium">API Key</th>
                                    {isEditMode && <th className="px-6 py-3 text-right font-medium text-destructive">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {providers.map((p) => (
                                    <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 font-medium">{p.name}</td>
                                        <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{p.base_url}</td>
                                        <td className="px-6 py-4">{PROTOCOL_LABEL[p.protocol]}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{p.api_key_masked}</td>
                                        {isEditMode && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <SimpleTooltip content="Edit provider">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={deletingId === p.id}
                                                            onClick={() => router.push(`/admin/models/providers/${p.id}`)}
                                                            className="h-8 w-8 p-0"
                                                            aria-label="Edit provider"
                                                        >
                                                            <Pencil className="h-4 w-4 text-blue-500" />
                                                        </Button>
                                                    </SimpleTooltip>
                                                    <SimpleTooltip content="Delete provider">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={deletingId === p.id}
                                                            onClick={() => handleDelete(p)}
                                                            className="h-8 w-8 p-0"
                                                            aria-label="Delete provider"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </SimpleTooltip>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!isEditMode && (
                <p className="text-sm text-muted-foreground text-center py-4">
                    Enable Edit Mode to modify custom providers
                </p>
            )}
        </div>
    );
}

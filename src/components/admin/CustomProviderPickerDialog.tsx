'use client';

import { useEffect, useState } from 'react';
import {
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui';
import { CustomProvider } from '@/types/chat';
import { Plus } from 'lucide-react';

interface CustomProviderPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (provider: { id: string; name: string }) => void;
    /** Called when the user wants to create a brand-new provider — the caller navigates to the dedicated add-provider page. */
    onAddNew: () => void;
}

const PROTOCOL_LABEL: Record<CustomProvider['protocol'], string> = {
    openai: 'OpenAI-compatible',
    anthropic: 'Anthropic-compatible',
    gemini: 'Gemini-compatible',
};

export function CustomProviderPickerDialog({ open, onOpenChange, onSelect, onAddNew }: CustomProviderPickerDialogProps) {
    const [providers, setProviders] = useState<CustomProvider[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setIsLoadingList(true);
        fetch('/api/admin/custom-providers')
            .then((res) => res.json())
            .then((data) => setProviders(Array.isArray(data) ? data : []))
            .catch(() => setError('Failed to load custom providers'))
            .finally(() => setIsLoadingList(false));
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Choose Custom Provider</DialogTitle>
                </DialogHeader>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="space-y-4 py-2">
                    {isLoadingList ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : providers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No custom providers saved yet.</p>
                    ) : (
                        <div className="space-y-2" role="listbox" aria-label="Saved custom providers">
                            {providers.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => { onSelect({ id: p.id, name: p.name }); onOpenChange(false); }}
                                    className="w-full text-left rounded-lg border border-border px-4 py-2.5 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                >
                                    <div className="font-medium text-sm">{p.name}</div>
                                    <div className="text-xs text-muted-foreground font-mono">{p.base_url}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {PROTOCOL_LABEL[p.protocol]} &middot; {p.api_key_masked}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    <Button variant="outline" className="w-full" onClick={onAddNew}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add new custom provider
                    </Button>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

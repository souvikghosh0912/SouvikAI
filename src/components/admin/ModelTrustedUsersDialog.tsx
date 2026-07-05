'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Input,
    ScrollArea,
} from '@/components/ui';
import { User } from '@/types/auth';
import { Check } from 'lucide-react';

interface ModelTrustedUsersDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedUserIds: string[];
    onChange: (userIds: string[]) => void;
}

export function ModelTrustedUsersDialog({ open, onOpenChange, selectedUserIds, onChange }: ModelTrustedUsersDialogProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [draft, setDraft] = useState<string[]>(selectedUserIds);

    useEffect(() => {
        if (!open) return;
        setDraft(selectedUserIds);
        setSearch('');
        setError(null);
        setIsLoading(true);
        fetch('/api/admin/users', { cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => setUsers(Array.isArray(data) ? data : []))
            .catch(() => setError('Failed to load users'))
            .finally(() => setIsLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const filteredUsers = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return users;
        return users.filter((u) => u.email.toLowerCase().includes(query));
    }, [users, search]);

    const toggleUser = (userId: string) => {
        setDraft((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
    };

    const handleSave = () => {
        onChange(draft);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Configure Selected Users</DialogTitle>
                </DialogHeader>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="space-y-3 py-2">
                    <Input
                        placeholder="Search by email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <ScrollArea className="h-72 pr-3">
                        {isLoading ? (
                            <p className="text-sm text-muted-foreground">Loading...</p>
                        ) : filteredUsers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No users found.</p>
                        ) : (
                            <div className="space-y-2" role="listbox" aria-label="Users">
                                {filteredUsers.map((u) => {
                                    const isTrusted = draft.includes(u.id);
                                    return (
                                        <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => toggleUser(u.id)}
                                            aria-pressed={isTrusted}
                                            className={`w-full text-left rounded-lg border px-4 py-2.5 transition-colors flex items-center justify-between gap-2 ${
                                                isTrusted
                                                    ? 'border-primary/50 bg-primary/5'
                                                    : 'border-border hover:border-primary/50 hover:bg-primary/5'
                                            }`}
                                        >
                                            <span className="text-sm font-medium truncate">{u.email}</span>
                                            {isTrusted && <Check className="h-4 w-4 text-primary shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter className="flex items-center sm:justify-between">
                    <span className="text-sm text-muted-foreground">{draft.length} selected</span>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>Save</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

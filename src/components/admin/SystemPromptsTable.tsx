'use client';

import { useRouter } from 'next/navigation';
import { Button, SimpleTooltip } from '@/components/ui';
import { SystemPrompt } from '@/types/chat';
import { Pencil, Trash2, Star } from 'lucide-react';

interface SystemPromptsTableProps {
    prompts: SystemPrompt[];
    isDeleting: string | null;
    onDelete: (prompt: SystemPrompt) => void;
}

function StatusBadge({ status }: { status: SystemPrompt['status'] }) {
    const className =
        status === 'production'
            ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
            : 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30';
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>
            {status === 'production' ? 'Production' : 'Experimental'}
        </span>
    );
}

export function SystemPromptsTable({ prompts, isDeleting, onDelete }: SystemPromptsTableProps) {
    const router = useRouter();

    if (!prompts || prompts.length === 0) {
        return (
            <div className="flex justify-center p-8 bg-card rounded-lg border border-border">
                <p className="text-muted-foreground">No system prompts configured.</p>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                        <tr>
                            <th className="px-6 py-3 font-medium">Name</th>
                            <th className="px-6 py-3 font-medium">Status</th>
                            <th className="px-6 py-3 font-medium">Assigned Models</th>
                            <th className="px-6 py-3 font-medium">Updated</th>
                            <th className="px-6 py-3 text-right font-medium text-destructive">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {prompts.map((prompt) => (
                            <tr key={prompt.id} className="hover:bg-muted/50 transition-colors">
                                <td className="px-6 py-4 font-medium">
                                    <div className="flex items-center gap-2">
                                        {prompt.name}
                                        {prompt.is_default && (
                                            <SimpleTooltip content="Default prompt — used by any model with no explicit assignment">
                                                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                                            </SimpleTooltip>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={prompt.status} />
                                </td>
                                <td className="px-6 py-4 text-muted-foreground">{prompt.assignedModelCount ?? 0}</td>
                                <td className="px-6 py-4 text-muted-foreground text-xs">
                                    {new Date(prompt.updated_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <SimpleTooltip content="Edit prompt">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={isDeleting === prompt.id}
                                                onClick={() => router.push(`/admin/system-prompts/${prompt.id}`)}
                                                className="h-8 w-8 p-0"
                                                aria-label="Edit prompt"
                                            >
                                                <Pencil className="h-4 w-4 text-blue-500" />
                                            </Button>
                                        </SimpleTooltip>
                                        <SimpleTooltip
                                            content={
                                                prompt.is_default
                                                    ? 'Cannot delete the default prompt'
                                                    : (prompt.assignedModelCount ?? 0) > 0
                                                        ? 'Reassign models before deleting'
                                                        : 'Delete prompt'
                                            }
                                        >
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={
                                                    isDeleting === prompt.id ||
                                                    prompt.is_default ||
                                                    (prompt.assignedModelCount ?? 0) > 0
                                                }
                                                onClick={() => onDelete(prompt)}
                                                className="h-8 w-8 p-0"
                                                aria-label="Delete prompt"
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </SimpleTooltip>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { ModelsTable } from '@/components/admin';
import { useAdmin } from '@/hooks/useAdmin';

export default function AdminModelsPage() {
    const router = useRouter();
    const { models, systemPrompts, isEditMode, updateModel } = useAdmin();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Model Configurations</h1>
                    <p className="text-muted-foreground">Manage available AI models, their identifiers, display names, and quotas</p>
                </div>
                {isEditMode && (
                    <Button onClick={() => router.push('/admin/models/new')}>Add Model</Button>
                )}
            </div>

            <ModelsTable
                models={models}
                systemPrompts={systemPrompts}
                isEditMode={isEditMode}
                onUpdate={updateModel}
            />

            {!isEditMode && (
                <p className="text-sm text-muted-foreground text-center py-4">
                    Enable Edit Mode to modify model configurations
                </p>
            )}
        </div>
    );
}

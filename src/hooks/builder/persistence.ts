import type { BuilderWorkspace } from '@/types/code';

/**
 * Thin wrappers around the workspace REST endpoints used by useBuilderAgent.
 *
 * Each helper is fire-and-forget except `loadWorkspace`, which the hook
 * awaits during hydration. Keeping these here means the hook body never
 * spells out URLs or HTTP verbs — making it easier to add caching, retries,
 * or auth changes in one place later.
 */

export async function loadWorkspace(
    workspaceId: string,
): Promise<{ ok: true; workspace: BuilderWorkspace } | { ok: false; message: string }> {
    let res: Response;
    try {
        res = await fetch(`/api/code/workspaces/${workspaceId}`, { cache: 'no-store' });
    } catch (err) {
        return { ok: false, message: (err as Error)?.message ?? 'Failed to load workspace' };
    }

    if (!res.ok) {
        let msg = `Failed to load workspace (${res.status})`;
        try {
            const data = await res.json();
            if (data?.error) msg = data.error;
        } catch {
            /* ignore */
        }
        return { ok: false, message: msg };
    }

    const data = (await res.json()) as { workspace: BuilderWorkspace };
    return { ok: true, workspace: data.workspace };
}

export function saveActiveFile(workspaceId: string, activeFile: string | null): void {
    fetch(`/api/code/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeFile }),
    }).catch((err) => console.warn('[Builder] save activeFile failed:', err));
}

export function saveFile(workspaceId: string, path: string, content: string): void {
    fetch(`/api/code/workspaces/${workspaceId}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
    }).catch((err) => console.warn('[Builder] save file failed:', err));
}

export async function deleteWorkspaceFile(
    workspaceId: string,
    path: string,
): Promise<void> {
    try {
        await fetch(`/api/code/workspaces/${workspaceId}/files`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path }),
        });
    } catch (err) {
        console.warn('[Builder] delete file failed:', err);
    }
}

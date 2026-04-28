import type {
    BuilderFiles,
    BuilderFileAction,
} from '@/types/code';

/**
 * Pure helpers for the in-memory file map kept by `useBuilderAgent`.
 *
 * Extracted so:
 *   - Reasoning about state transitions doesn't require reading the whole hook.
 *   - The same logic can be unit-tested without React.
 *   - Adding a new action kind only touches this file (plus the agent tools).
 */

export function applyAction(files: BuilderFiles, action: BuilderFileAction): BuilderFiles {
    if (action.kind === 'delete') {
        if (!(action.path in files)) return files;
        const next = { ...files };
        delete next[action.path];
        return next;
    }
    if (action.kind === 'rename') {
        if (action.from === action.to) return files;
        if (!(action.from in files)) {
            // Source missing — nothing to move. The server will no-op too.
            return files;
        }
        const next = { ...files };
        next[action.to] = next[action.from];
        delete next[action.from];
        return next;
    }
    return { ...files, [action.path]: action.content };
}

/**
 * Decide which file should remain active after a server action lands. Tries
 * to keep the user focused on the same logical file (rename → follow), or
 * falls back to the first remaining file when the active one was deleted.
 */
export function nextActiveFile(
    currentActive: string | null,
    nextFiles: BuilderFiles,
    action: BuilderFileAction,
): string | null {
    if (action.kind === 'delete' && currentActive === action.path) {
        const keys = Object.keys(nextFiles);
        return keys[0] ?? null;
    }
    if (action.kind === 'rename' && currentActive === action.from) {
        // Follow the move so the editor stays focused on the same file.
        return action.to;
    }
    if ((action.kind === 'create' || action.kind === 'edit') && !currentActive) {
        return action.path;
    }
    return currentActive;
}

export function genId(prefix = 'm'): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Six-word summary used as the workspace title for a brand-new build. */
export function deriveWorkspaceTitle(message: string): string {
    const words = message.split(/\s+/).slice(0, 6).join(' ');
    return words.length > 50 ? words.slice(0, 50) + '…' : words || 'New build';
}

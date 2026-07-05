/**
 * Builder agent — tool contracts.
 *
 * Each "tool" the agent can use lives in its own module under this folder:
 *
 *   • milestone.ts — `<milestone>` progress label
 *   • read.ts      — `<read path="..." />` file-read tool call
 *   • create.ts    — `<action type="create" ...>` (file action subtool)
 *   • edit.ts      — `<action type="edit"   ...>` (file action subtool)
 *   • delete.ts    — `<action type="delete" .../>` (file action subtool)
 *   • rename.ts    — `<action type="rename" .../>` (file action subtool)
 *   • action.ts    — the shared `<action>` tag parser that dispatches to the
 *                    four file-action subtools above by their `type` attr.
 *
 * The interfaces below are the contract every tool implements. Splitting them
 * lets us (a) compose the system prompt by joining each tool's docs, (b) parse
 * the streamed model output by walking a registry of tag patterns, and (c)
 * persist file actions through subtype-specific executors.
 */
import type { BuilderFileAction, BuilderStreamEvent } from '@/types/code';
import type { createClient } from '@/lib/supabase/server';

/** The cookie-bound server Supabase client used by every executor. */
export type DB = Awaited<ReturnType<typeof createClient>>;

/**
 * Result of attempting to parse a tool tag from the start (`offset 0`) of
 * a string slice.
 */
export type ParseAttempt =
    /** A complete tag was parsed; emit `event` (or null if the tag was malformed and should be dropped). */
    | { status: 'complete'; event: BuilderStreamEvent | null; consumed: number }
    /** The tag has begun but is not yet complete — caller should buffer more input. */
    | { status: 'partial' }
    /** This tool's tag does not begin at offset 0 — caller should try the next tool. */
    | { status: 'no-match' };

/**
 * A tool that can be parsed out of the raw model output stream.
 *
 * Tools are tried in registration order. The parser walks the buffer, finds
 * the earliest matching tag-start across all tools (via {@link tagStartPattern}),
 * then calls {@link parse} on each tool until one returns `complete` or
 * `partial`.
 */
export interface ParseableTool {
    /** Stable identifier (used for logging). */
    id: string;
    /**
     * A `/g/i` regex used to scan the buffer for the EARLIEST occurrence of
     * this tool's tag-start. Must match the open delimiter only (e.g.
     * `/<milestone[\s>/]/gi`) — `parse` is what actually consumes the full tag.
     */
    tagStartPattern: RegExp;
    /**
     * Try to parse a complete tag from offset 0 of `rest`. See {@link ParseAttempt}.
     */
    parse(rest: string, final: boolean): ParseAttempt;
}

/** A tool that contributes a documentation block to the system prompt. */
export interface PromptTool {
    /** Section heading + body inserted into the system prompt's TOOLS section. */
    promptSection: string;
}

/**
 * A file-action subtool — one of `create | edit | delete | rename`. These all
 * share the `<action>` tag namespace; the `<action>` parser dispatches to the
 * right subtool by inspecting the `type` attribute.
 */
export interface FileActionTool extends PromptTool {
    /** The value of the `type=` attribute that identifies this subtool. */
    actionType: BuilderFileAction['kind'];
    /** True if this subtool is always self-closing (e.g. `delete`, `rename`). */
    selfClosing: boolean;
    /**
     * Build a typed {@link BuilderFileAction} from raw attributes + (optional)
     * body. Returns null if the attributes are malformed.
     */
    buildAction(
        attrs: Record<string, string>,
        body: string,
    ): BuilderFileAction | null;
    /**
     * Persist the action to the workspace's database state.
     * Implementations should be idempotent where possible.
     */
    execute(supabase: DB, workspaceId: string, action: BuilderFileAction): Promise<void>;
}

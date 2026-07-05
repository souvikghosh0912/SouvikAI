/**
 * Builder tool registry.
 *
 * The single entry point used by:
 *   • parser.ts        — walks {@link PARSEABLE_TOOLS} to extract events from
 *                        the model's streamed output.
 *   • system-prompt.ts — joins {@link PROMPT_TOOLS}'s `promptSection`s into
 *                        the TOOLS section of the system prompt.
 *   • db.ts            — uses {@link executeFileAction} to dispatch each
 *                        parsed action to the right subtool's executor.
 *
 * Adding a new tool? Drop a new file alongside this one, add it to the right
 * arrays below, and that's it — the parser, prompt, and executor will pick
 * it up automatically.
 */
import { milestoneTool } from './milestone';
import { readTool } from './read';
import { actionTool, executeFileAction, FILE_ACTION_TOOLS } from './action';
import type { ParseableTool, PromptTool } from './types';

/**
 * Tools the parser scans for in registration order. Tool tag-starts are
 * required to be mutually exclusive (no shared prefixes), so the order here
 * does not affect correctness — only the first-match priority when a buffer
 * happens to contain multiple tag-starts at the same offset (which the
 * parser walks via earliest-index lookup anyway).
 */
export const PARSEABLE_TOOLS: ParseableTool[] = [
    milestoneTool,
    actionTool,
    readTool,
];

/**
 * Tools whose `promptSection` is concatenated into the TOOLS section of the
 * system prompt. Order is the order they appear in the prompt.
 */
export const PROMPT_TOOLS: PromptTool[] = [
    milestoneTool,
    actionTool, // bundles create / edit / delete / rename docs
    readTool,
];

export {
    milestoneTool,
    readTool,
    actionTool,
    executeFileAction,
    FILE_ACTION_TOOLS,
};
export { renderReadToolResult } from './read';
export type { ParseableTool, PromptTool, FileActionTool, ParseAttempt, DB } from './types';

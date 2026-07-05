/**
 * Shared parsing + content helpers used by every Builder tool.
 *
 * Kept separate from individual tool files so they are trivially unit-testable
 * and can't accumulate tool-specific quirks.
 */

/** Hard cap on file content persisted from a single agent action. */
export const MAX_FILE_BYTES = 256 * 1024;

/** Truncate model-emitted file content before persisting. */
export function clampContent(content: string): string {
    if (content.length <= MAX_FILE_BYTES) return content;
    return content.slice(0, MAX_FILE_BYTES) + '\n/* [truncated] */\n';
}

/**
 * Parse a `key="value"` attribute list out of the part of a tag between the
 * tag name and the closing `>` / `/>`. Quoted values only — unquoted attrs are
 * not supported (the agent always emits quoted attrs).
 */
export function parseAttrs(s: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const re = /(\w+)\s*=\s*"([^"]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
        attrs[m[1].toLowerCase()] = m[2];
    }
    return attrs;
}

/** Strip a leading/trailing `<![CDATA[ ... ]]>` wrapper if present. */
export function stripCDATA(s: string): string {
    const m = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/i.exec(s);
    return m ? m[1] : s;
}

/**
 * Strip leading slashes and reject path-traversal attempts. Paths in the
 * virtual filesystem are stored as relative POSIX paths.
 */
export function sanitizePath(p: string): string {
    const trimmed = p.trim().replace(/^\/+/, '').replace(/\\/g, '/');
    if (!trimmed) return '';
    if (trimmed.split('/').some((seg) => seg === '..')) return '';
    return trimmed;
}

/** Trim a single leading newline and trailing whitespace from action bodies. */
export function trimActionBody(body: string): string {
    return body.replace(/^\r?\n/, '').replace(/\r?\n\s*$/, '');
}

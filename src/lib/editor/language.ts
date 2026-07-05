import type { Extension } from '@codemirror/state';

/**
 * Maps a file extension to a CodeMirror language extension via dynamic
 * import, so each language's grammar is only loaded when first needed.
 * Returns `null` for unrecognised extensions, in which case the editor
 * runs without syntax highlighting.
 */
export async function loadLanguage(path: string | null): Promise<Extension | null> {
    if (!path) return null;
    const ext = path.split('.').pop()?.toLowerCase() ?? '';

    switch (ext) {
        case 'ts':
        case 'tsx':
        case 'js':
        case 'jsx':
        case 'mjs':
        case 'cjs': {
            const { javascript } = await import('@codemirror/lang-javascript');
            return javascript({
                jsx: ext === 'tsx' || ext === 'jsx',
                typescript: ext === 'ts' || ext === 'tsx',
            });
        }
        case 'css':
        case 'scss':
        case 'less': {
            const { css } = await import('@codemirror/lang-css');
            return css();
        }
        case 'html':
        case 'htm': {
            const { html } = await import('@codemirror/lang-html');
            return html();
        }
        case 'json':
        case 'jsonc': {
            const { json } = await import('@codemirror/lang-json');
            return json();
        }
        case 'md':
        case 'mdx':
        case 'markdown': {
            const { markdown } = await import('@codemirror/lang-markdown');
            return markdown();
        }
        case 'py': {
            const { python } = await import('@codemirror/lang-python');
            return python();
        }
        case 'rs': {
            const { rust } = await import('@codemirror/lang-rust');
            return rust();
        }
        case 'sql': {
            const { sql } = await import('@codemirror/lang-sql');
            return sql();
        }
        case 'yaml':
        case 'yml': {
            const { yaml } = await import('@codemirror/lang-yaml');
            return yaml();
        }
        case 'xml':
        case 'svg': {
            const { xml } = await import('@codemirror/lang-xml');
            return xml();
        }
    }

    return null;
}

/** Human-readable language label for the status bar. */
export function languageLabel(path: string | null): string {
    if (!path) return 'Plaintext';
    const ext = path.split('.').pop()?.toLowerCase() ?? '';
    const map: Record<string, string> = {
        ts: 'TypeScript',
        tsx: 'TypeScript React',
        js: 'JavaScript',
        jsx: 'JavaScript React',
        mjs: 'JavaScript',
        cjs: 'JavaScript',
        py: 'Python',
        rs: 'Rust',
        go: 'Go',
        html: 'HTML',
        htm: 'HTML',
        css: 'CSS',
        scss: 'SCSS',
        less: 'Less',
        json: 'JSON',
        jsonc: 'JSON with Comments',
        md: 'Markdown',
        mdx: 'MDX',
        markdown: 'Markdown',
        sql: 'SQL',
        sh: 'Shell',
        bash: 'Bash',
        yaml: 'YAML',
        yml: 'YAML',
        java: 'Java',
        xml: 'XML',
        svg: 'SVG',
        graphql: 'GraphQL',
        toml: 'TOML',
        ini: 'INI',
        env: 'Env',
    };
    return map[ext] ?? 'Plaintext';
}

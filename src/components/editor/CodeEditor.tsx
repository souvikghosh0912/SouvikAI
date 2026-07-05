'use client';

import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { File } from 'lucide-react';
import { Compartment, EditorState, Prec } from '@codemirror/state';
import {
    EditorView,
    keymap,
    lineNumbers,
    highlightActiveLine,
    highlightActiveLineGutter,
    drawSelection,
    dropCursor,
    rectangularSelection,
    crosshairCursor,
    highlightSpecialChars,
} from '@codemirror/view';
import {
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab,
} from '@codemirror/commands';
import {
    syntaxHighlighting,
    indentOnInput,
    bracketMatching,
    foldGutter,
    foldKeymap,
    indentUnit,
} from '@codemirror/language';
import {
    searchKeymap,
    highlightSelectionMatches,
    search,
} from '@codemirror/search';
import {
    autocompletion,
    closeBrackets,
    closeBracketsKeymap,
    completionKeymap,
} from '@codemirror/autocomplete';
import { editorHighlightStyle } from '@/lib/editor/highlight-style';
import { loadLanguage } from '@/lib/editor/language';
import { useEditorSettings } from './EditorSettingsProvider';

interface CodeEditorProps {
    path: string | null;
    value: string;
    onChange: (content: string) => void;
    onPositionChange?: (line: number, col: number) => void;
    /** Optional ref for the host element so the parent can read scroll
        position (used by the Minimap). */
    hostRef?: React.RefObject<HTMLDivElement>;
}

export interface CodeEditorHandle {
    focus(): void;
    openSearch(): void;
    /** Trigger the named CodeMirror command. Used by the command palette. */
    runCommand(name: 'search' | 'replace' | 'gotoLine' | 'foldAll' | 'unfoldAll'): void;
}

/**
 * CodeMirror 6 editor. Boots once, then reconfigures language / theme /
 * settings via {@link Compartment}s instead of being torn down on each
 * change. Document state is owned by the parent — local edits flow out
 * through `onChange`, and external (AI-streamed) updates flow in via the
 * `value` prop.
 */
export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
    { path, value, onChange, onPositionChange, hostRef: externalHostRef },
    ref,
) {
    const internalHostRef = useRef<HTMLDivElement>(null);
    const hostRef = externalHostRef ?? internalHostRef;
    const viewRef = useRef<EditorView | null>(null);

    const { settings } = useEditorSettings();

    // Stable refs for callbacks so the editor doesn't have to be rebuilt
    // when the parent re-renders.
    const onChangeRef = useRef(onChange);
    const onPosRef = useRef(onPositionChange);
    onChangeRef.current = onChange;
    onPosRef.current = onPositionChange;

    // Compartments for hot-swappable extensions.
    const langComp = useRef(new Compartment());
    const tabComp = useRef(new Compartment());
    const wrapComp = useRef(new Compartment());
    const lineNumComp = useRef(new Compartment());
    const activeLineComp = useRef(new Compartment());
    const fontComp = useRef(new Compartment());

    // Build the view once.
    useEffect(() => {
        if (!hostRef.current) return;
        if (viewRef.current) return;

        const updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                onChangeRef.current(update.state.doc.toString());
            }
            if (update.selectionSet || update.docChanged) {
                const head = update.state.selection.main.head;
                const line = update.state.doc.lineAt(head);
                onPosRef.current?.(line.number, head - line.from + 1);
            }
        });

        const state = EditorState.create({
            doc: value,
            extensions: [
                lineNumComp.current.of(settings.lineNumbers ? lineNumbers() : []),
                highlightActiveLineGutter(),
                highlightSpecialChars(),
                history(),
                foldGutter(),
                drawSelection(),
                dropCursor(),
                EditorState.allowMultipleSelections.of(true),
                indentOnInput(),
                tabComp.current.of([
                    indentUnit.of(
                        settings.insertSpaces ? ' '.repeat(settings.tabSize) : '\t',
                    ),
                    EditorState.tabSize.of(settings.tabSize),
                ]),
                wrapComp.current.of(settings.wordWrap ? EditorView.lineWrapping : []),
                fontComp.current.of(
                    EditorView.theme({
                        '&': { fontSize: `${settings.fontSize}px` },
                    }),
                ),
                syntaxHighlighting(editorHighlightStyle, { fallback: true }),
                bracketMatching(),
                closeBrackets(),
                autocompletion({ activateOnTyping: true }),
                rectangularSelection(),
                crosshairCursor(),
                activeLineComp.current.of(
                    settings.highlightActiveLine ? highlightActiveLine() : [],
                ),
                highlightSelectionMatches(),
                search({ top: true }),
                Prec.high(
                    keymap.of([
                        ...closeBracketsKeymap,
                        ...defaultKeymap,
                        ...searchKeymap,
                        ...historyKeymap,
                        ...foldKeymap,
                        ...completionKeymap,
                        indentWithTab,
                    ]),
                ),
                EditorView.contentAttributes.of({
                    'aria-label': path
                        ? `Code editor: ${path}`
                        : 'Code editor',
                    'aria-multiline': 'true',
                    'aria-describedby': 'editor-status-bar',
                    role: 'textbox',
                }),
                EditorView.editorAttributes.of({
                    'aria-roledescription': 'code editor',
                }),
                langComp.current.of([]),
                updateListener,
            ],
        });

        const view = new EditorView({ state, parent: hostRef.current });
        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync external value -> view (e.g. AI streams new content for the
    // active file). Skipped when the doc already matches to avoid
    // looping with our own onChange.
    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        const current = view.state.doc.toString();
        if (current === value) return;
        view.dispatch({
            changes: { from: 0, to: current.length, insert: value },
        });
    }, [value]);

    // Reset history & cursor when switching files.
    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        view.dispatch({
            selection: { anchor: 0 },
            scrollIntoView: true,
        });
        // Force a fresh history boundary so undo doesn't bridge files.
        view.dispatch({ userEvent: 'select.pointer' });
    }, [path]);

    // Reload language on path change.
    useEffect(() => {
        let cancelled = false;
        loadLanguage(path).then((ext) => {
            if (cancelled) return;
            const view = viewRef.current;
            if (!view) return;
            view.dispatch({
                effects: langComp.current.reconfigure(ext ? [ext] : []),
            });
        });
        return () => {
            cancelled = true;
        };
    }, [path]);

    // Re-apply settings when they change.
    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        view.dispatch({
            effects: [
                lineNumComp.current.reconfigure(
                    settings.lineNumbers ? lineNumbers() : [],
                ),
                tabComp.current.reconfigure([
                    indentUnit.of(
                        settings.insertSpaces ? ' '.repeat(settings.tabSize) : '\t',
                    ),
                    EditorState.tabSize.of(settings.tabSize),
                ]),
                wrapComp.current.reconfigure(
                    settings.wordWrap ? EditorView.lineWrapping : [],
                ),
                activeLineComp.current.reconfigure(
                    settings.highlightActiveLine ? highlightActiveLine() : [],
                ),
                fontComp.current.reconfigure(
                    EditorView.theme({
                        '&': { fontSize: `${settings.fontSize}px` },
                    }),
                ),
            ],
        });
    }, [
        settings.lineNumbers,
        settings.tabSize,
        settings.insertSpaces,
        settings.wordWrap,
        settings.highlightActiveLine,
        settings.fontSize,
    ]);

    useImperativeHandle(ref, () => ({
        focus() {
            viewRef.current?.focus();
        },
        openSearch() {
            const view = viewRef.current;
            if (!view) return;
            // Lazy import to avoid a hard dependency at module load.
            import('@codemirror/search').then(({ openSearchPanel }) => {
                openSearchPanel(view);
            });
        },
        runCommand(name) {
            const view = viewRef.current;
            if (!view) return;
            import('@codemirror/search').then((s) => {
                if (name === 'search') s.openSearchPanel(view);
                if (name === 'replace') {
                    s.openSearchPanel(view);
                    // Replace toggle is handled inside CM's panel UI.
                }
                if (name === 'gotoLine') s.gotoLine(view);
            });
            if (name === 'foldAll') {
                import('@codemirror/language').then((l) => l.foldAll(view));
            }
            if (name === 'unfoldAll') {
                import('@codemirror/language').then((l) => l.unfoldAll(view));
            }
        },
    }));

    if (!path) {
        return (
            <div
                className="flex-1 flex items-center justify-center bg-editor-bg text-editor-fg-muted text-[13px]"
                role="status"
            >
                <div className="flex flex-col items-center gap-2">
                    <File className="h-5 w-5" aria-hidden="true" />
                    <span>Select a file to start editing</span>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={hostRef}
            className="flex-1 min-h-0 min-w-0 overflow-hidden bg-editor-bg"
        />
    );
});

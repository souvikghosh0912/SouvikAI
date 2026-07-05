'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Map as MapIcon } from 'lucide-react';

interface MinimapProps {
    /** Ref to the host div that wraps the CodeMirror view. */
    editorHostRef: React.RefObject<HTMLDivElement | null>;
    content: string;
    isVisible: boolean;
    onToggle: () => void;
}

const SCALE = 0.18;

/**
 * Lightweight scrollbar-style minimap. Reads the scroll position from
 * CodeMirror's internal `.cm-scroller` element and renders a scaled
 * plain-text preview of the document.
 *
 * The preview deliberately drops syntax highlighting — the previous
 * implementation re-tokenised the entire document on every keystroke
 * via `react-syntax-highlighter`, which got expensive on large files
 * and hurt typing latency. A monochrome silhouette is enough for the
 * "where am I in this file" use case.
 *
 * Marked `aria-hidden` because all its information (current line,
 * scroll position) is already exposed through the editor itself and
 * the StatusBar.
 */
export function Minimap({ editorHostRef, content, isVisible, onToggle }: MinimapProps) {
    const minimapRef = useRef<HTMLDivElement>(null);
    const [viewport, setViewport] = useState({ top: 0, height: 0 });
    const isDragging = useRef(false);

    const getScroller = useCallback(() => {
        return editorHostRef.current?.querySelector<HTMLElement>('.cm-scroller') ?? null;
    }, [editorHostRef]);

    const updateViewport = useCallback(() => {
        const scroller = getScroller();
        const mm = minimapRef.current;
        if (!scroller || !mm) return;
        const ratio = mm.clientHeight / scroller.scrollHeight || 1;
        setViewport({
            top: scroller.scrollTop * ratio,
            height: Math.max(scroller.clientHeight * ratio, 24),
        });
    }, [getScroller]);

    useEffect(() => {
        if (!isVisible) return;
        const scroller = getScroller();
        if (!scroller) {
            // The editor may not have mounted yet — retry on the next tick.
            const id = window.setTimeout(updateViewport, 50);
            return () => window.clearTimeout(id);
        }
        scroller.addEventListener('scroll', updateViewport, { passive: true });
        const ro = new ResizeObserver(updateViewport);
        ro.observe(scroller);
        updateViewport();
        return () => {
            scroller.removeEventListener('scroll', updateViewport);
            ro.disconnect();
        };
    }, [getScroller, updateViewport, isVisible, content]);

    const scrollTo = useCallback(
        (clientY: number) => {
            const scroller = getScroller();
            const mm = minimapRef.current;
            if (!scroller || !mm) return;
            const rect = mm.getBoundingClientRect();
            const ratio = (clientY - rect.top) / rect.height;
            scroller.scrollTop =
                Math.max(0, ratio * scroller.scrollHeight - scroller.clientHeight / 2);
        },
        [getScroller],
    );

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => scrollTo(e.clientY);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            isDragging.current = true;

            const move = (me: MouseEvent) => {
                if (!isDragging.current) return;
                scrollTo(me.clientY);
            };
            const up = () => {
                isDragging.current = false;
                window.removeEventListener('mousemove', move);
            };
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up, { once: true });
        },
        [scrollTo],
    );

    return (
        <div
            className="flex flex-col border-l border-editor-border bg-editor-bg shrink-0"
            aria-hidden="true"
        >
            <button
                onClick={onToggle}
                title={isVisible ? 'Hide minimap' : 'Show minimap'}
                className="flex items-center justify-center w-6 h-6 m-1 text-editor-fg-muted hover:text-editor-fg rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-editor-accent"
            >
                <MapIcon className="w-3.5 h-3.5" />
            </button>

            {isVisible && (
                <div
                    ref={minimapRef}
                    className="relative flex-1 overflow-hidden cursor-pointer select-none"
                    style={{ width: 100 }}
                    onClick={handleClick}
                >
                    {/* Scaled document silhouette */}
                    <pre
                        className="absolute top-0 left-0 origin-top-left pointer-events-none text-editor-fg-muted whitespace-pre"
                        style={{
                            transform: `scale(${SCALE})`,
                            transformOrigin: 'top left',
                            width: `${100 / SCALE}%`,
                            fontSize: 11,
                            lineHeight: '14px',
                            padding: '8px',
                            margin: 0,
                            opacity: 0.6,
                        }}
                    >
                        {content}
                    </pre>

                    {/* Viewport indicator */}
                    <div
                        className="absolute left-0 right-0 bg-editor-fg/10 border border-editor-fg/20 rounded-sm cursor-ns-resize"
                        style={{ top: viewport.top, height: viewport.height }}
                        onMouseDown={handleMouseDown}
                    />
                </div>
            )}
        </div>
    );
}

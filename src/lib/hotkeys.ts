'use client';

import { useEffect, useRef } from 'react';

/**
 * Tiny declarative hotkey hook. Each binding's `keys` is a chord string
 * such as `mod+s`, `mod+shift+p`, `alt+arrowup`, `f1`. Use `mod` to
 * match Cmd on macOS and Ctrl elsewhere.
 *
 * Bindings fire on `keydown` at window scope. By default, presses
 * inside an input/textarea/contenteditable are ignored unless the
 * binding sets `allowInInput: true`. Each fired handler gets
 * `preventDefault()` called for it; pass `preventDefault: false` to
 * opt out.
 */
export interface Hotkey {
    /** Chord string. Multiple chords can be passed as an array. */
    keys: string | string[];
    handler: (e: KeyboardEvent) => void;
    /** Optional human-readable label, used by the command palette. */
    description?: string;
    /** Allow the binding to fire while focus is in an input. Default: false. */
    allowInInput?: boolean;
    /** Opt out of preventDefault. Default: true. */
    preventDefault?: boolean;
    /** Disable a binding without removing the call. */
    enabled?: boolean;
}

function parseChord(chord: string) {
    const parts = chord.toLowerCase().trim().split('+').map((s) => s.trim());
    const key = parts[parts.length - 1];
    const mods = new Set(parts.slice(0, -1));
    return {
        key,
        mod: mods.has('mod'),
        ctrl: mods.has('ctrl'),
        meta: mods.has('meta') || mods.has('cmd'),
        shift: mods.has('shift'),
        alt: mods.has('alt') || mods.has('option'),
    };
}

const isMac =
    typeof navigator !== 'undefined' &&
    /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent || '');

function matches(e: KeyboardEvent, chord: string): boolean {
    const c = parseChord(chord);
    const key = e.key.toLowerCase();
    if (key !== c.key) return false;

    const wantMeta = c.mod ? isMac : c.meta;
    const wantCtrl = c.mod ? !isMac : c.ctrl;

    if (e.metaKey !== wantMeta) return false;
    if (e.ctrlKey !== wantCtrl) return false;
    if (e.shiftKey !== c.shift) return false;
    if (e.altKey !== c.alt) return false;
    return true;
}

function isInputTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (target.isContentEditable) return true;
    // CodeMirror's editable surface lives inside .cm-content with
    // contenteditable=true so the check above already catches it.
    return false;
}

export function useHotkeys(bindings: Hotkey[]) {
    // Mirror bindings into a ref so the listener can be installed once
    // and not re-bind on every render.
    const bindingsRef = useRef<Hotkey[]>(bindings);
    bindingsRef.current = bindings;

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            for (const b of bindingsRef.current) {
                if (b.enabled === false) continue;

                const chords = Array.isArray(b.keys) ? b.keys : [b.keys];
                if (!chords.some((c) => matches(e, c))) continue;

                if (!b.allowInInput && isInputTarget(e.target)) continue;

                if (b.preventDefault !== false) e.preventDefault();
                b.handler(e);
                return;
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);
}

/** Format a chord for display, e.g. "mod+shift+p" → "⌘ ⇧ P". */
export function formatChord(chord: string): string {
    const c = parseChord(chord);
    const out: string[] = [];
    if (c.mod || c.meta) out.push(isMac ? '⌘' : 'Ctrl');
    if (c.mod && !isMac) {
        // already pushed Ctrl
    } else if (c.ctrl && !c.mod) {
        out.push('Ctrl');
    }
    if (c.alt) out.push(isMac ? '⌥' : 'Alt');
    if (c.shift) out.push(isMac ? '⇧' : 'Shift');
    out.push(c.key.length === 1 ? c.key.toUpperCase() : prettyKey(c.key));
    return out.join(' ');
}

function prettyKey(key: string): string {
    const map: Record<string, string> = {
        arrowup: '↑',
        arrowdown: '↓',
        arrowleft: '←',
        arrowright: '→',
        enter: '↵',
        escape: 'Esc',
        backspace: '⌫',
        delete: 'Del',
        tab: 'Tab',
        ' ': 'Space',
        space: 'Space',
    };
    return map[key] ?? key.toUpperCase();
}

import { HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/**
 * CodeMirror highlight style bound to the editor design tokens declared in
 * globals.css. Because every color is an `hsl(var(--editor-syntax-*))`
 * reference, switching between light, dark, and high-contrast themes is a
 * pure CSS operation — no editor reload needed.
 */
export const editorHighlightStyle = HighlightStyle.define([
    { tag: t.keyword, color: 'hsl(var(--editor-syntax-keyword))' },
    { tag: t.controlKeyword, color: 'hsl(var(--editor-syntax-keyword))' },
    { tag: t.moduleKeyword, color: 'hsl(var(--editor-syntax-keyword))' },
    { tag: t.definitionKeyword, color: 'hsl(var(--editor-syntax-keyword))' },
    {
        tag: [t.string, t.special(t.string), t.regexp],
        color: 'hsl(var(--editor-syntax-string))',
    },
    {
        tag: [t.number, t.bool, t.null, t.atom],
        color: 'hsl(var(--editor-syntax-number))',
    },
    {
        tag: [t.lineComment, t.blockComment, t.docComment, t.comment],
        color: 'hsl(var(--editor-syntax-comment))',
        fontStyle: 'italic',
    },
    {
        tag: [t.function(t.variableName), t.function(t.propertyName)],
        color: 'hsl(var(--editor-syntax-function))',
    },
    {
        tag: [t.typeName, t.className, t.namespace],
        color: 'hsl(var(--editor-syntax-type))',
    },
    { tag: t.variableName, color: 'hsl(var(--editor-syntax-variable))' },
    { tag: t.tagName, color: 'hsl(var(--editor-syntax-tag))' },
    { tag: t.attributeName, color: 'hsl(var(--editor-syntax-attr))' },
    { tag: t.propertyName, color: 'hsl(var(--editor-syntax-property))' },
    {
        tag: [t.operator, t.operatorKeyword, t.compareOperator],
        color: 'hsl(var(--editor-syntax-operator))',
    },
    { tag: t.heading, color: 'hsl(var(--editor-syntax-keyword))', fontWeight: '600' },
    { tag: t.strong, fontWeight: '600' },
    { tag: t.emphasis, fontStyle: 'italic' },
    {
        tag: t.link,
        color: 'hsl(var(--editor-syntax-function))',
        textDecoration: 'underline',
    },
    { tag: t.url, color: 'hsl(var(--editor-syntax-string))' },
    { tag: t.invalid, color: 'hsl(var(--destructive))' },
    { tag: t.meta, color: 'hsl(var(--editor-syntax-comment))' },
    { tag: t.punctuation, color: 'hsl(var(--editor-fg-subtle))' },
    { tag: t.bracket, color: 'hsl(var(--editor-fg-subtle))' },
]);

'use client';

import { Avatar, AvatarFallback } from '@/components/ui';
import ShinyText from '@/components/ui/ShinyText';
import { useChatPreferences } from '@/hooks/useChatPreferences';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Bot, User, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';
import { MessageActions } from './MessageActions';
import { WebSearchIndicator } from './WebSearchIndicator';
// Prism renderer — smaller bundle than highlight.js, better language auto-detection
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formats a Date as a human-readable timestamp string.
 * Today → time only (e.g. "3:42 PM"); older → date + time.
 */
function formatTimestamp(date: Date): string {
    const now = new Date();
    const isToday =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();

    if (isToday) {
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
        ' · ' +
        date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Detects the language from a fenced-code className like "language-typescript".
 * Falls back to "text" so SyntaxHighlighter still renders cleanly.
 */
function extractLang(className?: string): string {
    if (!className) return 'text';
    const match = className.match(/language-(\w+)/);
    return match?.[1] ?? 'text';
}

// ── Component ─────────────────────────────────────────────────────────────────

interface MessageBubbleProps {
    message: Message;
    isLoading?: boolean;
    /** Called when the user requests a fresh response for this assistant message. */
    onRegenerate?: (assistantMessageId: string) => void;
}

export function MessageBubble({ message, isLoading, onRegenerate }: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const { preferences } = useChatPreferences();
    const [copied, setCopied] = useState<string | null>(null);
    const [isThoughtExpanded, setIsThoughtExpanded] = useState(false);

    // Timer state for thinking duration
    const [thoughtStartTime] = useState<number>(Date.now());
    const [thoughtDurationMs, setThoughtDurationMs] = useState<number | null>(null);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(text);
        setTimeout(() => setCopied(null), 2000);
    };

    let displayContent = message.content;
    let isThinking = false;
    let thinkContent = '';

    if (!isUser) {
        // Extract all completely closed think blocks
        const closedThinkMatches = Array.from(displayContent.matchAll(/<think>([\s\S]*?)<\/think>\s*/gi));
        for (const match of closedThinkMatches) {
            thinkContent += match[1].trim() + '\n\n';
        }

        // Remove completely closed think blocks from displayContent
        displayContent = displayContent.replace(/<think>[\s\S]*?<\/think>\s*/gi, '');

        // Check for an unclosed think block
        const openThinkMatch = displayContent.match(/<think>([\s\S]*)$/i);
        if (openThinkMatch) {
            isThinking = true;
            thinkContent += openThinkMatch[1].trim() + '\n\n';
            displayContent = displayContent.substring(0, openThinkMatch.index);
        }

        thinkContent = thinkContent.trim();

        // Hide partial opening tags while streaming starts to prevent flickering
        const trimmed = displayContent.trim();
        if (['<', '<t', '<th', '<thi', '<thin'].includes(trimmed)) {
            isThinking = true;
            displayContent = '';
        }
    }

    const hasThought = thinkContent.length > 0;
    // Suppress the generic Thinking… indicator while web search is in progress —
    // the WebSearchIndicator shimmer replaces it.
    const isWebSearching = !isUser && message.webSearch?.status === 'searching';
    const showThinkingIndicator = !isWebSearching &&
        ((isLoading && !displayContent && !hasThought) || isThinking || hasThought);

    // Track when thinking finishes to lock in the duration
    if (hasThought && !isThinking && thoughtDurationMs === null) {
        setThoughtDurationMs(Date.now() - thoughtStartTime);
    }

    const renderThinkingToggle = () => {
        if (!showThinkingIndicator) return null;

        if (isThinking || (isLoading && !hasThought)) {
            return (
                <div
                    className="py-1 animate-fade-in cursor-pointer order-first mb-2"
                    onClick={() => hasThought && setIsThoughtExpanded(!isThoughtExpanded)}
                >
                    <ShinyText
                        text={isThoughtExpanded && hasThought ? thinkContent : 'Thinking...'}
                        speed={2.5}
                        delay={0.4}
                        color="#6b6b6b"
                        shineColor="#e0e0e0"
                        spread={90}
                        className="text-sm font-medium whitespace-pre-wrap"
                    />
                </div>
            );
        }

        const seconds = Math.max(1, Math.floor((thoughtDurationMs ?? 0) / 1000));
        const durationText = seconds >= 60
            ? `${Math.floor(seconds / 60)} minute${Math.floor(seconds / 60) > 1 ? 's' : ''}`
            : `${seconds} second${seconds > 1 ? 's' : ''}`;

        return (
            <div
                className="py-1 animate-fade-in cursor-pointer order-first mb-2"
                onClick={() => setIsThoughtExpanded(!isThoughtExpanded)}
            >
                <div className="text-sm font-medium text-foreground whitespace-pre-wrap">
                    {isThoughtExpanded ? thinkContent : `Thought for ${durationText}`}
                </div>
            </div>
        );
    };

    // ── Timestamp ─────────────────────────────────────────────────────────────
    // Show as a CSS tooltip via title + a custom span that appears on group-hover.
    // Pure CSS — zero JS, zero extra render cost.
    const timestampLabel = message.createdAt instanceof Date && !isNaN(message.createdAt.getTime())
        ? formatTimestamp(message.createdAt)
        : '';

    return (
        <div
            className={cn(
                'group flex gap-3 md:gap-4 px-2 md:px-4 py-2 animate-fade-in hover:bg-muted/30 transition-colors rounded-xl mx-1 md:mx-2',
            )}
        >
            <Avatar className={cn(
                'h-8 w-8 shrink-0 shadow-sm border border-border/50',
                isUser ? 'bg-background' : 'bg-primary/10',
            )}>
                <AvatarFallback className={cn(
                    'text-xs font-medium',
                    isUser ? 'text-foreground' : 'text-primary',
                )}>
                    {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-1">
                {/* Name row + timestamp tooltip */}
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground/80">
                        {isUser ? 'You' : "Souvik's AI"}
                    </p>
                    {/* Timestamp — fades in only on group-hover to stay out of the way */}
                    {timestampLabel && (
                        <span className="text-[11px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 select-none">
                            {timestampLabel}
                        </span>
                    )}
                </div>

                {/* Message content */}
                <div className={cn(
                    'prose prose-invert max-w-none leading-relaxed',
                    preferences.textSize === 'small' ? 'prose-sm text-sm' :
                        preferences.textSize === 'large' ? 'prose-base text-lg' : 'prose-sm text-base',
                    'prose-p:text-foreground/90 prose-headings:text-foreground prose-strong:text-foreground prose-strong:font-semibold',
                    'prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0 prose-pre:border-0 prose-pre:shadow-none',
                    'prose-th:border prose-th:border-border/50 prose-th:bg-muted/30 prose-th:px-4 prose-th:py-2',
                    'prose-td:border prose-td:border-border/50 prose-td:px-4 prose-td:py-2',
                    'prose-table:border-collapse prose-table:w-full prose-table:my-4 prose-table:rounded-lg prose-table:overflow-hidden',
                )}>
                    {/* Web search indicator — shown above content whenever present */}
                    {!isUser && message.webSearch && (
                        <WebSearchIndicator webSearch={message.webSearch} />
                    )}
                    {!displayContent ? renderThinkingToggle() : (
                        <div className="flex flex-col gap-2">
                            {displayContent && (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,

                                        // ── Inline code ───────────────────────────────────
                                        code: ({ className, children, ...props }) => {
                                            const lang = extractLang(className);
                                            const isInline = !className;
                                            const content = String(children).replace(/\n$/, '');

                                            if (isInline) {
                                                return (
                                                    <code
                                                        className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground border border-border/50"
                                                        {...props}
                                                    >
                                                        {children}
                                                    </code>
                                                );
                                            }

                                            // ── Fenced code block with syntax highlighting ──
                                            return (
                                                <div className="relative group/code my-4 rounded-xl overflow-hidden border border-border/50 shadow-sm">
                                                    {/* Header bar: language label + copy button */}
                                                    <div className="flex items-center justify-between px-4 py-2 bg-[#1d1f21] border-b border-border/40">
                                                        <span className="text-[11px] font-mono text-muted-foreground/70 uppercase tracking-widest select-none">
                                                            {lang === 'text' ? 'plaintext' : lang}
                                                        </span>
                                                        <button
                                                            onClick={() => handleCopy(content)}
                                                            className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
                                                            title="Copy code"
                                                        >
                                                            {copied === content ? (
                                                                <><Check className="h-3 w-3 text-green-500" />Copied</>
                                                            ) : (
                                                                <><Copy className="h-3 w-3" />Copy</>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Highlighted code */}
                                                    <SyntaxHighlighter
                                                        language={lang}
                                                        style={oneDark}
                                                        customStyle={{
                                                            margin: 0,
                                                            padding: '1rem',
                                                            background: '#1d1f21',
                                                            fontSize: '0.8125rem',  // 13px
                                                            lineHeight: '1.6',
                                                            borderRadius: 0,
                                                        }}
                                                        codeTagProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } }}
                                                        wrapLongLines={false}
                                                    >
                                                        {content}
                                                    </SyntaxHighlighter>
                                                </div>
                                            );
                                        },

                                        // Strip the outer <pre> — SyntaxHighlighter renders its own
                                        pre: ({ children }) => (
                                            <pre className="bg-transparent p-0 m-0 border-0 shadow-none">
                                                {children}
                                            </pre>
                                        ),
                                    }}
                                >
                                    {displayContent}
                                </ReactMarkdown>
                            )}
                            {displayContent && renderThinkingToggle()}
                        </div>
                    )}
                </div>

                {/* Action bar — only for completed assistant messages */}
                {!isUser && !isLoading && displayContent && preferences.showMessageActions && (
                    <MessageActions
                        content={displayContent}
                        onRegenerate={
                            preferences.enableRegenerate && onRegenerate
                                ? () => onRegenerate(message.id)
                                : undefined
                        }
                        isLoading={isLoading}
                    />
                )}
            </div>
        </div>
    );
}

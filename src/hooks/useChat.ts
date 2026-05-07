'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCachedSessionsPromise } from '@/lib/preload';
import { branchChatSession } from '@/lib/branch-chat';
import { Message, ChatSession, ChatState, AIModel } from '@/types/chat';
import type { Attachment, AttachmentPayload, MessageAttachment } from '@/types/attachments';
import { useAuth } from './useAuth';
import { useChatPreferences } from './useChatPreferences';
import { MAX_INPUT_CHARS } from '@/lib/limits';
import {
    mapAndSortSessionList,
    sortSessionsByPinAndRecency,
} from './chat/session-mapper';
import { composeCustomSystemPrompt } from './chat/personalization';
import {
    createSession,
    deleteAssistantMessageAsync,
    deleteSession as dbDeleteSession,
    fetchSessionMessages,
    fetchSessionMeta,
    fetchUserSessions,
    insertAssistantMessage,
    insertUserMessageAsync,
    setSessionTitleAsync,
    updateSessionArchived,
    updateSessionPinned,
    updateSessionTitle,
} from './chat/db-actions';
import { runChatCompletion } from './chat/send-stream';
import {
    buildPlaceholderTitle,
    generateAndApplyTitle,
    stripThinkBlocks,
} from './chat/title';

// Singleton client
const supabase = createClient();

export function useChat() {
    const { user } = useAuth();
    const { preferences } = useChatPreferences();
    const [models, setModels] = useState<AIModel[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<string>('auto');
    const selectedModelIdRef = useRef<string>('auto');

    // Keep the ref in sync so sendMessage always reads the latest value
    // without needing selectedModelId in its dependency array (which would
    // cause it to be re-created on every model change and risk race conditions).
    selectedModelIdRef.current = selectedModelId;

    const [state, setState] = useState<ChatState>({
        messages: [],
        isLoading: false,
        error: null,
        currentSessionId: null,
    });
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [sessionsLoaded, setSessionsLoaded] = useState(false);
    const [isCurrentSessionArchived, setIsCurrentSessionArchived] = useState(false);
    /**
     * If the active chat was created via "Branch", this holds the snapshot
     * of the source chat's title taken at branch time. The conversation view
     * uses it to render the "Branched from <title>" divider at the top.
     */
    const [currentSessionBranchedFromTitle, setCurrentSessionBranchedFromTitle] = useState<string | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);
    const loadingUserIdRef = useRef<string | null>(null);
    /**
     * The project id to attach to the NEXT lazily-created session.
     * Set via `newChat(projectId)`; consumed (cleared) once `createSessionInDB`
     * uses it so subsequent new chats default back to no project.
     */
    const pendingProjectIdRef = useRef<string | null>(null);

    // ── Loaders ──────────────────────────────────────────────────────────────

    const loadSessions = useCallback(async (userId: string) => {
        // Prevent duplicate loading
        if (loadingUserIdRef.current === userId || sessionsLoaded) return;
        loadingUserIdRef.current = userId;

        try {
            // Hit the preloader cache first (populated by /app/layout).
            const cachedPromise = getCachedSessionsPromise(userId);
            if (cachedPromise) {
                const data = await cachedPromise;
                setSessions(mapAndSortSessionList(data));
                setSessionsLoaded(true);
                return;
            }

            const data = await fetchUserSessions(supabase, userId);
            if (data) {
                setSessions(mapAndSortSessionList(data));
                setSessionsLoaded(true);
            }
        } finally {
            loadingUserIdRef.current = null;
        }
    }, [sessionsLoaded]);

    const loadMessages = useCallback(async (sessionId: string) => {
        const messages = await fetchSessionMessages(supabase, sessionId);
        if (messages) {
            setState((prev) => ({ ...prev, messages, currentSessionId: sessionId }));
        }
        const meta = await fetchSessionMeta(supabase, sessionId);
        setIsCurrentSessionArchived(meta.isArchived);
        setCurrentSessionBranchedFromTitle(meta.branchedFromTitle);
    }, []);

    // Internal: creates a session in the DB. Called by sendMessage on first message.
    const createSessionInDB = useCallback(async (): Promise<string | null> => {
        if (!user) return null;

        // Consume the pending project id (if any). Each "New chat" intent
        // sets this once; the very next session creation picks it up.
        const projectId = pendingProjectIdRef.current;
        pendingProjectIdRef.current = null;

        const session = await createSession(supabase, user.id, projectId);
        if (!session) return null;

        setSessions((prev) => [session, ...prev]);
        setState((prev) => ({ ...prev, currentSessionId: session.id }));
        return session.id;
    }, [user]);

    // Public: resets the UI to a blank slate and aborts any in-flight stream.
    // The session is created lazily when the first message is sent.
    //
    // Pass `projectId` to attach the next created session to a project — used
    // by the "New chat" button on the project page.
    const newChat = useCallback((projectId?: string | null) => {
        // Cancel the active stream so it stops consuming API quota.
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        pendingProjectIdRef.current = projectId ?? null;
        setState((prev) => ({
            ...prev,
            messages: [],
            currentSessionId: null,
            isLoading: false,
            error: null,
        }));
        setIsCurrentSessionArchived(false);
        setCurrentSessionBranchedFromTitle(null);
    }, []);

    const selectSession = useCallback(async (sessionId: string) => {
        await loadMessages(sessionId);
    }, [loadMessages]);

    // ── Sending & streaming ─────────────────────────────────────────────────

    const sendMessage = useCallback(async (content: string, attachments: Attachment[] = [], tool?: string) => {
        if (!user) return;

        if (content.length > MAX_INPUT_CHARS) {
            setState((prev) => ({
                ...prev,
                error: `Message is too long (${content.length.toLocaleString()} characters). Please keep it under ${MAX_INPUT_CHARS.toLocaleString()} characters.`,
            }));
            return;
        }

        // Slim metadata persisted alongside the message — used to render
        // image previews and document chips inside the bubble. We deliberately
        // drop the full base64 (heavy) and extracted text (already merged into
        // `content` server-side) to keep DB rows lean.
        const messageAttachments: MessageAttachment[] = attachments.map((a) => ({
            kind: a.kind,
            name: a.name,
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes,
            thumbnail: a.kind === 'image' ? a.thumbnail || a.base64 : undefined,
        }));

        // Heavy version sent in the API request — full base64 for vision and
        // extracted text for documents.
        const attachmentPayloads: AttachmentPayload[] = attachments.map(({ kind, mimeType, base64, extractedText, name }) => ({
            kind, mimeType, base64, extractedText, name,
        }));

        let sessionId = state.currentSessionId;
        if (!sessionId) {
            sessionId = await createSessionInDB();
            if (!sessionId) return;
        }

        // Add user message — clean content (no emoji prefix); attachments render
        // as real previews via MessageAttachments inside the bubble.
        const userMessage: Message = {
            id: crypto.randomUUID(),
            sessionId,
            userId: user.id,
            role: 'user',
            content,
            createdAt: new Date(),
            attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
        };

        setState((prev) => ({
            ...prev,
            messages: [...prev.messages, userMessage],
            isLoading: true,
            error: null,
        }));

        insertUserMessageAsync(supabase, {
            id: userMessage.id,
            sessionId,
            userId: user.id,
            content,
            attachments: messageAttachments.length > 0 ? messageAttachments : null,
        });

        // On the first message, set a quick placeholder title so the sidebar
        // isn't blank. The real AI-generated title replaces it asynchronously
        // once the first response stream finishes.
        const isFirstMessage = state.messages.length === 0;
        if (isFirstMessage) {
            const placeholder = buildPlaceholderTitle(content);
            setSessions((prev) =>
                prev.map((s) => (s.id === sessionId ? { ...s, title: placeholder } : s))
            );
            setSessionTitleAsync(supabase, sessionId, placeholder);
        }

        // Create abort controller
        abortControllerRef.current = new AbortController();

        // Add empty assistant message BEFORE the fetch so the
        // "Thinking..." / "Searching..." indicator shows immediately
        const assistantId = crypto.randomUUID();
        setState((prev) => ({
            ...prev,
            messages: [
                ...prev.messages,
                {
                    id: assistantId,
                    sessionId: sessionId!,
                    userId: user.id,
                    role: 'assistant',
                    content: '',
                    createdAt: new Date(),
                },
            ],
        }));

        try {
            const customSystemPrompt = composeCustomSystemPrompt(preferences);

            // ── Image generation tool ────────────────────────────────────────
            if (tool === 'createImage') {
                // Mark the assistant bubble as generating an image.
                setState((prev) => ({
                    ...prev,
                    messages: prev.messages.map((m) =>
                        m.id === assistantId ? { ...m, isImageGenerating: true } : m
                    ),
                }));

                let imageUrl: string | null = null;
                let errorMsg: string | null = null;
                try {
                    const res = await fetch('/api/image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: content }),
                        signal: abortControllerRef.current.signal,
                    });
                    const data = await res.json();
                    if (res.ok && data.imageUrl) {
                        imageUrl = data.imageUrl as string;
                    } else {
                        errorMsg = data.error || 'Image generation failed';
                    }
                } catch (err) {
                    errorMsg = (err as Error).name === 'AbortError'
                        ? 'Request was cancelled'
                        : (err as Error).message;
                }

                const finalImageContent = imageUrl ? '' : (errorMsg ?? 'Image generation failed');

                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    messages: prev.messages.map((m) =>
                        m.id === assistantId
                            ? {
                                  ...m,
                                  content: finalImageContent,
                                  imageUrl: imageUrl ?? undefined,
                                  isImageGenerating: false,
                              }
                            : m
                    ),
                }));

                await insertAssistantMessage(supabase, {
                    id: assistantId,
                    sessionId,
                    userId: user.id,
                    content: finalImageContent || '[Generated image]',
                });

                if (isFirstMessage) {
                    generateAndApplyTitle({
                        sessionId,
                        userMessage: content,
                        assistantMessage: imageUrl ? '[Image generated]' : (errorMsg ?? ''),
                        onTitleResolved: (title) => {
                            setSessions((prev) =>
                                prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
                            );
                        },
                    });
                }
                return;
            }

            const finalContent = await runChatCompletion({
                sessionId,
                userMessageId: userMessage.id,
                content,
                attachments: attachmentPayloads,
                model: selectedModelIdRef.current,
                customSystemPrompt,
                tool,
                signal: abortControllerRef.current.signal,
                assistantId,
                onMutateAssistant: (mutate) => {
                    setState((prev) => ({
                        ...prev,
                        messages: prev.messages.map((m) => (m.id === assistantId ? mutate(m) : m)),
                    }));
                },
                onAssistantContent: (content) => {
                    setState((prev) => ({
                        ...prev,
                        messages: prev.messages.map((m) =>
                            m.id === assistantId ? { ...m, content } : m
                        ),
                    }));
                },
            });

            await insertAssistantMessage(supabase, {
                id: assistantId,
                sessionId,
                userId: user.id,
                content: finalContent,
            });

            // ── Generate AI title after the first exchange ────────────────────
            // Fire-and-forget: runs after the stream is fully complete so it
            // never adds latency to the user's first message. The sidebar title
            // updates silently when the response arrives.
            if (isFirstMessage && finalContent) {
                generateAndApplyTitle({
                    sessionId,
                    userMessage: content,
                    assistantMessage: stripThinkBlocks(finalContent),
                    onTitleResolved: (title) => {
                        setSessions((prev) =>
                            prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
                        );
                    },
                });
            }

            setState((prev) => ({ ...prev, isLoading: false }));
        } catch (error) {
            const errorMessage = (error as Error).name === 'AbortError'
                ? 'Request was cancelled'
                : (error as Error).message;

            setState((prev) => ({
                ...prev,
                isLoading: false,
                messages: prev.messages.map((m) =>
                    m.id === assistantId ? { ...m, content: errorMessage } : m
                ),
            }));

            if ((error as Error).name !== 'AbortError') {
                // Save the error message as an assistant response so it persists in the chat history
                await insertAssistantMessage(supabase, {
                    id: assistantId,
                    sessionId,
                    userId: user.id,
                    content: errorMessage,
                });
            }
        }
    }, [user, state.currentSessionId, state.messages.length, createSessionInDB, preferences]);

    const abortRequest = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    /**
     * Regenerate an assistant response.
     * Finds the user message that immediately preceded `assistantMessageId`,
     * removes the assistant message from state + DB, then re-sends the user
     * content so a fresh streaming response is produced.
     */
    const regenerateMessage = useCallback(async (assistantMessageId: string) => {
        const messages = state.messages;
        const assistantIdx = messages.findIndex((m) => m.id === assistantMessageId);
        if (assistantIdx === -1) return;

        // Find the closest preceding user message
        let userMessage: Message | null = null;
        for (let i = assistantIdx - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                userMessage = messages[i];
                break;
            }
        }
        if (!userMessage) return;

        // Remove the stale assistant message from state and DB (fire-and-forget)
        setState((prev) => ({
            ...prev,
            messages: prev.messages.filter((m) => m.id !== assistantMessageId),
        }));
        deleteAssistantMessageAsync(supabase, assistantMessageId);

        // Re-send the same user content — sendMessage will create a new assistant bubble
        await sendMessage(userMessage.content);
    }, [state.messages, sendMessage]);

    // ── Session mutations ───────────────────────────────────────────────────

    const deleteSession = useCallback(async (sessionId: string) => {
        await dbDeleteSession(supabase, sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (state.currentSessionId === sessionId) {
            setState((prev) => ({ ...prev, messages: [], currentSessionId: null }));
            setIsCurrentSessionArchived(false);
            setCurrentSessionBranchedFromTitle(null);
        }
    }, [state.currentSessionId]);

    const pinSession = useCallback(async (sessionId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;
        const newPinned = !session.isPinned;
        await updateSessionPinned(supabase, sessionId, newPinned);
        setSessions((prev) =>
            sortSessionsByPinAndRecency(
                prev.map((s) => s.id === sessionId ? { ...s, isPinned: newPinned } : s),
            ),
        );
    }, [sessions]);

    const archiveSession = useCallback(async (sessionId: string) => {
        await updateSessionArchived(supabase, sessionId, true);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (state.currentSessionId === sessionId) {
            setState((prev) => ({ ...prev, messages: [], currentSessionId: null }));
            setIsCurrentSessionArchived(false);
            setCurrentSessionBranchedFromTitle(null);
        }
    }, [state.currentSessionId]);

    /**
     * Branch the given chat into a new session.
     *
     * Creates a fresh session that snapshots the source's full message
     * history at this moment, prepends it to the sidebar, then opens it so
     * the user lands directly in the new branch with the
     * "Branched from <title>" divider visible at the top of the conversation.
     *
     * Cancels any in-flight stream first so the active reader doesn't keep
     * pushing tokens into a session the user just navigated away from.
     */
    const branchSession = useCallback(async (sessionId: string) => {
        if (!user) return null;

        // Stop the current stream — branching navigates the user away.
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        const branched = await branchChatSession(sessionId, user.id);
        if (!branched) return null;

        // Insert at the top of the sidebar so the user immediately sees it.
        setSessions((prev) => [branched, ...prev]);

        // Open the new branch in the main chat view.
        await loadMessages(branched.id);
        return branched.id;
    }, [user, loadMessages]);

    /**
     * Rename a chat session. Updates Supabase and the local sessions list
     * optimistically. The trimmed title must be non-empty; otherwise no-op.
     */
    const renameSession = useCallback(async (sessionId: string, title: string) => {
        const trimmed = title.trim();
        if (!trimmed) return;

        // Optimistic local update
        setSessions((prev) =>
            prev.map((s) => (s.id === sessionId ? { ...s, title: trimmed } : s))
        );

        await updateSessionTitle(supabase, sessionId, trimmed);
    }, []);

    // ── Models ──────────────────────────────────────────────────────────────

    const loadModels = useCallback(async () => {
        try {
            const res = await fetch('/api/models');
            if (res.ok) {
                const data = await res.json();
                setModels(data);
                if (data.length > 0 && !selectedModelId) {
                    setSelectedModelId('auto');
                }
            }
        } catch (error) {
            console.error('Failed to load models:', error);
        }
    }, [selectedModelId]);

    // ── Lifecycle ───────────────────────────────────────────────────────────

    // Load sessions when user becomes available
    useEffect(() => {
        if (user && !sessionsLoaded) {
            loadSessions(user.id);
            loadModels();
        }
    }, [user, sessionsLoaded, loadSessions, loadModels]);

    // Reset sessions state when user changes
    useEffect(() => {
        if (!user) {
            setSessions([]);
            setSessionsLoaded(false);
            setState({
                messages: [],
                isLoading: false,
                error: null,
                currentSessionId: null,
            });
        }
    }, [user]);

    return {
        ...state,
        sessions,
        models,
        selectedModelId,
        setSelectedModelId,
        isCurrentSessionArchived,
        currentSessionBranchedFromTitle,
        sendMessage,
        regenerateMessage,
        newChat,
        selectSession,
        deleteSession,
        pinSession,
        archiveSession,
        renameSession,
        branchSession,
        abortRequest,
        loadSessions: () => user && loadSessions(user.id),
    };
}

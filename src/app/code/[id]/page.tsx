'use client';

import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { CodeWorkspace } from '@/components/code/CodeWorkspace';
import { useBuilderAgent } from '@/hooks/useBuilderAgent';
import { useModels } from '@/hooks/useModels';
import { useAuth } from '@/hooks/useAuth';

const PENDING_KEY = (id: string) => `souvik:builder-pending:${id}`;

interface PendingPayload {
    message: string;
    ts: number;
}

export default function BuilderWorkspacePage() {
    const params = useParams<{ id: string }>();
    const sessionId = params?.id ?? '';
    const router = useRouter();

    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const { models } = useModels();
    const {
        session,
        isStreaming,
        error,
        selectedModelId,
        setSelectedModelId,
        setActiveFile,
        updateFile,
        sendMessage,
        abort,
    } = useBuilderAgent(sessionId);

    // Drain the pending message handed off from /code on first mount.
    const consumedPendingRef = useRef(false);
    useEffect(() => {
        if (consumedPendingRef.current) return;
        if (!isAuthenticated) return;
        if (!sessionId) return;
        if (session.messages.length > 0) {
            // Already mid-conversation (e.g. tab reload) — don't replay.
            consumedPendingRef.current = true;
            return;
        }
        try {
            const raw = sessionStorage.getItem(PENDING_KEY(sessionId));
            if (!raw) {
                consumedPendingRef.current = true;
                return;
            }
            sessionStorage.removeItem(PENDING_KEY(sessionId));
            const parsed = JSON.parse(raw) as Partial<PendingPayload>;
            if (parsed?.message && typeof parsed.message === 'string') {
                consumedPendingRef.current = true;
                // Defer to next tick so the workspace has rendered before we
                // kick off the stream — keeps the first paint snappy.
                setTimeout(() => {
                    sendMessage(parsed.message as string);
                }, 0);
            } else {
                consumedPendingRef.current = true;
            }
        } catch {
            consumedPendingRef.current = true;
        }
    }, [isAuthenticated, sessionId, session.messages.length, sendMessage]);

    // Auth gate.
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/signin');
        }
    }, [authLoading, isAuthenticated, router]);

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
            </div>
        );
    }

    return (
        <CodeWorkspace
            title={session.title}
            files={session.files}
            activeFile={session.activeFile}
            messages={session.messages}
            isStreaming={isStreaming}
            error={error}
            models={models}
            selectedModelId={selectedModelId}
            onModelChange={setSelectedModelId}
            onSelectFile={setActiveFile}
            onUpdateFile={updateFile}
            onSend={sendMessage}
            onStop={abort}
        />
    );
}

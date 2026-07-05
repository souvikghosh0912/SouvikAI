export interface WebSearchResult {
    title: string;
    url: string;
    snippet: string;
    favicon: string;
}

export interface WebSearchState {
    query: string;
    /** 'searching' while the server is fetching; 'done' once results arrive. */
    status: 'searching' | 'done';
    results: WebSearchResult[];
}

import type { MessageAttachment } from './attachments';

export interface Message {
    id: string;
    sessionId: string;
    userId: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: Date;
    /** Present on assistant messages when the searchWeb tool was used. */
    webSearch?: WebSearchState;
    /** Present on user messages with files attached — used to render previews in the bubble. */
    attachments?: MessageAttachment[];
    /**
     * When the `createImage` tool was used, the assistant message carries the
     * generated image as a data-URL (`data:image/png;base64,…`).
     */
    imageUrl?: string;
    /**
     * True while the image is being generated — drives the loading skeleton.
     * Cleared once `imageUrl` is set or an error occurs.
     */
    isImageGenerating?: boolean;
}

export interface ChatSession {
    id: string;
    userId: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    isPinned: boolean;
    isArchived: boolean;
    /** Optional project this chat belongs to. NULL = loose chat (top-level). */
    projectId: string | null;
    /** When this chat was created via "Branch", the id of the source chat. */
    branchedFromSessionId: string | null;
    /**
     * Snapshot of the source chat's title at the time of branching. Used to
     * render the "Branched from <title>" divider; persists even if the
     * source chat is later renamed or deleted.
     */
    branchedFromTitle: string | null;
}

export interface ChatState {
    messages: Message[];
    isLoading: boolean;
    error: string | null;
    currentSessionId: string | null;
}

export interface SendMessagePayload {
    sessionId: string;
    content: string;
}

export interface AIModel {
    id: string;
    name: string;
    displayName: string;
    quota_limit: number;
    is_suspended: boolean;
    /** AI backend used to serve this model. */
    provider: 'nvidia' | 'google' | 'freemodel' | 'custom';
    /** Request format for the 'freemodel' provider only. */
    protocol?: 'openai' | 'anthropic' | null;
    /** References a custom_providers row when provider === 'custom'. */
    custom_provider_id?: string | null;
    /** References a system_prompts row. NULL falls back to the default prompt. */
    system_prompt_id?: string | null;
}

/** Reusable third-party provider credentials an admin can assign to models. */
export interface CustomProvider {
    id: string;
    name: string;
    base_url: string;
    protocol: 'openai' | 'anthropic' | 'gemini';
    /** Masked for display, e.g. "••••ab12". Never the raw key. */
    api_key_masked: string;
}

/** Admin-managed, named system prompt assignable to individual models. */
export interface SystemPrompt {
    id: string;
    name: string;
    content: string;
    /** experimental = drafting/iteration; production = safe to assign to a model or set as default. */
    status: 'experimental' | 'production';
    /** Exactly one prompt has is_default = true — used as the fallback for models with no explicit assignment. */
    is_default: boolean;
    created_at: string;
    updated_at: string;
    /** Number of models currently pointing at this prompt (computed by the list API, not stored). */
    assignedModelCount?: number;
}



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

export interface Message {
    id: string;
    sessionId: string;
    userId: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: Date;
    /** Present on assistant messages when the searchWeb tool was used. */
    webSearch?: WebSearchState;
}

export interface ChatSession {
    id: string;
    userId: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    isPinned: boolean;
    isArchived: boolean;
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
}



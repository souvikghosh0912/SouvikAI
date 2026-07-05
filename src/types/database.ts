export interface Database {
    PostgrestVersion: "12";
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string;
                    created_at: string;
                    suspended_until: string | null;
                    suspension_reason: string | null;
                    is_deleted: boolean;
                    deletion_reason: string | null;
                    is_kicked: boolean;
                    updated_at: string;
                    memory_enabled: boolean;
                };
                Insert: {
                    id: string;
                    email: string;
                    created_at?: string;
                    suspended_until?: string | null;
                    suspension_reason?: string | null;
                    is_deleted?: boolean;
                    deletion_reason?: string | null;
                    is_kicked?: boolean;
                    updated_at?: string;
                    memory_enabled?: boolean;
                };
                Update: {
                    id?: string;
                    email?: string;
                    created_at?: string;
                    suspended_until?: string | null;
                    suspension_reason?: string | null;
                    is_deleted?: boolean;
                    deletion_reason?: string | null;
                    is_kicked?: boolean;
                    updated_at?: string;
                    memory_enabled?: boolean;
                };
                Relationships: [];
            };
            user_memories: {
                Row: {
                    id: string;
                    user_id: string;
                    content: string;
                    source: 'manual' | 'auto';
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    content: string;
                    source?: 'manual' | 'auto';
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    content?: string;
                    source?: 'manual' | 'auto';
                    created_at?: string;
                };
                Relationships: [];
            };
            chat_sessions: {
                Row: {
                    id: string;
                    user_id: string;
                    title: string;
                    created_at: string;
                    updated_at: string;
                    project_id: string | null;
                    branched_from_session_id: string | null;
                    branched_from_title: string | null;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    title?: string;
                    created_at?: string;
                    updated_at?: string;
                    project_id?: string | null;
                    branched_from_session_id?: string | null;
                    branched_from_title?: string | null;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    title?: string;
                    created_at?: string;
                    updated_at?: string;
                    project_id?: string | null;
                    branched_from_session_id?: string | null;
                    branched_from_title?: string | null;
                };
                Relationships: [];
            };
            projects: {
                Row: {
                    id: string;
                    user_id: string;
                    name: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    name: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    name?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            chat_messages: {
                Row: {
                    id: string;
                    session_id: string;
                    user_id: string;
                    role: 'user' | 'assistant';
                    content: string;
                    created_at: string;
                    attachments: unknown | null;
                };
                Insert: {
                    id?: string;
                    session_id: string;
                    user_id: string;
                    role: 'user' | 'assistant';
                    content: string;
                    created_at?: string;
                    attachments?: unknown | null;
                };
                Update: {
                    id?: string;
                    session_id?: string;
                    user_id?: string;
                    role?: 'user' | 'assistant';
                    content?: string;
                    created_at?: string;
                    attachments?: unknown | null;
                };
                Relationships: [];
            };
            requests_log: {
                Row: {
                    id: string;
                    user_id: string;
                    created_at: string;
                    status: 'completed' | 'failed' | 'aborted';
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    created_at?: string;
                    status?: 'completed' | 'failed' | 'aborted';
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    created_at?: string;
                    status?: 'completed' | 'failed' | 'aborted';
                };
                Relationships: [];
            };
            builder_workspaces: {
                Row: {
                    id: string;
                    user_id: string;
                    title: string;
                    active_file: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    title?: string;
                    active_file?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    title?: string;
                    active_file?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            builder_files: {
                Row: {
                    id: string;
                    workspace_id: string;
                    path: string;
                    content: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    workspace_id: string;
                    path: string;
                    content?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    workspace_id?: string;
                    path?: string;
                    content?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            builder_messages: {
                Row: {
                    id: string;
                    workspace_id: string;
                    user_id: string;
                    role: 'user' | 'assistant';
                    content: string;
                    steps: unknown;
                    errored: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    workspace_id: string;
                    user_id: string;
                    role: 'user' | 'assistant';
                    content?: string;
                    steps?: unknown;
                    errored?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    workspace_id?: string;
                    user_id?: string;
                    role?: 'user' | 'assistant';
                    content?: string;
                    steps?: unknown;
                    errored?: boolean;
                    created_at?: string;
                };
                Relationships: [];
            };
            models: {
                Row: {
                    id: string;
                    name: string;
                    display_name: string;
                    quota_limit: number;
                    is_suspended: boolean;
                    provider: 'nvidia' | 'google' | 'freemodel' | 'custom';
                    protocol: 'openai' | 'anthropic' | null;
                    custom_provider_id: string | null;
                    system_prompt_id: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    display_name: string;
                    quota_limit?: number;
                    is_suspended?: boolean;
                    provider?: 'nvidia' | 'google' | 'freemodel' | 'custom';
                    protocol?: 'openai' | 'anthropic' | null;
                    custom_provider_id?: string | null;
                    system_prompt_id?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    display_name?: string;
                    quota_limit?: number;
                    is_suspended?: boolean;
                    provider?: 'nvidia' | 'google' | 'freemodel' | 'custom';
                    protocol?: 'openai' | 'anthropic' | null;
                    custom_provider_id?: string | null;
                    system_prompt_id?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            system_prompts: {
                Row: {
                    id: string;
                    name: string;
                    content: string;
                    status: 'experimental' | 'production';
                    is_default: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    content: string;
                    status?: 'experimental' | 'production';
                    is_default?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    content?: string;
                    status?: 'experimental' | 'production';
                    is_default?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            custom_providers: {
                Row: {
                    id: string;
                    name: string;
                    base_url: string;
                    api_key: string;
                    protocol: 'openai' | 'anthropic' | 'gemini';
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    base_url: string;
                    api_key: string;
                    protocol: 'openai' | 'anthropic' | 'gemini';
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    base_url?: string;
                    api_key?: string;
                    protocol?: 'openai' | 'anthropic' | 'gemini';
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            admin_settings: {
                Row: {
                    id: number;
                    temperature: number;
                    max_tokens: number;
                    model_name: string;
                    edit_mode: boolean;
                    updated_at: string;
                };
                Insert: {
                    id?: number;
                    temperature?: number;
                    max_tokens?: number;
                    model_name?: string;
                    edit_mode?: boolean;
                    updated_at?: string;
                };
                Update: {
                    id?: number;
                    temperature?: number;
                    max_tokens?: number;
                    model_name?: string;
                    edit_mode?: boolean;
                    updated_at?: string;
                };
                Relationships: [];
            };
            token_usage: {
                Row: {
                    id: string;
                    user_id: string;
                    model_id: string;
                    tokens_used: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    model_id: string;
                    tokens_used?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    model_id?: string;
                    tokens_used?: number;
                    created_at?: string;
                };
                Relationships: [];
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
}

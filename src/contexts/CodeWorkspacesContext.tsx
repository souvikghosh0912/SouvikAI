'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { BuilderWorkspaceSummary } from '@/types/code';

interface CodeWorkspacesContextValue {
    workspaces: BuilderWorkspaceSummary[];
    isLoading: boolean;
    favorites: Set<string>;
    toggleFavorite: (id: string) => void;
    renameWorkspace: (id: string, newTitle: string) => Promise<void>;
    deleteWorkspace: (id: string) => Promise<void>;
    refresh: () => Promise<void>;
}

const CodeWorkspacesContext = createContext<CodeWorkspacesContextValue | null>(null);

const FAVORITES_KEY = 'code-favorites';

export function CodeWorkspacesProvider({ children }: { children: ReactNode }) {
    const [workspaces, setWorkspaces] = useState<BuilderWorkspaceSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());

    // Load favorites from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(FAVORITES_KEY);
            if (stored) {
                setFavorites(new Set(JSON.parse(stored)));
            }
        } catch {
            // ignore
        }
    }, []);

    // Save favorites to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
        } catch {
            // ignore
        }
    }, [favorites]);

    const fetchWorkspaces = useCallback(async () => {
        try {
            const res = await fetch('/api/code/workspaces');
            if (res.ok) {
                const data = await res.json();
                setWorkspaces(data.workspaces || []);
            }
        } catch (err) {
            console.error('Failed to fetch workspaces', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWorkspaces();
    }, [fetchWorkspaces]);

    const toggleFavorite = useCallback((id: string) => {
        setFavorites(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const renameWorkspace = useCallback(async (id: string, newTitle: string) => {
        // Optimistic update
        setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, title: newTitle } : w));
        try {
            const res = await fetch(`/api/code/workspaces/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle }),
            });
            if (!res.ok) throw new Error('Rename failed');
        } catch (err) {
            console.error(err);
            // Revert on failure
            fetchWorkspaces();
        }
    }, [fetchWorkspaces]);

    const deleteWorkspace = useCallback(async (id: string) => {
        // Optimistic update
        setWorkspaces(prev => prev.filter(w => w.id !== id));
        setFavorites(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
        try {
            const res = await fetch(`/api/code/workspaces/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Delete failed');
        } catch (err) {
            console.error(err);
            // Revert on failure
            fetchWorkspaces();
        }
    }, [fetchWorkspaces]);

    return (
        <CodeWorkspacesContext.Provider
            value={{
                workspaces,
                isLoading,
                favorites,
                toggleFavorite,
                renameWorkspace,
                deleteWorkspace,
                refresh: fetchWorkspaces,
            }}
        >
            {children}
        </CodeWorkspacesContext.Provider>
    );
}

export function useCodeWorkspaces() {
    const context = useContext(CodeWorkspacesContext);
    if (!context) {
        throw new Error('useCodeWorkspaces must be used within a CodeWorkspacesProvider');
    }
    return context;
}

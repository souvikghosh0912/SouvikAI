'use client';

import { ReactNode } from 'react';
import { CodeSidebar } from '@/components/code/sidebar/CodeSidebar';
import { CodeWorkspacesProvider } from '@/contexts/CodeWorkspacesContext';

export default function SidebarLayout({ children }: { children: ReactNode }) {
    return (
        <CodeWorkspacesProvider>
            <div className="flex h-screen overflow-hidden bg-background">
                <CodeSidebar />
                <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
                    {children}
                </div>
            </div>
        </CodeWorkspacesProvider>
    );
}

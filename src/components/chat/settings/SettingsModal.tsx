'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui';
import {
    Settings2,
    Activity,
    UserCircle,
    MessageSquare,
    Bot,
    X,
    Archive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GeneralTab } from './tabs/GeneralTab';
import { UsageTab } from './tabs/UsageTab';
import { AccountTab } from './tabs/AccountTab';
import { PreferencesTab } from './tabs/PreferencesTab';
import { PersonalizationTab } from './tabs/AIBehaviorTab';
import { ArchivedChatsTab } from './tabs/ArchivedChatsTab';

interface SettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOpenArchivedChat?: (sessionId: string) => void;
    initialTab?: string;
}

export function SettingsModal({
    open,
    onOpenChange,
    onOpenArchivedChat,
    initialTab,
}: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState(initialTab ?? 'general');

    // Sync external initialTab changes (e.g. "View archived" button click)
    const [lastInitialTab, setLastInitialTab] = useState(initialTab);
    if (initialTab !== lastInitialTab) {
        setLastInitialTab(initialTab);
        if (initialTab) setActiveTab(initialTab);
    }

    const tabs = [
        {
            id: 'general',
            name: 'General',
            icon: Settings2,
            component: () => (
                <GeneralTab
                    onNavigateToArchived={() => setActiveTab('archived')}
                />
            ),
        },
        {
            id: 'ai-behavior',
            name: 'Personalization',
            icon: Bot,
            component: PersonalizationTab,
        },
        {
            id: 'preferences',
            name: 'Chat Preferences',
            icon: MessageSquare,
            component: PreferencesTab,
        },
        { id: 'usage', name: 'Usage', icon: Activity, component: UsageTab },
        { id: 'account', name: 'Account', icon: UserCircle, component: AccountTab },
        {
            id: 'archived',
            name: 'Archived Chats',
            icon: Archive,
            component: () => (
                <ArchivedChatsTab
                    onOpenChat={(sessionId) => {
                        onOpenArchivedChat?.(sessionId);
                        onOpenChange(false);
                    }}
                />
            ),
        },
    ];

    const activeTabName = tabs.find((t) => t.id === activeTab)?.name;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    'max-w-[820px] w-[94vw] p-0 overflow-hidden',
                    'h-[78vh] max-h-[640px]',
                    'flex flex-col md:flex-row gap-0',
                    'bg-background border border-border rounded-xl shadow-overlay',
                    '[&>button]:hidden'
                )}
            >
                <DialogTitle className="sr-only">Settings</DialogTitle>

                {/* ── Sidebar ────────────────────────────────────────── */}
                <div className="w-full md:w-[196px] flex flex-col flex-shrink-0 bg-surface md:border-r md:border-border">
                    <div className="hidden md:flex h-12 items-center px-4 border-b border-border-subtle">
                        <span className="text-[13px] font-medium text-foreground">
                            Settings
                        </span>
                    </div>

                    <nav className="flex md:flex-col gap-0.5 overflow-x-auto md:overflow-y-auto px-2 py-2 hide-scrollbar">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            const isArchived = tab.id === 'archived';
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'group relative flex-shrink-0 md:w-full flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-md text-[13px] transition-colors text-left',
                                        isActive
                                            ? 'bg-surface-3 text-foreground font-medium'
                                            : 'text-foreground-muted hover:bg-surface-2 hover:text-foreground',
                                        isArchived &&
                                        'mt-1 md:mt-1.5 md:before:content-[""] md:before:absolute md:before:-top-1 md:before:left-2 md:before:right-2 md:before:h-px md:before:bg-border-subtle'
                                    )}
                                >
                                    {/* Active marker */}
                                    {isActive && (
                                        <span
                                            aria-hidden
                                            className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-foreground hidden md:block"
                                        />
                                    )}
                                    <tab.icon
                                        className="h-3.5 w-3.5 shrink-0"
                                        strokeWidth={isActive ? 1.75 : 1.5}
                                    />
                                    {tab.name}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* ── Content ────────────────────────────────────────── */}
                <div className="flex-1 flex flex-col bg-background overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between h-12 px-4 md:px-6 border-b border-border-subtle">
                        <h2 className="text-[14px] font-semibold text-foreground tracking-tight">
                            {activeTabName}
                        </h2>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="Close settings"
                        >
                            <X className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5">
                        <div className="max-w-2xl mx-auto animate-in fade-in duration-200">
                            {tabs.map((tab) => {
                                const TabComponent = tab.component;
                                return activeTab === tab.id ? (
                                    <TabComponent key={tab.id} />
                                ) : null;
                            })}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

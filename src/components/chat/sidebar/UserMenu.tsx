'use client';

import { LogOut, Settings } from 'lucide-react';
import {
    Avatar,
    AvatarFallback,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    SimpleTooltip,
} from '@/components/ui';
import { cn } from '@/lib/utils';

export interface UserMenuProps {
    user: { email?: string; displayName?: string } | null;
    displayName: string;
    initial: string;
    collapsed: boolean;
    onOpenSettings: () => void;
    onSignOut: () => void;
}

/**
 * Footer dropdown that shows the user's avatar + name and surfaces the
 * Settings + Sign out actions. Used by both mobile and desktop sidebars.
 */
export function UserMenu({
    user,
    displayName,
    initial,
    collapsed,
    onOpenSettings,
    onSignOut,
}: UserMenuProps) {
    return (
        <DropdownMenu>
            <SimpleTooltip
                content={collapsed ? `${displayName} · Account` : 'Account'}
                side="right"
                disabled={!collapsed}
            >
                <DropdownMenuTrigger asChild>
                    <button
                        aria-label="Open account menu"
                        className={cn(
                            'w-full flex items-center rounded-md hover:bg-surface-2 transition-colors text-left',
                            collapsed
                                ? 'h-8 w-8 mx-auto justify-center p-0'
                                : 'gap-2 px-1.5 py-1.5'
                        )}
                    >
                        <Avatar className="h-7 w-7 shrink-0 ring-1 ring-border">
                            <AvatarFallback className="bg-foreground text-background text-[11px] font-semibold">
                                {initial}
                            </AvatarFallback>
                        </Avatar>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium truncate text-foreground leading-tight">
                                    {displayName}
                                </p>
                                <p className="text-[11px] text-foreground-muted truncate leading-tight">
                                    Free plan
                                </p>
                            </div>
                        )}
                    </button>
                </DropdownMenuTrigger>
            </SimpleTooltip>
            <DropdownMenuContent
                align="start"
                className="w-56 bg-popover text-popover-foreground border-border"
                sideOffset={8}
            >
                <div className="px-2 py-1.5 text-[11px] text-foreground-muted border-b border-border-subtle mb-1 truncate">
                    {user?.email}
                </div>
                <DropdownMenuItem
                    onSelect={(e) => {
                        e.preventDefault();
                        onOpenSettings();
                    }}
                    className="cursor-pointer text-[13px]"
                >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={onSignOut}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer text-[13px]"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

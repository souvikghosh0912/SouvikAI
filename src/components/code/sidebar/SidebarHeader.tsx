import { ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui';

interface SidebarHeaderProps {
    onOpenSearch: () => void;
}

export function SidebarHeader({ onOpenSearch }: SidebarHeaderProps) {
    return (
        <div className="flex flex-col gap-4 p-3 shrink-0">
            <Button
                variant="outline"
                className="w-full justify-between bg-surface hover:bg-surface-2 border-border text-foreground h-9 font-medium"
            >
                New Chat
                <ChevronDown className="h-4 w-4 text-foreground-muted" />
            </Button>

            <button
                onClick={onOpenSearch}
                className="relative flex items-center w-full h-8 bg-transparent hover:bg-surface-2 transition-colors rounded-md text-left group"
            >
                <Search className="absolute left-2.5 h-4 w-4 text-foreground-muted" />
                <span className="pl-9 text-[13px] text-foreground-muted group-hover:text-foreground transition-colors">
                    Search
                </span>
            </button>
        </div>
    );
}

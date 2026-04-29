import { Home, LayoutGrid, MessageSquare, Shapes, LayoutTemplate } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
    { icon: Home, label: 'Home', href: '/code' },
    { icon: LayoutGrid, label: 'Projects', href: '/projects' },
    { icon: MessageSquare, label: 'Chats', href: '/code/chats' },
    { icon: Shapes, label: 'Design Systems', href: '#' },
    { icon: LayoutTemplate, label: 'Templates', href: '#' },
];

export function SidebarNav() {
    const pathname = usePathname();

    return (
        <nav className="flex flex-col gap-0.5 px-2 shrink-0">
            {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.href !== '#' && pathname === item.href;
                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-2 h-9 rounded-md text-[14px] transition-colors",
                            isActive 
                                ? "bg-surface-3 text-foreground font-medium" 
                                : "text-[#a3a3a3] hover:text-foreground hover:bg-surface-2"
                        )}
                    >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}

'use client';

// ===========================================
// Sidebar Component
// ===========================================

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Clock,
    FileText,
    Settings,
    Download,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    X,
    ListChecks,
} from 'lucide-react';
import { useAppState } from '@/context/AppContext';

// ─────────────────────────────────────────────
// Navigation Items
// ─────────────────────────────────────────────

const NAV_ITEMS = [
    { label: 'Timeline', href: '/timeline', icon: Clock },
    { label: 'Decisions', href: '/decisions', icon: FileText },
    { label: 'Review', href: '/candidates', icon: ListChecks },
    { label: 'Prompts', href: '/prompts', icon: Sparkles },
    { label: 'Exports', href: '/exports', icon: Download },
    { label: 'Settings', href: '/settings', icon: Settings },
];

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { selectedRepoId, availableRepos } = useAppState();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Get current repo name
    const currentRepo = availableRepos.find(r => r.id === selectedRepoId);
    const repoName = currentRepo?.name || 'decision.log';

    // Check if a nav item is active
    const isActive = (href: string) => {
        if (href === '/timeline') {
            return pathname === '/timeline' || pathname === '/';
        }
        return pathname.startsWith(href);
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed lg:sticky top-0 left-0 h-screen z-50 lg:z-auto
                    bg-white/80 backdrop-blur-xl
                    border-r border-base-200/60
                    shadow-xl lg:shadow-none
                    transition-all duration-300 ease-out
                    flex flex-col font-mono text-sm
                    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    ${isCollapsed ? 'w-16' : 'w-64'}
                `}
            >
                {/* Header */}
                <div className="h-14 border-b border-base-200/60 flex items-center px-4 justify-between bg-gradient-to-r from-base-50 to-base-100/50 flex-shrink-0">
                    {!isCollapsed && (
                        <div className="font-semibold text-base-900 truncate flex-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-accent-400 to-accent-500" />
                            {repoName}
                        </div>
                    )}

                    {/* Mobile close button */}
                    <button
                        onClick={onClose}
                        className="lg:hidden p-1.5 hover:bg-base-200/60 rounded-lg text-base-500 hover:text-base-900 transition-all duration-200"
                        aria-label="Close sidebar"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Collapse button (desktop only) */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex p-1.5 hover:bg-base-200/60 rounded-lg text-base-500 hover:text-base-900 transition-all duration-200"
                        title={isCollapsed ? 'Expand' : 'Collapse'}
                        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                        ) : (
                            <ChevronLeft className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`
                                    relative flex items-center gap-3 px-3 py-2.5 rounded-lg
                                    transition-all duration-200 ease-out
                                    ${active
                                        ? 'bg-gradient-to-r from-base-100 to-base-50 text-base-900 font-medium shadow-sm'
                                        : 'text-base-500 hover:bg-base-100/60 hover:text-base-900'
                                    }
                                    ${isCollapsed ? 'justify-center px-2' : ''}
                                `}
                                title={isCollapsed ? item.label : undefined}
                            >
                                {/* Active indicator */}
                                {active && !isCollapsed && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-accent-400 to-accent-500" />
                                )}
                                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-accent-500' : ''}`} />
                                {!isCollapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-base-200/60 text-xs text-base-400 flex-shrink-0 bg-gradient-to-r from-base-50/50 to-transparent">
                    {!isCollapsed && (
                        <>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                v0.1.0
                            </div>
                            <div className="mt-1 text-base-500">decision.log</div>
                        </>
                    )}
                </div>
            </aside>
        </>
    );
}

// Default export for backward compatibility
export default Sidebar;


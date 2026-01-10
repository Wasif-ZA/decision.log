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
} from 'lucide-react';
import { useAppState } from '@/context/AppContext';

// ─────────────────────────────────────────────
// Navigation Items
// ─────────────────────────────────────────────

const NAV_ITEMS = [
    { label: 'Timeline', href: '/app/timeline', icon: Clock },
    { label: 'Decisions', href: '/app/decisions', icon: FileText },
    { label: 'Prompts', href: '/app/prompts', icon: Sparkles },
    { label: 'Exports', href: '/app/exports', icon: Download },
    { label: 'Settings', href: '/app/settings', icon: Settings },
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
        if (href === '/app/timeline') {
            return pathname === '/app/timeline' || pathname === '/app';
        }
        return pathname.startsWith(href);
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed lg:sticky top-0 left-0 h-screen z-50 lg:z-auto
          border-r border-base-200 bg-base-50
          transition-all duration-300 ease-in-out
          flex flex-col font-mono text-sm
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'w-16' : 'w-64'}
        `}
            >
                {/* Header */}
                <div className="h-14 border-b border-base-200 flex items-center px-4 justify-between bg-base-100 flex-shrink-0">
                    {!isCollapsed && (
                        <div className="font-semibold text-base-900 truncate flex-1">
                            {repoName}
                        </div>
                    )}

                    {/* Mobile close button */}
                    <button
                        onClick={onClose}
                        className="lg:hidden p-1 hover:bg-base-200 rounded text-base-500 hover:text-base-900 transition-colors"
                        aria-label="Close sidebar"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Collapse button (desktop only) */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex p-1 hover:bg-base-200 rounded text-base-500 hover:text-base-900 transition-colors"
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
                                onClick={onClose} // Close mobile sidebar on navigation
                                className={`
                  flex items-center gap-3 px-3 py-2 rounded transition-colors
                  ${active
                                        ? 'bg-base-200 text-base-900 font-medium'
                                        : 'text-base-500 hover:bg-base-100 hover:text-base-900'
                                    }
                  ${isCollapsed ? 'justify-center px-2' : ''}
                `}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {!isCollapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-base-200 text-xs text-base-400 flex-shrink-0">
                    {!isCollapsed && (
                        <>
                            <div>v0.1.0</div>
                            <div className="mt-1">decision.log</div>
                        </>
                    )}
                </div>
            </aside>
        </>
    );
}

// Default export for backward compatibility
export default Sidebar;

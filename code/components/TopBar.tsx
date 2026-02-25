'use client';

// ===========================================
// Top Bar Component
// ===========================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Search, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { useAppState } from '@/context/AppContext';
import { SyncButton } from '@/components/sync/SyncButton';
import { Select } from './ui/Select';
import { Input } from './ui/Input';

interface TopBarProps {
    onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
    const {
        user,
        selectedRepoId,
        selectedBranch,
        availableRepos,
        availableBranches,
        dateRange,
        setSelectedRepo,
        setSelectedBranch,
        setDateRange,
        logout,
    } = useAppState();

    const router = useRouter();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            router.push(`/decisions?search=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    // Repo options for select
    const repoOptions = availableRepos.map(repo => ({
        value: repo.id,
        label: repo.fullName,
    }));

    // Branch options for select
    const branchOptions = availableBranches.map(branch => ({
        value: branch,
        label: branch,
    }));

    return (
        <header className="h-14 border-b border-base-200/60 bg-white/80 backdrop-blur-xl flex items-center px-4 gap-4 flex-shrink-0 sticky top-0 z-30">
            {/* Mobile menu button */}
            <button
                onClick={onMenuClick}
                className="lg:hidden p-2 rounded-lg hover:bg-base-100 transition-all duration-200"
                aria-label="Open menu"
            >
                <Menu className="w-5 h-5 text-base-600" />
            </button>

            {/* Repo Selector */}
            <div className="hidden sm:block w-48">
                <Select
                    options={repoOptions}
                    value={selectedRepoId || ''}
                    onChange={(e) => {
                        const repoId = e.target.value;
                        if (!repoId) {
                            setSelectedRepo(null);
                            return;
                        }

                        const selectedRepo = availableRepos.find(r => r.id === repoId);
                        if (selectedRepo && !selectedRepo.enabled) {
                            router.push(`/setup?repo=${repoId}`);
                        } else {
                            setSelectedRepo(repoId);
                        }
                    }}
                    placeholder="Select repo"
                    aria-label="Repository"
                />
            </div>

            {/* Branch Selector */}
            <div className="hidden sm:block w-36">
                <Select
                    options={branchOptions}
                    value={selectedBranch || ''}
                    onChange={(e) => setSelectedBranch(e.target.value || null)}
                    placeholder="Branch"
                    disabled={!selectedRepoId}
                    aria-label="Branch"
                />
            </div>

            {/* Date Range (simplified for MVP) */}
            <div className="hidden md:flex items-center gap-2">
                <Input
                    type="date"
                    value={dateRange.from || ''}
                    onChange={(e) => setDateRange(e.target.value || null, dateRange.to)}
                    className="w-36"
                    aria-label="From date"
                />
                <span className="text-base-400">–</span>
                <Input
                    type="date"
                    value={dateRange.to || ''}
                    onChange={(e) => setDateRange(dateRange.from, e.target.value || null)}
                    className="w-36"
                    aria-label="To date"
                />
            </div>

            {/* Sync Button */}
            {selectedRepoId && (
                <div className="hidden sm:block">
                    <SyncButton repoId={selectedRepoId} />
                </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Search */}
            <div className="hidden md:block w-64">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-400 transition-colors group-focus-within:text-accent-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchSubmit}
                        placeholder="Search decisions..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-base-200 text-sm
                                   bg-white shadow-sm
                                   transition-all duration-200
                                   hover:border-base-300 hover:shadow-md
                                   focus:outline-none focus:ring-2 focus:ring-accent-100 focus:border-accent-400 focus:shadow-md"
                        aria-label="Search decisions"
                    />
                </div>
            </div>

            {/* User Menu */}
            <div className="relative">
                <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-base-100 transition-all duration-200 group"
                    aria-expanded={isUserMenuOpen}
                    aria-haspopup="true"
                >
                    {user?.avatarUrl ? (
                        <img
                            src={user.avatarUrl}
                            alt={user.login}
                            className="w-8 h-8 rounded-full ring-2 ring-base-200 group-hover:ring-accent-300 transition-all duration-200"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-base-100 to-base-200 flex items-center justify-center ring-2 ring-base-200 group-hover:ring-accent-300 transition-all duration-200">
                            <UserIcon className="w-4 h-4 text-base-500" />
                        </div>
                    )}
                    <ChevronDown className={`w-4 h-4 text-base-500 hidden sm:block transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {isUserMenuOpen && (
                    <>
                        {/* Backdrop to close menu */}
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsUserMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-elevated border border-base-200/60 py-1 z-20 animate-[scale-in_0.15s_ease-out]">
                            {user && (
                                <div className="px-4 py-3 border-b border-base-100">
                                    <p className="text-sm font-medium text-base-900 truncate">
                                        {user.login}
                                    </p>
                                    <p className="text-xs text-base-500 mt-0.5">
                                        Signed in via GitHub
                                    </p>
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    setIsUserMenuOpen(false);
                                    logout();
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm text-base-700 hover:bg-base-50 flex items-center gap-2.5 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Log out
                            </button>
                        </div>
                    </>
                )}
            </div>
        </header>
    );
}


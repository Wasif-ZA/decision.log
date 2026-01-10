'use client';

// ===========================================
// Top Bar Component
// ===========================================

import { useState } from 'react';
import { Menu, Search, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { useAppState } from '@/context/AppContext';
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

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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
        <header className="h-14 border-b border-base-200 bg-white flex items-center px-4 gap-4 flex-shrink-0">
            {/* Mobile menu button */}
            <button
                onClick={onMenuClick}
                className="lg:hidden p-2 rounded hover:bg-base-100 transition-colors"
                aria-label="Open menu"
            >
                <Menu className="w-5 h-5 text-base-600" />
            </button>

            {/* Repo Selector */}
            <div className="hidden sm:block w-48">
                <Select
                    options={repoOptions}
                    value={selectedRepoId || ''}
                    onChange={(e) => setSelectedRepo(e.target.value || null)}
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

            {/* Spacer */}
            <div className="flex-1" />

            {/* Search */}
            <div className="hidden md:block w-64">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search decisions..."
                        className="w-full pl-9 pr-3 py-2 rounded-md border border-base-300 text-sm
                       focus:outline-none focus:ring-2 focus:ring-base-200 focus:border-base-500"
                        aria-label="Search decisions"
                    />
                </div>
            </div>

            {/* User Menu */}
            <div className="relative">
                <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-2 rounded hover:bg-base-100 transition-colors"
                    aria-expanded={isUserMenuOpen}
                    aria-haspopup="true"
                >
                    {user?.avatarUrl ? (
                        <img
                            src={user.avatarUrl}
                            alt={user.login}
                            className="w-8 h-8 rounded-full"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-base-500" />
                        </div>
                    )}
                    <ChevronDown className="w-4 h-4 text-base-500 hidden sm:block" />
                </button>

                {/* Dropdown */}
                {isUserMenuOpen && (
                    <>
                        {/* Backdrop to close menu */}
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsUserMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-base-200 py-1 z-20">
                            {user && (
                                <div className="px-4 py-2 border-b border-base-100">
                                    <p className="text-sm font-medium text-base-900 truncate">
                                        {user.login}
                                    </p>
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    setIsUserMenuOpen(false);
                                    logout();
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-base-700 hover:bg-base-50 flex items-center gap-2"
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

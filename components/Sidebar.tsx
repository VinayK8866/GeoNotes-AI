import React from 'react';
import { Session } from '@supabase/supabase-js';
import {
    LocationPinIcon, DocumentTextIcon, MapIcon, ArchiveBoxIcon,
    ChevronLeftIcon, ChevronRightIcon, SparklesIcon,
    BoltIcon,
    BuildingOfficeIcon,
    ArrowRightOnRectangleIcon,
    UserCircleIcon, CogIcon
} from './Icons';

interface SidebarProps {
    session: Session | null;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    viewMode: 'active' | 'archived';
    onViewModeChange: (mode: 'active' | 'archived') => void;
    onViewPricing: () => void;
    onSignOut: () => void;
    subscriptionTier: 'free' | 'pro' | 'teams';
    notesCount: number;
    isMobileOpen: boolean;
    onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    session, isCollapsed, onToggleCollapse,
    viewMode, onViewModeChange, onViewPricing,
    onSignOut, subscriptionTier, notesCount,
    isMobileOpen, onMobileClose,
}) => {
    const navItems = [
        { id: 'active', label: 'My Notes', icon: DocumentTextIcon, count: notesCount },
        { id: 'archived', label: 'Archive', icon: ArchiveBoxIcon },
    ];

    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-between px-4 h-14 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20 animate-pulse-glow">
                        <LocationPinIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    {!isCollapsed && (
                        <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                            GeoNotes<span className="text-gradient">AI</span>
                        </span>
                    )}
                </div>
                <button
                    onClick={onToggleCollapse}
                    className="hidden md:flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {isCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = viewMode === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                onViewModeChange(item.id as 'active' | 'archived');
                                onMobileClose();
                            }}
                            className={`nav-item w-full ${isActive ? 'active' : ''}`}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <Icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width: '18px', height: '18px' }} />
                            {!isCollapsed && (
                                <>
                                    <span className="flex-1 text-left">{item.label}</span>
                                    {item.count !== undefined && item.count > 0 && (
                                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md min-w-[20px] text-center">
                                            {item.count}
                                        </span>
                                    )}
                                </>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Upgrade CTA (free users only) */}
            {subscriptionTier === 'free' && !isCollapsed && (
                <div className="px-3 pb-3">
                    <button
                        onClick={() => {
                            onViewPricing();
                            onMobileClose();
                        }}
                        className="w-full p-3 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/15 dark:to-violet-500/15 border border-indigo-200/60 dark:border-indigo-800/40 hover:from-indigo-500/15 hover:to-violet-500/15 dark:hover:from-indigo-500/20 dark:hover:to-violet-500/20 transition-all group"
                    >
                        <div className="flex items-center gap-2 mb-1.5">
                            <BoltIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Upgrade to Pro</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-500 leading-snug text-left">
                            Unlimited notes & AI searches
                        </p>
                    </button>
                </div>
            )}

            {/* User Profile Section */}
            {session && (
                <div className="border-t border-slate-200/80 dark:border-slate-700/50 px-3 py-3">
                    <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-default">
                        {session.user.user_metadata?.avatar_url ? (
                            <img
                                className="h-8 w-8 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 flex-shrink-0"
                                src={session.user.user_metadata.avatar_url}
                                alt=""
                            />
                        ) : (
                            <UserCircleIcon className="h-8 w-8 text-slate-500 flex-shrink-0" />
                        )}
                        {!isCollapsed && (
                            <>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                        {session.user.user_metadata?.full_name || session.user.email?.split('@')[0]}
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`badge text-[9px] uppercase tracking-wider ${subscriptionTier === 'pro' ? 'badge-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500'
                                            }`}>
                                            {subscriptionTier}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={onSignOut}
                                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    title="Sign out"
                                >
                                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <>
            {/* Mobile overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] md:hidden animate-fade-in"
                    onClick={onMobileClose}
                />
            )}

            {/* Desktop Sidebar */}
            <aside
                className={`glass-sidebar hidden md:flex flex-col fixed top-0 left-0 h-full z-[150] transition-all duration-300 ${isCollapsed ? 'w-[72px]' : 'w-[260px]'
                    }`}
            >
                {sidebarContent}
            </aside>

            {/* Mobile Sidebar */}
            <aside
                className={`glass-sidebar flex flex-col fixed top-0 left-0 h-full z-[250] w-[280px] md:hidden transition-transform duration-300 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {sidebarContent}
            </aside>
        </>
    );
};

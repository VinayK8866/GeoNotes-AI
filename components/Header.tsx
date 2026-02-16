import React, { useState, useRef, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { SearchIcon, AiIcon, SpinnerIcon, SunIcon, MoonIcon, ComputerDesktopIcon, UserCircleIcon, Bars3Icon } from './Icons';
import { Theme } from '../hooks/useTheme';

interface HeaderProps {
  session: Session | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAiSearch: () => void;
  isAiSearching: boolean;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onViewPricing: () => void;
  subscriptionTier?: 'free' | 'pro' | 'teams';
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  session, onSignIn, onSignOut, isOnline, isSyncing,
  searchQuery, onSearchChange, onAiSearch, isAiSearching,
  theme, setTheme, onViewPricing, subscriptionTier = 'free',
  onToggleMobileSidebar
}) => {
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) setIsThemeMenuOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header role="banner" className="glass-panel sticky top-0 z-[100]">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">

          {/* Left: Mobile menu + Status */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Mobile sidebar toggle */}
            {onToggleMobileSidebar && (
              <button
                onClick={onToggleMobileSidebar}
                className="md:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Open navigation"
              >
                <Bars3Icon className="w-5 h-5" />
              </button>
            )}

            {/* Status indicators */}
            <div className="flex items-center gap-2">
              {!isOnline && (
                <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-400/30">
                  Offline
                </span>
              )}
              {isSyncing && (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 animate-pulse">
                  <SpinnerIcon className="w-3 h-3 animate-spin" /> Syncing
                </span>
              )}
            </div>
          </div>

          {/* Center: Search */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              </div>
              <input
                type="search"
                className="block w-full rounded-lg border border-slate-200/80 dark:border-[#1e2d45] py-2 pl-9 pr-24 text-sm text-slate-900 dark:text-white bg-white/60 dark:bg-[#131c2e]/60 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all backdrop-blur-sm"
                placeholder="Search notes… ⌘K"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              <button
                onClick={onAiSearch}
                disabled={isAiSearching || !searchQuery.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-md text-[11px] font-semibold text-white shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isAiSearching ? <SpinnerIcon className="w-3 h-3 animate-spin" /> : <AiIcon className="w-3 h-3" />}
                Ask AI
              </button>
            </div>
          </div>

          {/* Right: Theme + User */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Theme toggle */}
            <div ref={themeMenuRef} className="relative">
              <button
                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                className="p-2 text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle theme"
              >
                {theme === 'light' && <SunIcon className="w-4 h-4" />}
                {theme === 'dark' && <MoonIcon className="w-4 h-4" />}
                {theme === 'system' && <ComputerDesktopIcon className="w-4 h-4" />}
              </button>

              {isThemeMenuOpen && (
                <div className="absolute right-0 z-10 mt-2 w-36 origin-top-right rounded-xl bg-white dark:bg-[#131c2e] p-1 shadow-lg border border-slate-200 dark:border-[#1e2d45] animate-scale-in">
                  {[
                    { id: 'light', icon: SunIcon, label: 'Light' },
                    { id: 'dark', icon: MoonIcon, label: 'Dark' },
                    { id: 'system', icon: ComputerDesktopIcon, label: 'System' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setTheme(item.id as Theme); setIsThemeMenuOpen(false); }}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${theme === item.id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <item.icon className="h-3.5 w-3.5" /> {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Profile */}
            {session && (
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#0b1121]"
                >
                  <span className="sr-only">Open user menu</span>
                  {session.user.user_metadata?.avatar_url ? (
                    <img className="h-7 w-7 rounded-full object-cover ring-2 ring-white dark:ring-slate-800" src={session.user.user_metadata.avatar_url} alt="" />
                  ) : (
                    <UserCircleIcon className="h-7 w-7 text-slate-500" aria-hidden="true" />
                  )}
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right divide-y divide-slate-100 dark:divide-slate-700/50 rounded-xl bg-white dark:bg-[#131c2e] shadow-lg border border-slate-200 dark:border-[#1e2d45] overflow-hidden animate-scale-in">
                    <div className="px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Account</p>
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white mt-0.5" title={session.user.email}>
                        {session.user.email}
                      </p>
                      <span className={`mt-1.5 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${subscriptionTier === 'pro' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-500'}`}>
                        {subscriptionTier}
                      </span>
                    </div>
                    <div className="py-1">
                      <button onClick={() => { setIsUserMenuOpen(false); onViewPricing(); }} className="block w-full px-4 py-2 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        Billing & Plans
                      </button>
                    </div>
                    <div className="py-1">
                      <button onClick={() => { onSignOut(); setIsUserMenuOpen(false); }} className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
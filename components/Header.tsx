import React, { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { LocationPinIcon, SearchIcon, AiIcon, SpinnerIcon, SunIcon, MoonIcon, ComputerDesktopIcon } from './Icons';
import { Theme } from '../hooks/useTheme';

interface HeaderProps {
    session: Session | null;
    onSignOut: () => void;
    isOnline: boolean;
    isSyncing: boolean;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onAiSearch: () => void;
    isAiSearching: boolean;
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

export const Header: React.FC<HeaderProps> = ({ session, onSignOut, isOnline, isSyncing, searchQuery, onSearchChange, onAiSearch, isAiSearching, theme, setTheme }) => {
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-[1000] border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center flex-shrink-0">
            <LocationPinIcon className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
            <div className="hidden sm:flex items-center gap-3 ml-3">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    GeoNotes <span className="text-indigo-500 dark:text-indigo-400">AI</span>
                </h1>
                {!isOnline ? (
                    <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">Offline</span>
                ) : isSyncing ? (
                    <span className="text-gray-500 dark:text-gray-400 text-xs font-bold animate-pulse">Syncing...</span>
                ) : null}
            </div>
          </div>
          <div className="flex-grow flex justify-center px-4">
            <div className="w-full max-w-md relative flex items-center">
                 <SearchIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                 <input 
                    type="text"
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full py-2 pl-10 pr-24 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                 />
                 <button 
                    onClick={onAiSearch}
                    disabled={isAiSearching || !searchQuery.trim()}
                    className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-3 py-1 rounded-full hover:bg-indigo-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                    title="Ask AI about your notes"
                 >
                    {isAiSearching ? <SpinnerIcon className="w-5 h-5 animate-spin"/> : <AiIcon className="w-5 h-5" />}
                    <span>Ask AI</span>
                 </button>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    {theme === 'light' && <SunIcon className="w-5 h-5" />}
                    {theme === 'dark' && <MoonIcon className="w-5 h-5" />}
                    {theme === 'system' && <ComputerDesktopIcon className="w-5 h-5" />}
                </button>
                {isThemeMenuOpen && (
                    <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 py-1 z-20">
                        <button onClick={() => { setTheme('light'); setIsThemeMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><SunIcon className="w-4 h-4" /> Light</button>
                        <button onClick={() => { setTheme('dark'); setIsThemeMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><MoonIcon className="w-4 h-4" /> Dark</button>
                        <button onClick={() => { setTheme('system'); setIsThemeMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><ComputerDesktopIcon className="w-4 h-4" /> System</button>
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
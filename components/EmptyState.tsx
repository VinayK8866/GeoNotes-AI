import React from 'react';
import { PlusIcon, SearchIcon, AiIcon, ArchiveBoxIcon } from './Icons';

interface EmptyStateProps {
    onAddNote: () => void;
    viewMode: 'active' | 'archived';
    isFiltered: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onAddNote, viewMode, isFiltered }) => {
    let title: string;
    let message: string;
    let showAction = false;

    if (isFiltered) {
        title = 'No notes found';
        message = 'Try adjusting your search terms or filters.';
    } else if (viewMode === 'archived') {
        title = 'Archive is empty';
        message = 'Notes you archive will appear here.';
    } else {
        title = 'Start capturing ideas';
        message = 'Create your first note — pin it to a location, tag it, or let AI help you organize it.';
        showAction = true;
    }

    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 animate-fade-in-up">
            {/* Animated illustration */}
            <div className="relative mb-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 flex items-center justify-center animate-float">
                    {isFiltered ? (
                        <SearchIcon className="w-9 h-9 text-indigo-400 dark:text-indigo-500" />
                    ) : viewMode === 'archived' ? (
                        <ArchiveBoxIcon className="w-9 h-9 text-indigo-400 dark:text-indigo-500" />
                    ) : (
                        <AiIcon className="w-9 h-9 text-indigo-500 dark:text-indigo-400" />
                    )}
                </div>
                {/* Decorative dots */}
                <div className="absolute -top-2 -right-2 w-3 h-3 rounded-full bg-violet-300 dark:bg-violet-600 opacity-60" />
                <div className="absolute -bottom-1 -left-3 w-2 h-2 rounded-full bg-indigo-300 dark:bg-indigo-600 opacity-50" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm leading-relaxed mb-6">
                {message}
            </p>

            {showAction && (
                <button
                    onClick={onAddNote}
                    className="btn-gradient px-6 py-2.5 text-sm flex items-center gap-2 group"
                >
                    <PlusIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                    Create your first note
                </button>
            )}

            {/* Feature hints for new users */}
            {showAction && (
                <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg">
                    {[
                        { emoji: '📍', text: 'Pin notes to locations' },
                        { emoji: '🤖', text: 'AI-powered search' },
                        { emoji: '📱', text: 'Works offline' },
                    ].map((hint) => (
                        <div key={hint.text} className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                            <span className="text-base">{hint.emoji}</span>
                            <span>{hint.text}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
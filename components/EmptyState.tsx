import React from 'react';
import { PlusIcon } from './Icons';

interface EmptyStateProps {
    onAddNote: () => void;
    viewMode: 'active' | 'archived';
    isFiltered: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onAddNote, viewMode, isFiltered }) => {
    let title = "You're all clear!";
    let message = "You don't have any active notes. Ready to create one?";

    if (isFiltered) {
        title = "No notes found";
        message = "Try adjusting your search or filters.";
    } else if (viewMode === 'archived') {
        title = "Archive is empty";
        message = "You don't have any archived notes.";
    }

    return (
        <div className="text-center py-20 px-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-md text-gray-500 dark:text-gray-400">{message}</p>
            {!isFiltered && viewMode === 'active' && (
                <div className="mt-6">
                    <button
                        type="button"
                        onClick={onAddNote}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                        New Note
                    </button>
                </div>
            )}
        </div>
    );
};
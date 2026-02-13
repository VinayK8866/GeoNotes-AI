import React from 'react';

export const NoteCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 border-l-4 border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="flex items-center space-x-2">
          <div className="h-5 w-5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
          <div className="h-5 w-5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
      <div className="flex items-center text-sm mb-4">
        <div className="h-4 w-4 bg-gray-300 dark:bg-gray-700 rounded-full mr-2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
      </div>
      <div className="flex justify-between items-end mt-auto pt-2">
        <div className="h-6 w-20 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
        <div className="h-4 w-16 bg-gray-300 dark:bg-gray-700 rounded"></div>
      </div>
    </div>
  );
};
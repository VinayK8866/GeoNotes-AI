import React from 'react';

export const NoteCardSkeleton: React.FC = () => {
  return (
    <div className="pro-card p-5">
      <div className="flex justify-between items-start mb-4">
        <div className="h-4 skeleton-shimmer rounded-md w-3/4"></div>
        <div className="flex items-center space-x-1.5">
          <div className="h-4 w-4 skeleton-shimmer rounded-md"></div>
          <div className="h-4 w-4 skeleton-shimmer rounded-md"></div>
        </div>
      </div>
      <div className="space-y-2.5 mb-4">
        <div className="h-3 skeleton-shimmer rounded w-full"></div>
        <div className="h-3 skeleton-shimmer rounded w-5/6"></div>
        <div className="h-3 skeleton-shimmer rounded w-1/2"></div>
      </div>
      <div className="pt-3 border-t border-slate-100 dark:border-slate-700/40 flex justify-between items-center">
        <div className="h-5 w-16 skeleton-shimmer rounded-md"></div>
        <div className="h-3 w-12 skeleton-shimmer rounded"></div>
      </div>
    </div>
  );
};
import React from 'react';
import { LoadingSkeleton } from './LoadingSkeleton';

export const AppSkeleton: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0b1121] transition-colors duration-300 relative overflow-hidden">
      
      {/* Sidebar Skeleton */}
      <div className="hidden lg:flex w-[260px] h-screen bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-[#1e2d45] flex-col p-6 space-y-8 flex-shrink-0 animate-pulse">
        <div className="h-8 w-32 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
        <div className="space-y-4 pt-4">
          <div className="h-4 w-full bg-slate-50 dark:bg-slate-800/50 rounded"></div>
          <div className="h-4 w-5/6 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
          <div className="h-4 w-4/6 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
        </div>
        <div className="mt-auto space-y-4">
          <div className="h-10 w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl"></div>
          <div className="h-10 w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl"></div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Header Skeleton */}
        <div className="h-14 w-full bg-white dark:bg-[#0f172a]/50 backdrop-blur-md border-b border-slate-200 dark:border-[#1e2d45] flex items-center justify-between px-4 sm:px-8 flex-shrink-0 animate-pulse">
          <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-lg sm:hidden"></div>
          <div className="h-8 w-1/3 max-w-[400px] bg-slate-50 dark:bg-slate-800/50 rounded-xl mx-4"></div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
            <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
          </div>
        </div>

        {/* Scrollable Content Skeleton */}
        <div className="flex-grow p-4 sm:p-8 space-y-8 overflow-y-auto">
          {/* Welcome Strip Skeleton */}
          <div className="h-28 w-full bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/10 animate-pulse"></div>
          
          {/* Map Section Skeleton */}
          <div className="h-[40vh] min-h-[300px] w-full bg-slate-100/50 dark:bg-slate-800/20 rounded-2xl border border-slate-200/50 dark:border-[#1e2d45] animate-pulse"></div>

          {/* Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <LoadingSkeleton variant="card" className="pro-card h-48 bg-white dark:bg-[#131c2e]" />
            <LoadingSkeleton variant="card" className="pro-card h-48 bg-white dark:bg-[#131c2e]" />
            <LoadingSkeleton variant="card" className="pro-card h-48 bg-white dark:bg-[#131c2e]" />
          </div>
        </div>
      </div>
    </div>
  );
};

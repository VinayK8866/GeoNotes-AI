import React, { useEffect } from 'react';
import { CloseIcon } from './Icons';

interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed top-4 right-4 max-w-sm bg-white dark:bg-[#131c2e] rounded-xl p-4 shadow-lg border border-red-200 dark:border-red-900/30 z-[300] animate-toast flex items-start gap-3">
      <div className="flex-shrink-0 w-1 self-stretch bg-red-500 rounded-full" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-0.5">Error</p>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-1 rounded-md text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors"
      >
        <CloseIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

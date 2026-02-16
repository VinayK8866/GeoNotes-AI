import React from 'react';
import { UndoIcon } from './Icons';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({ message, onUndo }) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-[#131c2e] text-white rounded-xl py-3 px-5 shadow-xl flex items-center gap-4 z-[300] animate-fade-in-up border border-slate-700 dark:border-[#1e2d45]">
      <p className="text-sm">{message}</p>
      <button
        onClick={onUndo}
        className="flex items-center gap-1.5 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        <UndoIcon className="w-4 h-4" />
        Undo
      </button>
    </div>
  );
};
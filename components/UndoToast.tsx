import React, { useEffect } from 'react';
import { UndoIcon } from './Icons';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({ message, onUndo }) => {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-gray-900 text-white py-3 px-5 rounded-lg shadow-lg flex items-center justify-between z-30 border border-gray-700 animate-fade-in-up">
      <style>{`
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
      <p className="mr-4">{message}</p>
      <button 
        onClick={onUndo} 
        className="flex items-center font-semibold text-indigo-400 hover:text-indigo-300"
      >
        <UndoIcon className="w-5 h-5 mr-2" />
        Undo
      </button>
    </div>
  );
};
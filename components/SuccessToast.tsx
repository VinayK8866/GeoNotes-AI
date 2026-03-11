import React, { useEffect } from 'react';
import { CheckIcon, CloseIcon } from './Icons';

interface SuccessToastProps {
    message: string;
    onDismiss: () => void;
    duration?: number;
}

export const SuccessToast: React.FC<SuccessToastProps> = ({ message, onDismiss, duration = 4000 }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, duration);
        return () => clearTimeout(timer);
    }, [onDismiss, duration]);

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[5000] animate-slide-in-up">
            <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center gap-3 min-w-[300px]">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <CheckIcon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold">Success!</p>
                    <p className="text-xs opacity-90">{message}</p>
                </div>
                <button 
                    onClick={onDismiss}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                    <CloseIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

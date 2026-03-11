import React from 'react';
import { SparklesIcon, CloseIcon, HeartIcon } from './Icons';

interface AppreciationModalProps {
    onClose: () => void;
    onFeedback?: () => void;
    noteCount: number;
}

export const AppreciationModal: React.FC<AppreciationModalProps> = ({ onClose, onFeedback, noteCount }) => {
    return (
        <div className="fixed inset-0 z-[4000] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="glass-card w-full max-w-sm overflow-hidden animate-slide-in-up sm:animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <div className="relative p-8 text-center pt-12">
                    {/* Decorative Background */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
                    
                    {/* Icon Badge */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/20 animate-float">
                            <SparklesIcon className="w-7 h-7 text-white" />
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <CloseIcon className="w-4 h-4" />
                    </button>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">You're on a roll! ✍️</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                        That's your <span className="font-bold text-indigo-600 dark:text-indigo-400">{noteCount}th note</span> pinned to the map. 
                        We hope GeoNotes AI is helping you stay organized!
                    </p>

                    <div className="space-y-3">
                        <button 
                            onClick={() => {
                                if (onFeedback) onFeedback();
                                // Close is handled by onFeedback or here
                                onClose();
                            }}
                            className="btn-gradient w-full py-3 text-sm flex items-center justify-center gap-2"
                        >
                            <SparklesIcon className="w-4 h-4" />
                            Invite a Friend & Share
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            I'll share later
                        </button>
                    </div>
                </div>
                
                {/* Footer Quote */}
                <div className="px-8 py-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-[#1e2d45] text-center">
                    <p className="text-[10px] text-slate-400">Keep exploring your world.</p>
                </div>
            </div>
        </div>
    );
};

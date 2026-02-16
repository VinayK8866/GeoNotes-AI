import React from 'react';
import { SparklesIcon, CheckIcon, BoltIcon, CloseIcon } from './Icons';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: () => void;
    limitType: 'notes' | 'aiSearches';
    currentCount: number;
    limit: number;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
    isOpen, onClose, onUpgrade, limitType, currentCount, limit,
}) => {
    if (!isOpen) return null;

    const messages = {
        notes: {
            title: 'Note limit reached',
            subtitle: `You've used ${currentCount} of ${limit} notes on the free plan.`,
        },
        aiSearches: {
            title: 'AI searches used up',
            subtitle: `You've used ${currentCount} of ${limit} daily AI searches.`,
        },
    };

    const proFeatures = [
        'Unlimited notes',
        'Unlimited AI searches',
        'Cross-device sync',
        'Priority support',
        'Advanced exports',
    ];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1500] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="glass-card w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="relative p-6 pb-0">
                    <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <CloseIcon className="w-4 h-4" />
                    </button>

                    {/* Icon */}
                    <div className="flex justify-center mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-pulse-glow">
                            <BoltIcon className="w-7 h-7 text-white" />
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center mb-1.5">
                        {messages[limitType].title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4">
                        {messages[limitType].subtitle}
                    </p>

                    {/* Usage bar */}
                    <div className="mb-5">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                            <span>{currentCount} used</span>
                            <span>{limit} limit</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-400 to-red-500 rounded-full transition-all" style={{ width: `${Math.min((currentCount / limit) * 100, 100)}%` }} />
                        </div>
                    </div>
                </div>

                {/* Comparison table */}
                <div className="px-6 pb-4">
                    <div className="bg-slate-50 dark:bg-[#0b1121]/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <SparklesIcon className="w-4 h-4 text-indigo-500" />
                            <span className="text-xs font-bold text-slate-900 dark:text-white">Pro Plan — $8/mo</span>
                        </div>
                        <ul className="space-y-2">
                            {proFeatures.map(f => (
                                <li key={f} className="flex items-center gap-2">
                                    <CheckIcon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                    <span className="text-xs text-slate-600 dark:text-slate-400">{f}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 space-y-2.5">
                    <button onClick={onUpgrade} className="btn-gradient w-full py-2.5 text-sm">
                        Upgrade to Pro
                    </button>
                    <button onClick={onClose} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    );
};

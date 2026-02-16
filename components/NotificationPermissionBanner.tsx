import React from 'react';
import { SparklesIcon, CloseIcon } from './Icons';

interface NotificationPermissionBannerProps {
  status: 'default' | 'denied';
  onRequest?: () => void;
  onDismiss?: () => void;
}

export const NotificationPermissionBanner: React.FC<NotificationPermissionBannerProps> = ({ status, onRequest, onDismiss }) => {
  return (
    <div className="notification-banner animate-fade-in-up">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
          <SparklesIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <p className="text-xs font-medium">
          {status === 'default'
            ? 'Enable notifications to get reminders when you\u2019re near your notes.'
            : 'Notifications are blocked. Enable them in your browser settings for the best experience.'}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {status === 'default' && onRequest && (
          <button
            onClick={onRequest}
            className="btn-gradient text-[11px] px-4 py-1.5"
          >
            Enable
          </button>
        )}
        {onDismiss && (
          <button onClick={onDismiss} className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
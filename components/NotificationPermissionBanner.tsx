import React from 'react';

interface NotificationPermissionBannerProps {
  status: 'default' | 'denied';
  onRequest?: () => void;
}

export const NotificationPermissionBanner: React.FC<NotificationPermissionBannerProps> = ({ status, onRequest }) => {
  return (
    <div className="bg-indigo-100 dark:bg-indigo-900/50 border-b border-indigo-200 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200 text-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-4">
          <p>
            {status === 'default'
              ? 'Enable notifications to get reminders when you are near your notes.'
              : 'Notifications are blocked. Please enable them in your browser settings to get reminders.'}
          </p>
          {status === 'default' && onRequest && (
            <button
              onClick={onRequest}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 rounded-md transition-colors whitespace-nowrap"
            >
              Enable Notifications
            </button>
          )}
        </div>
    </div>
  );
};
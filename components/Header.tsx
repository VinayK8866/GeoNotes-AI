import React from 'react';
import { Session } from '@supabase/supabase-js';
import { LocationPinIcon } from './Icons';

interface HeaderProps {
    session: Session | null;
    onSignOut: () => void;
    isOnline: boolean;
    isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({ session, onSignOut, isOnline, isSyncing }) => {
  
  const getAvatarUrl = () => {
    if (!session?.user) return null;
    
    const fromMetadata = session.user.user_metadata?.avatar_url;
    if (fromMetadata) return fromMetadata;

    const googleIdentity = session.user.identities?.find(id => id.provider === 'google');
    return googleIdentity?.identity_data?.avatar_url || googleIdentity?.identity_data?.picture || null;
  }
  
  const avatarUrl = getAvatarUrl();

  return (
    <header className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-700">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <LocationPinIcon className="h-8 w-8 text-indigo-400" />
            <div className="flex items-center gap-3 ml-3">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                    GeoNotes <span className="text-indigo-400">AI</span>
                </h1>
                {!isOnline ? (
                    <span className="bg-yellow-500 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">Offline</span>
                ) : isSyncing ? (
                    <span className="text-gray-400 text-xs font-bold animate-pulse">Syncing...</span>
                ) : null}
            </div>
          </div>
          <div>
            {session && (
                <div className="flex items-center gap-4">
                    {avatarUrl ? (
                      <img 
                          src={avatarUrl} 
                          alt={session.user.user_metadata?.full_name || 'User avatar'}
                          className="w-9 h-9 rounded-full border-2 border-gray-600 object-cover"
                          referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full border-2 border-gray-600 bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                        {session.user.user_metadata?.full_name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <button 
                        onClick={onSignOut}
                        className="text-sm font-semibold text-gray-300 hover:text-white transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
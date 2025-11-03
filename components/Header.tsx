import React from 'react';
import { Session } from '@supabase/supabase-js';
import { LocationPinIcon } from './Icons';

interface HeaderProps {
    session: Session | null;
    onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({ session, onSignOut }) => {
  return (
    <header className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-700">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <LocationPinIcon className="h-8 w-8 text-indigo-400" />
            <h1 className="text-2xl font-bold ml-3 tracking-tight text-white">
              GeoNotes <span className="text-indigo-400">AI</span>
            </h1>
          </div>
          <div>
            {session && (
                <div className="flex items-center gap-4">
                    <img 
                        src={session.user.user_metadata?.avatar_url} 
                        alt={session.user.user_metadata?.full_name || 'User avatar'}
                        className="w-9 h-9 rounded-full border-2 border-gray-600"
                    />
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
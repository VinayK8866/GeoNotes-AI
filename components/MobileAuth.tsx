import React from 'react';
import { AiIcon, GoogleIcon, LocationPinIcon } from './Icons';

interface MobileAuthProps {
  onSignIn: () => void;
  isLoading?: boolean;
}

export const MobileAuth: React.FC<MobileAuthProps> = ({ onSignIn, isLoading }) => {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#0b1121] justify-center items-center p-8 animate-fade-in">
      <div className="w-full max-w-sm space-y-12 text-center">
        {/* App Logo & Branding */}
        <div className="space-y-6">
          <div className="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/20 animate-scale-in">
            <LocationPinIcon className="w-12 h-12 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">GeoNotes AI</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Your World, Noted.</p>
          </div>
        </div>

        {/* Action Illustration/Icon Grid */}
        <div className="grid grid-cols-2 gap-4 opacity-40">
           <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center gap-2">
              <LocationPinIcon className="w-6 h-6 text-indigo-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Pin</span>
           </div>
           <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center gap-2">
              <AiIcon className="w-6 h-6 text-violet-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest">AI</span>
           </div>
        </div>

        {/* Authentication Options */}
        <div className="space-y-4 pt-8">
          <button
            onClick={onSignIn}
            disabled={isLoading}
            className="w-full group flex items-center justify-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <GoogleIcon className="w-6 h-6" />
                <span>Continue with Google</span>
              </>
            )}
          </button>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 px-4 leading-relaxed">
            By continuing, you agree to our Terms and Privacy Policy. 
            All your location data is encrypted on-device.
          </p>
        </div>
      </div>

      {/* Background Blobs for Premium Feel */}
      <div className="fixed -top-10 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-10 -left-10 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};

export const MobileSplash: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#0b1121] justify-center items-center animate-fade-in">
       <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
             <LocationPinIcon className="w-8 h-8 text-white animate-bounce-short" />
          </div>
       </div>
       <div className="mt-8">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">GeoNotes</h2>
       </div>
    </div>
  );
};

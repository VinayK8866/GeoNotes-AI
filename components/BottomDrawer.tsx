import React, { useEffect, useState } from 'react';

interface BottomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const BottomDrawer: React.FC<BottomDrawerProps> = ({ isOpen, onClose, children, title }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Wait for next tick to start animation
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      // Wait for animation to finish before unmounting
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <div className={`bottom-drawer ${isAnimating ? 'open' : 'closing'}`}>
      <div 
        className="bottom-drawer-backdrop" 
        onClick={onClose}
      />
      <div className="bottom-drawer-content">
        <div className="bottom-drawer-handle md:hidden" />
        {title && (
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#131c2e] sticky top-0 z-10">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
            <button 
              onClick={onClose}
              className="p-2 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-grow h-full custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

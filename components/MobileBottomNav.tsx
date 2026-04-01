import React from 'react';
import { MapIcon, DocumentTextIcon, PlusIcon, AiIcon, CogIcon } from './Icons';
import { Capacitor } from '@capacitor/core';

// Safe haptics helper that won't crash on bundling
const triggerHaptics = async (style: 'LIGHT' | 'MEDIUM' | 'HEAVY') => {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle[style] });
    } catch (e) {
      console.warn('Haptics not available:', e);
    }
  }
};

export type MobileTab = 'map' | 'notes' | 'ai' | 'settings';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  onAddClick: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, onTabChange, onAddClick }) => {
  const handleTabClick = (tab: MobileTab) => {
    triggerHaptics('LIGHT');
    onTabChange(tab);
  };

  const handleAddClick = () => {
    triggerHaptics('MEDIUM');
    onAddClick();
  };

  return (
    <nav className="mobile-bottom-nav md:hidden" aria-label="Mobile navigation">
      <button 
        onClick={() => handleTabClick('map')}
        className={`mobile-nav-item ${activeTab === 'map' ? 'active' : ''}`}
      >
        <MapIcon className="w-6 h-6" />
        <span>Map</span>
      </button>
      <button 
        onClick={() => handleTabClick('notes')}
        className={`mobile-nav-item ${activeTab === 'notes' ? 'active' : ''}`}
      >
        <DocumentTextIcon className="w-6 h-6" />
        <span>Notes</span>
      </button>
      
      <button 
        onClick={handleAddClick}
        className="mobile-nav-item relative"
        aria-label="Add note"
      >
        <div className="mobile-nav-fab active:scale-95 transition-transform">
          <PlusIcon className="w-7 h-7" />
        </div>
      </button>
      
      <button 
        onClick={() => handleTabClick('ai')}
        className={`mobile-nav-item ${activeTab === 'ai' ? 'active' : ''}`}
      >
        <AiIcon className="w-6 h-6" />
        <span>AI Search</span>
      </button>
      
      <button 
        onClick={() => handleTabClick('settings')}
        className={`mobile-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
      >
        <CogIcon className="w-6 h-6" />
        <span>Settings</span>
      </button>
    </nav>
  );
};

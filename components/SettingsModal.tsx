
import React from 'react';
import { LocationAccuracy } from '../types';
import { CloseIcon, LocationPinIcon, BatteryIcon, ShieldCheckIcon, EyeOpenIcon, EyeClosedIcon } from './Icons';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    accuracy: LocationAccuracy;
    onAccuracyChange: (accuracy: LocationAccuracy) => void;
    encryptionEnabled: boolean;
    onEncryptionToggle: (enabled: boolean) => void;
    masterPassword: string;
    onMasterPasswordChange: (password: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, accuracy, onAccuracyChange,
    encryptionEnabled, onEncryptionToggle, masterPassword, onMasterPasswordChange
}) => {
    const [showPassword, setShowPassword] = React.useState(false);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[1300] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Settings</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Location Accuracy</h3>
                    
                    <div className="space-y-4">
                        <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${accuracy === 'high' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                            <input type="radio" name="accuracy" value="high" checked={accuracy === 'high'} onChange={() => onAccuracyChange('high')} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                            <div className="ml-3 flex-grow">
                                <div className="flex items-center">
                                    <span className="block text-sm font-medium text-gray-900 dark:text-white">High Accuracy</span>
                                    <LocationPinIcon className="w-4 h-4 ml-2 text-indigo-500" />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Best for precise reminders. Uses GPS (more battery).</p>
                            </div>
                        </label>

                        <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${accuracy === 'low' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                            <input type="radio" name="accuracy" value="low" checked={accuracy === 'low'} onChange={() => onAccuracyChange('low')} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                            <div className="ml-3 flex-grow">
                                <div className="flex items-center">
                                    <span className="block text-sm font-medium text-gray-900 dark:text-white">Low Accuracy</span>
                                    <BatteryIcon className="w-4 h-4 ml-2 text-green-500" />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Approximated location. Uses WiFi/Cell (saves battery).</p>
                            </div>
                        </label>
                    </div>

                    <div className="mt-8">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                             Security
                             <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full">New</span>
                        </h3>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <div>
                                    <h4 className="text-sm font-medium dark:text-white">End-to-End Encryption</h4>
                                    <p className="text-xs text-gray-500">Encrypt notes before syncing.</p>
                                </div>
                                <button 
                                    onClick={() => onEncryptionToggle(!encryptionEnabled)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${encryptionEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${encryptionEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {encryptionEnabled && (
                                <div className="space-y-2 animate-fade-in">
                                    <label className="text-xs font-medium text-gray-500">Master Password (Local Only)</label>
                                    <div className="relative">
                                        <input 
                                            type={showPassword ? 'text' : 'password'}
                                            value={masterPassword}
                                            onChange={(e) => onMasterPasswordChange(e.target.value)}
                                            placeholder="Enter strong password..."
                                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <button 
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeClosedIcon className="w-4 h-4" /> : <EyeOpenIcon className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-amber-600 dark:text-amber-500 leading-tight">
                                        ⚠️ Warning: We cannot recover this password. If lost, your encrypted notes are gone forever.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

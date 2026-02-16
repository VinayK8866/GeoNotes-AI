import React, { useState } from 'react';
import { LocationPinIcon, SparklesIcon, CloudIcon, CheckIcon, CloseIcon } from './Icons';
import { trackEvent } from '../services/analyticsService';

interface OnboardingFlowProps {
    onComplete: () => void;
    onSkip: () => void;
    userName?: string;
    onRequestLocation?: () => Promise<void>;
}

const steps = [
    {
        id: 1,
        title: 'Welcome aboard! 👋',
        getDescription: (name?: string) => `Hey${name ? ` ${name}` : ''}! GeoNotes AI helps you capture ideas and pin them to the real world.`,
        icon: SparklesIcon,
        color: 'from-indigo-500 to-violet-500',
    },
    {
        id: 2,
        title: 'Enable Location',
        getDescription: () => 'Allow location access to pin notes to places and get proximity reminders.',
        icon: LocationPinIcon,
        color: 'from-blue-500 to-cyan-500',
        action: 'location',
    },
    {
        id: 3,
        title: 'Stay Updated',
        getDescription: () => 'Enable notifications to get reminded when you\'re near your pinned notes.',
        icon: CloudIcon,
        color: 'from-emerald-500 to-teal-500',
        action: 'notification',
    },
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onSkip, userName, onRequestLocation }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [locationGranted, setLocationGranted] = useState(false);
    const [notificationGranted, setNotificationGranted] = useState(false);

    const step = steps[currentStep];
    const isLastStep = currentStep === steps.length - 1;

    const handleNext = () => {
        trackEvent.onboardingStepCompleted(currentStep + 1, step.title);
        if (isLastStep) {
            onComplete();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleAction = async () => {
        if (step.action === 'location') {
            try {
                if (onRequestLocation) {
                    await onRequestLocation();
                    setLocationGranted(true);
                    handleNext(); // Auto-advance on success
                } else {
                    // Fallback if no prop provided (shouldn't happen in new flow)
                    await new Promise<void>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(() => { setLocationGranted(true); resolve(); }, reject);
                    });
                    handleNext();
                }
            } catch {
                /* user denied */
                console.log('Location permission denied via onboarding');
            }
        } else if (step.action === 'notification') {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') setNotificationGranted(true);
            } catch { /* not supported */ }
            handleNext();
        }
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="glass-card w-full max-w-md mx-4 animate-scale-in overflow-hidden">
                {/* Skip button */}
                <div className="flex justify-end p-4 pb-0">
                    <button
                        onClick={onSkip}
                        className="text-xs text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        Skip setup
                    </button>
                </div>

                {/* Content */}
                <div className="px-8 pb-8 pt-2 text-center">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg animate-float`}>
                            <step.icon className="w-8 h-8 text-white" />
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{step.title}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">
                        {step.getDescription(userName)}
                    </p>

                    {/* Action or Next */}
                    <div className="space-y-3">
                        {step.action ? (
                            <>
                                <button onClick={handleAction} className="btn-gradient w-full py-3 text-sm">
                                    {step.action === 'location' ? 'Allow Location Access' : 'Enable Notifications'}
                                </button>
                                <button onClick={handleNext} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                    Skip this step
                                </button>
                            </>
                        ) : (
                            <button onClick={handleNext} className="btn-gradient w-full py-3 text-sm">
                                {isLastStep ? 'Get Started' : 'Continue'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress Dots */}
                <div className="flex justify-center gap-2 pb-6">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-indigo-500' : i < currentStep ? 'w-1.5 bg-indigo-300' : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                                }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

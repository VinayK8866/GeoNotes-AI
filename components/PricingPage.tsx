import React, { useState } from 'react';
import { CheckIcon, SparklesIcon, LocationPinIcon, CloseIcon } from './Icons';

interface PricingPageProps {
    onSelectPlan: (priceId: string) => void;
    currentPlan: 'free' | 'pro' | 'teams';
}

interface PricingTier {
    name: string;
    priceMonthly: string;
    priceYearly: string;
    priceId: string;
    description: string;
    features: string[];
    popular?: boolean;
    cta: string;
}

const tiers: PricingTier[] = [
    {
        name: 'Free',
        priceMonthly: '$0',
        priceYearly: '$0',
        priceId: 'free',
        description: 'Perfect for getting started with location-aware notes.',
        cta: 'Current Plan',
        features: [
            'Up to 50 notes',
            '5 AI searches per day',
            'Basic location tagging',
            'Offline support',
            'Single device',
        ],
    },
    {
        name: 'Pro',
        priceMonthly: '$8',
        priceYearly: '$80',
        priceId: 'pro_monthly',
        description: 'For power users who need unlimited notes and AI.',
        cta: 'Upgrade to Pro',
        popular: true,
        features: [
            'Unlimited notes',
            'Unlimited AI searches',
            'Advanced location features',
            'Priority sync',
            'Cross-device access',
            'Export & backup',
            'Priority support',
        ],
    },
    {
        name: 'Teams',
        priceMonthly: '$15',
        priceYearly: '$150',
        priceId: 'teams_monthly',
        description: 'Collaborate with your team on shared maps and notes.',
        cta: 'Contact Sales',
        features: [
            'Everything in Pro',
            'Shared workspaces',
            'Team note collaboration',
            'Admin dashboard',
            'SSO & SAML',
            'Audit logs',
            'Dedicated support',
        ],
    },
];

const faqItems = [
    {
        q: 'Can I change plans later?',
        a: 'Yes, you can upgrade, downgrade, or cancel your plan at any time. Changes take effect immediately.',
    },
    {
        q: 'What happens to my notes if I downgrade?',
        a: 'Your notes are never deleted. On the free plan, you can still access all existing notes but won\'t be able to create new ones beyond the limit.',
    },
    {
        q: 'Is there a refund policy?',
        a: 'Yes, we offer a 14-day money-back guarantee for all paid plans. No questions asked.',
    },
];

export const PricingPage: React.FC<PricingPageProps> = ({ onSelectPlan, currentPlan }) => {
    const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

    return (
        <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12 animate-fade-in-up">
                    <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-4 py-1.5 rounded-full text-xs font-semibold mb-4">
                        <SparklesIcon className="w-3.5 h-3.5" /> Simple, transparent pricing
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-3">
                        Choose your plan
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        Start free and upgrade when you need more. All plans include core features.
                    </p>
                </div>

                {/* Billing Toggle */}
                <div className="flex justify-center mb-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <div className="inline-flex items-center bg-slate-100 dark:bg-[#1a2540] p-1 rounded-xl">
                        <button
                            onClick={() => setBillingInterval('month')}
                            className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all ${billingInterval === 'month' ? 'bg-white dark:bg-[#131c2e] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingInterval('year')}
                            className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${billingInterval === 'year' ? 'bg-white dark:bg-[#131c2e] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            Yearly
                            <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md">Save 17%</span>
                        </button>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-5 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    {tiers.map(tier => {
                        const isCurrentPlan = tier.name.toLowerCase() === currentPlan;
                        const price = billingInterval === 'month' ? tier.priceMonthly : tier.priceYearly;
                        const priceId = billingInterval === 'year' ? tier.priceId.replace('monthly', 'yearly') : tier.priceId;

                        return (
                            <div
                                key={tier.name}
                                className={`relative rounded-2xl p-6 flex flex-col transition-all ${tier.popular
                                    ? 'bg-gradient-to-b from-indigo-600 via-indigo-700 to-violet-800 text-white shadow-xl shadow-indigo-500/20 ring-1 ring-indigo-400/30 scale-[1.02]'
                                    : 'pro-card'
                                    }`}
                            >
                                {/* Popular badge */}
                                {tier.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 text-[10px] font-extrabold px-4 py-1 rounded-full shadow-md uppercase tracking-wider">
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                <div className="mb-5">
                                    <h3 className={`text-sm font-bold mb-1 ${tier.popular ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{tier.name}</h3>
                                    <p className={`text-xs leading-relaxed ${tier.popular ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>{tier.description}</p>
                                </div>

                                <div className="mb-5">
                                    <span className={`text-4xl font-extrabold ${tier.popular ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{price}</span>
                                    {price !== '$0' && (
                                        <span className={`text-xs ml-1 ${tier.popular ? 'text-indigo-200' : 'text-slate-500'}`}>
                                            /{billingInterval === 'month' ? 'mo' : 'yr'}
                                        </span>
                                    )}
                                </div>

                                <ul className="space-y-2.5 mb-7 flex-grow">
                                    {tier.features.map(feature => (
                                        <li key={feature} className="flex items-start gap-2">
                                            <CheckIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${tier.popular ? 'text-indigo-200' : 'text-emerald-500'}`} />
                                            <span className={`text-xs leading-snug ${tier.popular ? 'text-indigo-100' : 'text-slate-600 dark:text-slate-400'}`}>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => !isCurrentPlan && onSelectPlan(priceId)}
                                    disabled={isCurrentPlan}
                                    className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${isCurrentPlan
                                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                        : tier.popular
                                            ? 'bg-white text-indigo-700 hover:bg-slate-50 shadow-md hover:shadow-lg hover:-translate-y-0.5'
                                            : 'btn-gradient'
                                        }`}
                                >
                                    {isCurrentPlan ? 'Current Plan' : tier.cta}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* FAQ */}
                <div className="mt-20 max-w-2xl mx-auto">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-8">Common Questions</h3>
                    <div className="space-y-4">
                        {faqItems.map(item => (
                            <div key={item.q} className="pro-card p-5">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">{item.q}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

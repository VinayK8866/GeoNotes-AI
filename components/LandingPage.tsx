import React from 'react';
import { LocationPinIcon, SparklesIcon, CloudIcon, ShieldCheckIcon, GoogleIcon, CheckIcon, UsersIcon, BoltIcon } from './Icons';

interface LandingPageProps {
    onSignIn: () => void;
}

const pricingTiers = [
    {
        name: 'Free',
        priceMonthly: '$0',
        priceYearly: '$0',
        description: 'Perfect for getting started with location-aware notes.',
        features: ['Up to 50 notes', '5 AI searches/day', 'Basic location tagging', 'Offline support'],
        cta: 'Get Started Free',
        popular: false
    },
    {
        name: 'Pro',
        priceMonthly: '$8',
        priceYearly: '$80',
        description: 'For power users who need unlimited notes and AI.',
        features: ['Unlimited notes', 'Unlimited AI searches', 'Advanced location features', 'Priority sync', 'Cross-device access'],
        cta: 'Start Free Trial',
        popular: true
    },
    {
        name: 'Teams',
        priceMonthly: '$15',
        priceYearly: '$150',
        description: 'Collaborate with your team on shared maps.',
        features: ['Everything in Pro', 'Shared workspaces', 'Team collaboration', 'Admin dashboard', 'Audit logs'],
        cta: 'Contact Sales',
        popular: false
    }
];

const features = [
    { icon: LocationPinIcon, title: 'Location-Aware', description: 'Pin notes to any place in the world — get reminders when you arrive.', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { icon: SparklesIcon, title: 'AI-Powered', description: 'Ask questions about your notes and get instant, intelligent answers.', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { icon: CloudIcon, title: 'Offline-First', description: 'Works without internet and syncs seamlessly when back online.', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { icon: ShieldCheckIcon, title: 'Secure & Private', description: 'End-to-end encrypted. Your data never leaves your account.', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { icon: UsersIcon, title: 'Team Sharing', description: 'Share notes and maps with your team — collaborate in real-time.', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
    { icon: BoltIcon, title: 'Blazing Fast', description: 'Built with modern tech for instant load times and smooth interactions.', color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
];

const stats = [
    { number: '10K+', label: 'Active Users' },
    { number: '500K+', label: 'Notes Created' },
    { number: '99.9%', label: 'Uptime' },
    { number: '4.9★', label: 'App Rating' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn }) => {
    const [billingInterval, setBillingInterval] = React.useState<'month' | 'year'>('month');

    return (
        <div className="min-h-screen bg-white dark:bg-[#0b1121] overflow-x-hidden">
            {/* ===== Navbar ===== */}
            <nav className="sticky top-0 z-50 glass-panel">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20">
                            <LocationPinIcon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">GeoNotes<span className="text-gradient">AI</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                        <a href="#features" className="hidden sm:inline text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Features</a>
                        <a href="#pricing" className="hidden sm:inline text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Pricing</a>
                        <a href="#social-proof" className="hidden sm:inline text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">About</a>
                        <button onClick={onSignIn} className="btn-gradient text-xs px-4 py-2">Get Started</button>
                    </div>
                </div>
            </nav>

            {/* ===== Hero ===== */}
            <section className="relative pt-20 pb-24 sm:pt-28 sm:pb-32">
                {/* Animated gradient background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                    <div className="absolute -top-[40%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-indigo-400/20 via-violet-400/15 to-pink-400/10 dark:from-indigo-600/15 dark:via-violet-600/10 dark:to-pink-600/5 blur-3xl animate-gradient" />
                    <div className="absolute top-20 right-[15%] w-2 h-2 rounded-full bg-indigo-400 dark:bg-indigo-500 opacity-60 animate-float" style={{ animationDelay: '0.5s' }} />
                    <div className="absolute top-40 left-[10%] w-3 h-3 rounded-full bg-violet-400 dark:bg-violet-500 opacity-40 animate-float" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-32 right-[30%] w-1.5 h-1.5 rounded-full bg-pink-400 opacity-50 animate-float" style={{ animationDelay: '1.5s' }} />
                </div>

                <div className="max-w-3xl mx-auto text-center px-4 relative">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 animate-fade-in-up">
                        <SparklesIcon className="w-3.5 h-3.5" />
                        Now with AI-powered search
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        Your Notes,{' '}
                        <span className="text-gradient">Everywhere</span>
                    </h1>

                    <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                        The intelligent, location-aware note-taking app. Pin ideas to places, search with AI, and stay organized — even offline.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                        <button onClick={onSignIn} className="btn-gradient px-8 py-3 text-base flex items-center gap-2.5 w-full sm:w-auto justify-center">
                            <GoogleIcon className="w-4 h-4" />
                            Get Started Free
                        </button>
                        <a href="#features" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            See how it works ↓
                        </a>
                    </div>

                    <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500 animate-fade-in-up" style={{ animationDelay: '400ms' }}>Free forever plan • No credit card required</p>
                </div>
            </section>

            {/* ===== Social Proof Stats ===== */}
            <section id="social-proof" className="py-12 border-y border-slate-100 dark:border-[#1e2d45]">
                <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
                    {stats.map(stat => (
                        <div key={stat.label} className="animate-fade-in-up">
                            <div className="text-2xl sm:text-3xl font-extrabold text-gradient">{stat.number}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== Features Grid ===== */}
            <section id="features" className="py-20 sm:py-24">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3">
                            Everything you need
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                            A complete toolkit for capturing and organizing your ideas, powered by AI and location intelligence.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
                        {features.map(feature => (
                            <div key={feature.title} className="pro-card p-6 group">
                                <div className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <feature.icon className={`w-5 h-5 ${feature.color}`} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">{feature.title}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== Pricing Section ===== */}
            <section id="pricing" className="py-20 sm:py-24 bg-slate-50 dark:bg-[#0f1729]">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3">
                            Simple, transparent pricing
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-8">
                            Start free and upgrade when you need more. No credit card required.
                        </p>

                        {/* Billing Toggle */}
                        <div className="inline-flex items-center bg-white dark:bg-[#1a2540] p-1 rounded-xl shadow-sm border border-slate-200 dark:border-[#1e2d45]">
                            <button
                                onClick={() => setBillingInterval('month')}
                                className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all ${billingInterval === 'month' ? 'bg-slate-100 dark:bg-[#131c2e] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingInterval('year')}
                                className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${billingInterval === 'year' ? 'bg-slate-100 dark:bg-[#131c2e] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                Yearly
                                <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md">Save 17%</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 stagger-children">
                        {pricingTiers.map(tier => (
                            <div
                                key={tier.name}
                                className={`relative rounded-2xl p-6 flex flex-col transition-all ${tier.popular
                                    ? 'bg-gradient-to-b from-indigo-600 via-indigo-700 to-violet-800 text-white shadow-xl shadow-indigo-500/20 ring-1 ring-indigo-400/30 scale-[1.02] z-10'
                                    : 'bg-white dark:bg-[#131c2e] border border-slate-200 dark:border-[#1e2d45] shadow-sm hover:shadow-md'
                                    }`}
                            >
                                {tier.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 text-[10px] font-extrabold px-3 py-1 rounded-full shadow-md uppercase tracking-wider">
                                            Most Popular
                                        </span>
                                    </div>
                                )}
                                <div className="mb-4">
                                    <h3 className={`text-sm font-bold mb-1 ${tier.popular ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{tier.name}</h3>
                                    <p className={`text-xs ${tier.popular ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>{tier.description}</p>
                                </div>
                                <div className="mb-6">
                                    <span className={`text-4xl font-extrabold ${tier.popular ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                        {billingInterval === 'month' ? tier.priceMonthly : tier.priceYearly}
                                    </span>
                                    <span className={`text-xs ml-1 ${tier.popular ? 'text-indigo-200' : 'text-slate-400'}`}>/{billingInterval === 'month' ? 'mo' : 'yr'}</span>
                                </div>
                                <ul className="space-y-3 mb-8 flex-grow">
                                    {tier.features.map(feature => (
                                        <li key={feature} className="flex items-start gap-2.5">
                                            <CheckIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${tier.popular ? 'text-indigo-200' : 'text-emerald-500'}`} />
                                            <span className={`text-xs ${tier.popular ? 'text-indigo-100' : 'text-slate-600 dark:text-slate-400'}`}>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={onSignIn}
                                    className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${tier.popular
                                        ? 'bg-white text-indigo-700 hover:bg-slate-50 shadow-lg'
                                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                                        }`}
                                >
                                    {tier.cta}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== CTA Banner ===== */}
            <section className="py-20 sm:py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" />
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.08) 0%, transparent 50%)' }} />

                <div className="relative max-w-2xl mx-auto text-center px-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                        Ready to transform how you take notes?
                    </h2>
                    <p className="text-base text-indigo-100/80 mb-8 max-w-lg mx-auto">
                        Join thousands of users who organize their world with GeoNotes AI. It's free to get started.
                    </p>
                    <button onClick={onSignIn} className="bg-white text-indigo-700 font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm">
                        Start for Free →
                    </button>
                </div>
            </section>

            {/* ===== Footer ===== */}
            <footer className="py-10 border-t border-slate-100 dark:border-[#1e2d45]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                            <LocationPinIcon className="h-3 w-3" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">GeoNotes AI</span>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-slate-400 dark:text-slate-500">
                        <a href="#privacy" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Privacy</a>
                        <a href="#terms" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Terms</a>
                        <a href="mailto:support@geonotes.ai" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Contact</a>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">© 2026 GeoNotes AI. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

import { useState, useEffect } from 'react';
import { getUserSubscription, SUBSCRIPTION_TIERS, checkTierLimit, createCheckoutSession, createCustomerPortalSession } from '../services/stripeService';
import { supabase } from '../supabaseClient';

export interface Subscription {
    tier: 'free' | 'pro' | 'teams';
    status: 'active' | 'canceled' | 'past_due';
    currentPeriodEnd?: string;
    stripeCustomerId?: string;
}

export interface UsageStats {
    notesCount: number;
    aiSearchesCount: number;
    devicesCount: number;
}

export function useSubscription(userId?: string) {
    const [subscription, setSubscription] = useState<Subscription>({ tier: 'free', status: 'active' });
    const [usage, setUsage] = useState<UsageStats>({ notesCount: 0, aiSearchesCount: 0, devicesCount: 1 });
    const [isLoading, setIsLoading] = useState(true);

    // Load subscription and usage data
    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }

        async function loadData() {
            try {
                // Load subscription
                const sub = await getUserSubscription(userId);
                setSubscription(sub);

                // Load usage stats (in real app, fetch from Supabase)
                // For now, we'll count notes from local DB
                // TODO: Implement proper usage tracking in Supabase
                setUsage({
                    notesCount: 0, // Will be updated by app
                    aiSearchesCount: 0,
                    devicesCount: 1,
                });
            } catch (error) {
                console.error('Error loading subscription:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadData();
    }, [userId]);

    // Get current tier limits
    const tierLimits = SUBSCRIPTION_TIERS[subscription.tier];

    // Check if user can create a note
    const canCreateNote = () => {
        return checkTierLimit(tierLimits, 'notes', usage.notesCount).allowed;
    };

    // Check if user can use AI search
    const canUseAISearch = () => {
        return checkTierLimit(tierLimits, 'aiSearches', usage.aiSearchesCount).allowed;
    };

    // Upgrade to Pro
    const upgradeToPro = async (interval: 'month' | 'year' = 'month') => {
        if (!userId) return { error: 'User not authenticated' };

        const priceId = interval === 'month' ? 'price_pro_monthly' : 'price_pro_yearly';
        const successUrl = `${window.location.origin}/success`;
        const cancelUrl = `${window.location.origin}/pricing`;

        const result = await createCheckoutSession(priceId, userId, successUrl, cancelUrl);

        if ('url' in result) {
            window.location.href = result.url;
            return { success: true };
        }

        return result;
    };

    // Open Stripe Customer Portal
    const manageSubscription = async () => {
        if (!subscription.stripeCustomerId) {
            return { error: 'No active subscription to manage' };
        }

        const returnUrl = window.location.origin;
        const result = await createCustomerPortalSession(subscription.stripeCustomerId, returnUrl);

        if ('url' in result) {
            window.location.href = result.url;
            return { success: true };
        }

        return result;
    };

    // Update usage count (call this when creating notes, using AI, etc.)
    const updateUsage = (type: keyof UsageStats, increment: number = 1) => {
        setUsage(prev => ({
            ...prev,
            [type]: prev[type] + increment,
        }));
    };

    return {
        subscription,
        usage,
        tierLimits,
        isLoading,
        canCreateNote,
        canUseAISearch,
        upgradeToPro,
        manageSubscription,
        updateUsage,
    };
}

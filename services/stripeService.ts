// Stripe integration for subscription management
// This service handles creating checkout sessions, managing subscriptions, and tracking usage

export interface SubscriptionTier {
    id: 'free' | 'pro' | 'teams';
    name: string;
    notesLimit: number | null; // null = unlimited
    devicesLimit: number | null;
    aiSearchesPerDay: number | null;
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
    free: {
        id: 'free',
        name: 'Free',
        notesLimit: 50,
        devicesLimit: 1,
        aiSearchesPerDay: 5,
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        notesLimit: null, // Unlimited
        devicesLimit: null,
        aiSearchesPerDay: null,
    },
    teams: {
        id: 'teams',
        name: 'Teams',
        notesLimit: null,
        devicesLimit: null,
        aiSearchesPerDay: null,
    },
};

// Stripe Price IDs (you'll replace these with actual Stripe price IDs)
export const STRIPE_PRICE_IDS = {
    pro_monthly: 'price_pro_monthly', // Replace with actual Stripe price ID
    pro_yearly: 'price_pro_yearly',
    teams_monthly: 'price_teams_monthly',
    teams_yearly: 'price_teams_yearly',
};

/**
 * Creates a Stripe Checkout session for subscription
 * This would normally call your backend/Supabase Edge Function
 */
export async function createCheckoutSession(
    priceId: string,
    userId: string,
    successUrl: string,
    cancelUrl: string
): Promise<{ url: string } | { error: string }> {
    try {
        // In a real implementation, this would call a Supabase Edge Function
        // that creates a Stripe Checkout session

        // For now, return a mock URL or throw an error to indicate Stripe setup needed
        console.log('Creating checkout session for:', { priceId, userId });

        // TODO: Replace this with actual Supabase Edge Function call
        // const { data, error } = await supabase.functions.invoke('create-checkout', {
        //   body: { priceId, userId, successUrl, cancelUrl }
        // });

        return {
            error: 'Stripe integration pending. Please set up Stripe in Supabase Edge Functions.',
        };
    } catch (error: any) {
        console.error('Error creating checkout session:', error);
        return { error: error.message || 'Failed to create checkout session' };
    }
}

/**
 * Creates a Customer Portal session for managing subscriptions
 */
export async function createCustomerPortalSession(
    customerId: string,
    returnUrl: string
): Promise<{ url: string } | { error: string }> {
    try {
        console.log('Creating customer portal session for:', customerId);

        // TODO: Replace with actual  Supabase Edge Function call
        return {
            error: 'Stripe Customer Portal pending setup.',
        };
    } catch (error: any) {
        console.error('Error creating portal session:', error);
        return { error: error.message || 'Failed to create portal session' };
    }
}

/**
 * Gets the current subscription tier for a user
 * In a real app, this would fetch from Supabase
 */
export async function getUserSubscription(userId: string): Promise<{
    tier: 'free' | 'pro' | 'teams';
    status: 'active' | 'canceled' | 'past_due';
    currentPeriodEnd?: string;
    stripeCustomerId?: string;
}> {
    // TODO: Fetch from Supabase subscriptions table
    // For now, return free tier for everyone
    return {
        tier: 'free',
        status: 'active',
    };
}

/**
 * Checks if user can perform an action based on their tier limits
 */
export function checkTierLimit(
    tier: SubscriptionTier,
    limitType: 'notes' | 'devices' | 'aiSearches',
    currentCount: number
): { allowed: boolean; limit: number | null } {
    let limit: number | null = null;

    switch (limitType) {
        case 'notes':
            limit = tier.notesLimit;
            break;
        case 'devices':
            limit = tier.devicesLimit;
            break;
        case 'aiSearches':
            limit = tier.aiSearchesPerDay;
            break;
    }

    // null = unlimited
    if (limit === null) {
        return { allowed: true, limit: null };
    }

    return {
        allowed: currentCount < limit,
        limit,
    };
}

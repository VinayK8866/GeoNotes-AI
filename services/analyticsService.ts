// Analytics service using PostHog for product analytics
// Tracks user behavior, feature usage, and conversion funnels

interface AnalyticsEvent {
    event: string;
    properties?: Record<string, any>;
}

interface UserProperties {
    plan_type?: 'free' | 'pro' | 'teams';
    notes_count?: number;
    signup_date?: string;
    last_active?: string;
}

class AnalyticsService {
    private posthog: any = null;
    private isInitialized = false;
    private eventQueue: AnalyticsEvent[] = [];

    /**
     * Initialize PostHog with API key
     */
    async initialize(apiKey?: string, host?: string) {
        // Skip if already initialized
        if (this.isInitialized) return;

        // Check for PostHog configuration
        const key = apiKey || import.meta.env.VITE_POSTHOG_API_KEY;
        const apiHost = host || import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

        if (!key) {
            console.warn('PostHog API key not found. Analytics will not be tracked.');
            return;
        }

        try {
            // Lazy load PostHog to reduce initial bundle size
            const { default: posthog } = await import('posthog-js');

            posthog.init(key, {
                api_host: apiHost,
                autocapture: false, // We'll manually track events
                capture_pageview: false, // Manual pageview tracking
                disable_session_recording: true, // Privacy-first
                loaded: () => {
                    this.isInitialized = true;
                    this.posthog = posthog;

                    // Flush queued events
                    this.eventQueue.forEach(({ event, properties }) => {
                        this.track(event, properties);
                    });
                    this.eventQueue = [];
                }
            });
        } catch (error) {
            console.error('Failed to initialize PostHog:', error);
        }
    }

    /**
     * Identify a user with properties
     */
    identify(userId: string, properties?: UserProperties) {
        if (!this.isInitialized || !this.posthog) {
            return;
        }

        this.posthog.identify(userId, properties);
    }

    /**
     * Track an event
     */
    track(event: string, properties?: Record<string, any>) {
        // Queue events if not initialized yet
        if (!this.isInitialized) {
            this.eventQueue.push({ event, properties });
            return;
        }

        if (!this.posthog) return;

        this.posthog.capture(event, properties);
        console.log('[Analytics]', event, properties); // Debug logging
    }

    /**
     * Track page view
     */
    trackPageView(path: string, properties?: Record<string, any>) {
        this.track('page_view', {
            path,
            ...properties,
        });
    }

    /**
     * Update user properties
     */
    updateUserProperties(properties: UserProperties) {
        if (!this.isInitialized || !this.posthog) return;

        this.posthog.people.set(properties);
    }

    /**
     * Reset user identity (on logout)
     */
    reset() {
        if (!this.isInitialized || !this.posthog) return;

        this.posthog.reset();
    }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Convenience functions for common events
export const trackEvent = {
    // User lifecycle
    signUp: (method: string) => analytics.track('user_signed_up', { method }),
    signIn: (method: string) => analytics.track('user_signed_in', { method }),
    signOut: () => analytics.track('user_signed_out'),

    // Note actions
    noteCreated: (category?: string, hasLocation?: boolean) =>
        analytics.track('note_created', { category, has_location: hasLocation }),
    noteEdited: () => analytics.track('note_edited'),
    noteDeleted: () => analytics.track('note_deleted'),
    noteArchived: () => analytics.track('note_archived'),

    // AI features
    aiSearchUsed: (query: string, resultCount: number) =>
        analytics.track('ai_search_used', { query_length: query.length, result_count: resultCount }),
    aiSuggestionsUsed: () => analytics.track('ai_suggestions_used'),

    // Subscription & monetization
    pricingPageViewed: () => analytics.track('pricing_page_viewed'),
    upgradeClicked: (from_tier: string, to_tier: string) =>
        analytics.track('upgrade_clicked', { from_tier, to_tier }),
    upgradeLimitHit: (limit_type: 'notes' | 'aiSearches') =>
        analytics.track('upgrade_limit_hit', { limit_type }),
    subscriptionStarted: (plan: string) =>
        analytics.track('subscription_started', { plan }),
    subscriptionCanceled: (plan: string) =>
        analytics.track('subscription_canceled', { plan }),

    // Onboarding
    onboardingStarted: () => analytics.track('onboarding_started'),
    onboardingStepCompleted: (step: number, step_name: string) =>
        analytics.track('onboarding_step_completed', { step, step_name }),
    onboardingCompleted: () => analytics.track('onboarding_completed'),
    onboardingSkipped: (at_step: number) =>
        analytics.track('onboarding_skipped', { at_step }),

    // Engagement
    featureUsed: (feature_name: string) =>
        analytics.track('feature_used', { feature_name }),
    errorOccurred: (error_message: string, error_context: string) =>
        analytics.track('error_occurred', { error_message, error_context }),
};

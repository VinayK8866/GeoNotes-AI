
import { useState, useEffect, useRef, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import * as db from '../utils/db';

export function useAuth() {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Track explicit sign out to prevent auth listener race conditions
    const isSignOut = useRef(false);

    useEffect(() => {
        if (!isSupabaseConfigured) {
            setIsLoading(false);
            return;
        }

        // Safety timeout to prevent stuck loading screen (5s)
        const timeoutId = setTimeout(() => {
            if (isLoading) {
                console.warn('Auth loading timeout - forcing UI to show');
                setIsLoading(false);
            }
        }, 5000);

        const initAuth = async () => {
            try {
                // Check for existing session first
                const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) throw sessionError;

                if (initialSession && !isSignOut.current) {
                    setSession(initialSession);
                }
            } catch (err: any) {
                console.error('Error initializing auth:', err);
                // Don't set global error here to avoid blocking UI, just log it
            } finally {
                // Only turn off loading if we have a session or if we are sure we are done
                // If no session, we still wait for the onAuthStateChange to confirm (or timeout)
                // But typically getting the session is enough to show initial UI
                // We'll let the listener handle the final loading state flip for absolute certainty
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            // If we are explicitly signing out, ignore session updates that might trigger unexpected loading states
            if (isSignOut.current) {
                // Ensure loading is false if we are signing out
                setIsLoading(false);
                return;
            }

            setSession(currentSession);

            // Update loading state based on event
            if (event === 'INITIAL_SESSION') {
                setIsLoading(false);
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                setIsLoading(false);
            } else if (event === 'SIGNED_OUT') {
                setSession(null);
                setIsLoading(false);
                // Cleanup local data on sign out event (if not handled by explicit sign out)
                // This is a failsafe
                await db.clearLocalData();
            }

            // For any other event, we can assume loading is done
            setIsLoading(false);
        });

        return () => {
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, []);

    const signIn = useCallback(async () => {
        try {
            setError(null);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: typeof window !== 'undefined' ? window.location.origin : '',
                    queryParams: {
                        prompt: 'select_account',
                    },
                },
            });
            if (error) throw error;
        } catch (err: any) {
            setError(`Authentication failed: ${err.message}`);
            console.error('Sign in error:', err);
        }
    }, []);

    const signOut = useCallback(async (cleanupCallback?: () => void) => {
        try {
            setIsLoading(true);
            // Set flag to block auth listener from overriding state
            isSignOut.current = true;

            // 1. Immediate local cleanup for UI responsiveness
            setSession(null);

            if (cleanupCallback) {
                cleanupCallback();
            }

            await db.clearLocalData();
            
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('onboarding_completed');
            }

            // 2. Call Supabase signOut (best effort)
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

        } catch (err: any) {
            console.error('Sign out error:', err);
            // Even if server error, we enforce local sign out
        } finally {
            setIsLoading(false);
            // Reset flag after a delay to allow future sign-ins
            setTimeout(() => {
                isSignOut.current = false;
            }, 1000);
        }
    }, []);

    return {
        session,
        isLoading,
        error,
        signIn,
        signOut,
        isSupabaseConfigured
    };
}

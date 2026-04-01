
import { useState, useEffect, useRef, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import * as db from '../utils/db';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

export function useAuth() {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Track explicit sign out to prevent auth listener race conditions
    const isSignOut = useRef(false);

    useEffect(() => {
        // Handle deep links for native auth
        if (Capacitor.isNativePlatform()) {
            App.addListener('appUrlOpen', async (data: any) => {
                const url = new URL(data.url);
                const hash = url.hash;
                if (hash) {
                    const params = new URLSearchParams(hash.substring(1));
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');

                    if (accessToken && refreshToken) {
                        const { error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken
                        });
                        if (!error) {
                            // Close browser if it was opened
                            await Browser.close();
                        }
                    }
                }
            });
        }

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
                // Initial load handled
                setIsLoading(false);
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
            
            // Redirect URL: different for native and web
            const redirectTo = Capacitor.isNativePlatform() 
                ? 'com.geonotes.ai://login' 
                : (typeof window !== 'undefined' ? window.location.origin : '');

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                    skipBrowserRedirect: Capacitor.isNativePlatform(), // Stay in app until custom redirect
                    queryParams: {
                        prompt: 'select_account',
                    },
                },
            });

            if (error) throw error;

            // On native, manually open the URL in Capacitor Browser
            if (Capacitor.isNativePlatform() && data.url) {
                await Browser.open({ url: data.url, windowName: '_self' });
            }

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

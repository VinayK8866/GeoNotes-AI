import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase credentials.
// This is a security best practice for production applications.
// You will need to set these in your hosting environment.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// A helper to check if the Supabase client is configured with actual credentials
// Check if we have valid-looking Supabase credentials (URL format and non-empty key)
export const isSupabaseConfigured =
    supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co') &&
    supabaseAnonKey.length > 20; // JWT tokens are much longer than 20 chars

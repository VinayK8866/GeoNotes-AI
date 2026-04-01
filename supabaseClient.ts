import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase credentials.
// This is a security best practice for production applications.
// You will need to set these in your hosting environment.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Basic configuration check
export const isSupabaseConfigured = 
    typeof supabaseUrl === 'string' && 
    supabaseUrl.startsWith('https://') && 
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.length > 20;

// Create client only if configured, or use dummy values to prevent crash
export const supabase = isSupabaseConfigured 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient('https://placeholder-project.supabase.co', 'placeholder-key');

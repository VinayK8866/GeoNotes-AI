import { createClient } from '@supabase/supabase-js';

// Access environment variables from process.env as per platform standards
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(
    supabaseUrl && 
    supabaseUrl.startsWith('https://') && 
    supabaseAnonKey && 
    supabaseAnonKey.length > 20
);

export const supabase = isSupabaseConfigured 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;
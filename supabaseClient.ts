import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase credentials.
// This is a security best practice for production applications.
// You will need to set these in your hosting environment.
const supabaseUrl = process.env.SUPABASE_URL || 'https://klqkcniotmefqmwuobmk.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtscWtjbmlvdG1lZnFtd3VvYm1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjgxOTksImV4cCI6MjA3Nzc0NDE5OX0.AW2oPpYEVhJqqYwbb5X1_FbwkLSCRgKt4n-HrhrWohM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// A helper to check if the Supabase client is configured with actual credentials
export const isSupabaseConfigured =
    supabaseUrl !== 'https://klqkcniotmefqmwuobmk.supabase.co' &&
    supabaseAnonKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtscWtjbmlvdG1lZnFtd3VvYm1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjgxOTksImV4cCI6MjA3Nzc0NDE5OX0.AW2oPpYEVhJqqYwbb5X1_FbwkLSCRgKt4n-HrhrWohM';

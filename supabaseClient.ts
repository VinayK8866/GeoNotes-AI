import { createClient } from '@supabase/supabase-js';
import { Note } from './types';

// These are public keys, but in a production app with more complex rules,
// you'd typically use environment variables.
const supabaseUrl = 'https://klqkcniotmefqmwuobmk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtscWtjbmlvdG1lZnFtd3VvYm1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjgxOTksImV4cCI6MjA3Nzc0NDE5OX0.AW2oPpYEVhJqqYwbb5X1_FbwkLSCRgKt4n-HrhrWohM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

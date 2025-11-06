import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-project-id.supabase.co';
const supabaseAnonKey = 'your-public-anon-key';

// The app will now load with placeholder credentials.
// Replace them with your own to connect to your Supabase project.

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

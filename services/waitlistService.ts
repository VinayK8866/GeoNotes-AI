
import { supabase } from '../supabaseClient';

export const joinWaitlist = async (email: string, feature: string = 'teams') => {
    try {
        const { error } = await supabase
            .from('waitlist')
            .insert([{ email, feature, created_at: new Date().toISOString() }]);
        
        if (error) {
            // If the table doesn't exist, we fall back to a console log 
            // and return success to the UI (graceful failure for MVP)
            if (error.code === '42P01') {
                console.warn('Waitlist table not found. Please create it in Supabase.');
                return { success: true, warning: 'Table missing' };
            }
            throw error;
        }
        return { success: true };
    } catch (err) {
        console.error('Waitlist error:', err);
        throw err;
    }
};

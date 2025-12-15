import { createClient } from '@supabase/supabase-js';
// import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
} else {
    console.log('Supabase Config:', {
        url: supabaseUrl.replace(/^(https?:\/\/)([^.]+)(.+)$/, '$1***$3'), // Mask project ID
        keyLength: supabaseAnonKey.length
    });
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);

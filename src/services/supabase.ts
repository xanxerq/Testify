import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

/**
 * Checks whether the environment variables for Supabase are correctly configured.
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    (supabaseUrl.startsWith('https://') || supabaseUrl.startsWith('http://')) &&
    !supabaseUrl.includes('MY_SUPABASE') &&
    !supabaseUrl.includes('placeholder')
  );
};

export const getSupabaseConfigStatus = () => {
  return {
    isConfigured: isSupabaseConfigured(),
    hasUrl: Boolean(supabaseUrl),
    hasKey: Boolean(supabaseAnonKey),
    url: supabaseUrl ? supabaseUrl.replace(/\.co.*$/, '.co') : '',
  };
};

// Fallback dummy credentials to prevent module evaluation crashes when env vars are not set
const fallbackUrl = 'https://project-placeholder.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? supabaseUrl : fallbackUrl,
  isSupabaseConfigured() ? supabaseAnonKey : fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

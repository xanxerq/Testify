import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { dbConfigService } from './dbConfigService';

export const getEffectiveSupabaseCredentials = () => {
  const config = dbConfigService.getConfig();
  const url = (config.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '').trim();
  const key = (config.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  return { url, key };
};

/**
 * Checks whether Supabase credentials are valid and present.
 */
export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getEffectiveSupabaseCredentials();
  return Boolean(
    url &&
    key &&
    (url.startsWith('https://') || url.startsWith('http://')) &&
    !url.includes('MY_SUPABASE') &&
    !url.includes('placeholder')
  );
};

export const getSupabaseConfigStatus = () => {
  const { url, key } = getEffectiveSupabaseCredentials();
  return {
    isConfigured: isSupabaseConfigured(),
    hasUrl: Boolean(url),
    hasKey: Boolean(key),
    url: url ? url.replace(/\.co.*$/, '.co') : '',
  };
};

// Fallback dummy credentials to prevent module evaluation crashes when env vars are not set
const fallbackUrl = 'https://project-placeholder.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

export function createSupabaseClientInstance(): SupabaseClient {
  const { url, key } = getEffectiveSupabaseCredentials();
  const activeUrl = isSupabaseConfigured() ? url : fallbackUrl;
  const activeKey = isSupabaseConfigured() ? key : fallbackKey;

  return createClient(activeUrl, activeKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export let supabase: SupabaseClient = createSupabaseClientInstance();

export function refreshSupabaseClient(): SupabaseClient {
  supabase = createSupabaseClientInstance();
  return supabase;
}

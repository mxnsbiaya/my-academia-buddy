/**
 * Supabase Client Initialization & Configuration
 * Provides safe initialization, credentials detection, and offline fallbacks.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Determine if Supabase credentials have been provided by the user
export const isConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project')
);

let clientInstance = null;

if (isConfigured) {
  try {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
      },
    });
  } catch (err) {
    console.warn('[supabase] Failed to initialize Supabase client:', err);
    clientInstance = null;
  }
}

/**
 * Access the active Supabase client instance
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
export function getSupabase() {
  return clientInstance;
}

/**
 * Checks whether real Supabase credentials are configured
 * @returns {boolean}
 */
export function isSupabaseConfigured() {
  return isConfigured && clientInstance !== null;
}

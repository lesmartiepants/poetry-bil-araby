import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Only create client if credentials are provided
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Restore OAuth hash fragment if it was captured by the inline script in index.html.
// The hash may have been stripped by the router before this module loads.
// Restoring it lets Supabase's detectSessionInUrl pick up the access_token.
if (supabase && window.__supabaseAuthHash && !window.location.hash.includes('access_token')) {
  window.location.hash = window.__supabaseAuthHash;
  delete window.__supabaseAuthHash;
}

// Eagerly trigger session detection BEFORE React mounts.
if (supabase && window.location.hash.includes('access_token')) {
  supabase.auth.getSession();
}

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!supabase;
};

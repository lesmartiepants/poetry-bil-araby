import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Only create client if credentials are provided
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Eagerly trigger session detection BEFORE React mounts.
// After OAuth redirect, the URL contains #access_token=... which Supabase
// needs to process. If we wait until useAuth's useEffect runs, the router
// (wouter) may have already stripped the hash. Calling getSession() here
// at module load time ensures the hash is captured immediately.
if (supabase && window.location.hash.includes('access_token')) {
  supabase.auth.getSession();
}

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!supabase;
};

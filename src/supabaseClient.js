import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Detect OAuth callback before creating client — log for debugging
const urlParams = new URLSearchParams(window.location.search);
const hashFragment = window.location.hash || '';
const isPKCECallback = !!urlParams.get('code');
const isImplicitCallback = hashFragment.includes('access_token');

if (isPKCECallback || isImplicitCallback) {
  console.log('[SupabaseClient] OAuth callback detected:', {
    type: isPKCECallback ? 'PKCE' : 'implicit',
    hasCode: isPKCECallback,
    hasHash: isImplicitCallback,
    url: window.location.href.replace(/[?#].*/, '?...'),
  });
}

// Auth uses PKCE flow instead of the default implicit flow.
// Implicit flow passes tokens in the URL hash (#access_token=...) which is
// fragile in SPAs — routers, replaceState calls, and module load order can
// strip the hash before Supabase's internal _initialize() reads it.
//
// PKCE flow uses a ?code= query parameter that the client exchanges for a
// session automatically (detectSessionInUrl: true). This is the Supabase-
// recommended approach for modern SPAs and works reliably with wouter,
// Vercel preview deployments, and service workers.
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// Log OAuth callback result after initialization completes
if (supabase && (isPKCECallback || isImplicitCallback)) {
  supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
      console.error('[SupabaseClient] OAuth callback session error:', error.message);
    } else if (session) {
      console.log('[SupabaseClient] OAuth session established for:', session.user?.email);
    } else {
      console.warn('[SupabaseClient] OAuth callback completed but no session established');
    }
  });
}

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!supabase;
};

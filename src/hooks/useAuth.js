import { useState, useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

// Structured logger for auth/DB events — captured by Vercel and browser console
const log = {
  info: (label, msg, data) => console.info(`[Auth:${label}]`, msg, data ?? ''),
  error: (label, msg, data) => console.error(`[Auth:${label}]`, msg, data ?? ''),
  warn: (label, msg, data) => console.warn(`[Auth:${label}]`, msg, data ?? ''),
};

/**
 * Custom hook for managing Supabase authentication
 * Provides user state, sign in/out methods, and settings persistence
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      log.info(
        'Session',
        session ? `Restored session for ${session.user.email}` : 'No existing session'
      );
      if (session?.user) {
        Sentry.setUser({ id: session.user.id, email: session.user.email });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      log.info('StateChange', `${event}${session ? ` — ${session.user.email}` : ''}`);

      // Sync Sentry user context with auth state
      if (session?.user) {
        Sentry.setUser({ id: session.user.id, email: session.user.email });
      } else {
        Sentry.setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured()) {
      console.error('Supabase is not configured');
      return { error: { message: 'Supabase is not configured' } };
    }

    log.info('Login', 'Initiating Google OAuth');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
      },
    });
    if (error) log.error('Login', 'Google OAuth failed', error.message);
    return { data, error };
  };

  const signInWithApple = async () => {
    if (!isSupabaseConfigured()) {
      console.error('Supabase is not configured');
      return { error: { message: 'Supabase is not configured' } };
    }

    log.info('Login', 'Initiating Apple OAuth');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: window.location.href,
      },
    });
    if (error) log.error('Login', 'Apple OAuth failed', error.message);
    return { data, error };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase is not configured' } };
    }

    log.info('Logout', 'Signing out');
    const { error } = await supabase.auth.signOut();
    if (error) log.error('Logout', 'Sign out failed', error.message);
    else log.info('Logout', 'Signed out successfully');
    return { error };
  };

  return {
    user,
    session,
    loading,
    signInWithGoogle,
    signInWithApple,
    signOut,
    isConfigured: isSupabaseConfigured(),
  };
}

/**
 * Custom hook for managing user settings
 * Syncs settings with Supabase database
 */
export function useUserSettings(user) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) {
      setSettings(null);
      setLoading(false);
      return;
    }

    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      log.info('Settings', `Loading settings for user ${user.id}`);
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        log.error('Settings', 'Failed to load settings', error.message);
        return;
      }

      log.info('Settings', data ? 'Settings loaded' : 'No settings found (new user)');
      setSettings(data);
    } catch (error) {
      log.error('Settings', 'Exception loading settings', error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      log.info('Settings', 'Saving settings', newSettings);
      const { data, error } = await supabase
        .from('user_settings')
        .upsert(
          {
            user_id: user.id,
            ...newSettings,
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) {
        log.error('Settings', 'Failed to save settings', error.message);
        return { error };
      }

      log.info('Settings', 'Settings saved successfully');
      setSettings(data);
      return { data };
    } catch (error) {
      log.error('Settings', 'Exception saving settings', error.message);
      return { error };
    }
  };

  return {
    settings,
    loading,
    saveSettings,
    reload: loadSettings,
  };
}

/**
 * Custom hook for managing saved poems
 */
export function useSavedPoems(user) {
  const [savedPoems, setSavedPoems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) {
      setSavedPoems([]);
      setLoading(false);
      return;
    }

    loadSavedPoems();
  }, [user]);

  const loadSavedPoems = async () => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      log.info('Poems', `Loading saved poems for user ${user.id}`);
      const { data, error } = await supabase
        .from('saved_poems')
        .select('*')
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false });

      if (error) {
        log.error('Poems', 'Failed to load saved poems', error.message);
        return;
      }

      log.info('Poems', `Loaded ${(data || []).length} saved poems`);
      setSavedPoems(data || []);
    } catch (error) {
      log.error('Poems', 'Exception loading saved poems', error.message);
    } finally {
      setLoading(false);
    }
  };

  const savePoem = async (poem) => {
    if (!user || !isSupabaseConfigured()) return { error: { message: 'Not authenticated' } };

    try {
      log.info('Poems', `Saving poem: ${poem.poet} — ${poem.title} (id: ${poem.id})`);
      const { data, error } = await supabase
        .from('saved_poems')
        .insert({
          user_id: user.id,
          poem_id: poem.id,
          poem_text: poem.arabic,
          poet: poem.poet,
          title: poem.title,
          english: poem.english,
          category: poem.tags?.[0] || null,
        })
        .select()
        .single();

      if (error) {
        log.error('Poems', 'Failed to save poem', error.message);
        return { error };
      }

      log.info('Poems', `Poem saved successfully (saved_id: ${data.id})`);
      setSavedPoems((prev) => [data, ...prev]);
      return { data };
    } catch (error) {
      log.error('Poems', 'Exception saving poem', error.message);
      return { error };
    }
  };

  const unsavePoem = async (poemId, poemText) => {
    if (!user || !isSupabaseConfigured()) return { error: { message: 'Not authenticated' } };

    try {
      log.info('Poems', `Unsaving poem (id: ${poemId}, text: ${poemText ? 'yes' : 'no'})`);
      let query = supabase.from('saved_poems').delete().eq('user_id', user.id);

      if (poemId) {
        query = query.eq('poem_id', poemId);
      } else if (poemText) {
        query = query.eq('poem_text', poemText);
      }

      const { error } = await query;

      if (error) {
        log.error('Poems', 'Failed to unsave poem', error.message);
        return { error };
      }

      log.info('Poems', 'Poem unsaved successfully');
      setSavedPoems((prev) =>
        prev.filter((p) => {
          if (poemId) return p.poem_id !== poemId;
          if (poemText) return p.poem_text !== poemText;
          return true;
        })
      );
      return { error: null };
    } catch (error) {
      log.error('Poems', 'Exception unsaving poem', error.message);
      return { error };
    }
  };

  const isPoemSaved = (poem) => {
    if (!savedPoems.length) return false;

    if (poem.id) {
      return savedPoems.some((p) => p.poem_id === poem.id);
    }

    return savedPoems.some((p) => p.poem_text === poem.arabic);
  };

  return {
    savedPoems,
    loading,
    savePoem,
    unsavePoem,
    isPoemSaved,
    reload: loadSavedPoems,
  };
}

/**
 * Custom hook for managing poem downvotes (flags)
 */
export function useDownvotes(user) {
  const [downvotedPoemIds, setDownvotedPoemIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) {
      setDownvotedPoemIds([]);
      setLoading(false);
      return;
    }
    loadDownvotes();
  }, [user]);

  const loadDownvotes = async () => {
    if (!user || !isSupabaseConfigured()) return;
    try {
      log.info('Downvotes', `Loading downvotes for user ${user.id}`);
      const { data, error } = await supabase
        .from('poem_events')
        .select('poem_id')
        .eq('user_id', user.id)
        .eq('event_type', 'downvote');

      if (error) {
        log.error('Downvotes', 'Failed to load downvotes', error.message);
        return;
      }

      log.info('Downvotes', `Loaded ${(data || []).length} downvoted poems`);
      setDownvotedPoemIds((data || []).map((d) => d.poem_id));
    } catch (error) {
      log.error('Downvotes', 'Exception loading downvotes', error.message);
    } finally {
      setLoading(false);
    }
  };

  const downvotePoem = async (poem) => {
    if (!user || !isSupabaseConfigured()) return { error: { message: 'Not authenticated' } };
    try {
      log.info('Downvotes', `Downvoting poem: ${poem.poet} — ${poem.title} (id: ${poem.id})`);
      // Optimistic update
      setDownvotedPoemIds((prev) => [...prev, poem.id]);

      const { error } = await supabase.from('poem_events').insert({
        user_id: user.id,
        poem_id: poem.id,
        event_type: 'downvote',
        metadata: { reason: 'low_quality' },
      });

      if (error) {
        // Revert optimistic update
        setDownvotedPoemIds((prev) => prev.filter((id) => id !== poem.id));
        log.error('Downvotes', 'Failed to downvote poem', error.message);
        return { error };
      }

      log.info('Downvotes', 'Poem downvoted successfully');
      return { error: null };
    } catch (error) {
      setDownvotedPoemIds((prev) => prev.filter((id) => id !== poem.id));
      log.error('Downvotes', 'Exception downvoting poem', error.message);
      return { error };
    }
  };

  const undownvotePoem = async (poemId) => {
    if (!user || !isSupabaseConfigured()) return { error: { message: 'Not authenticated' } };
    try {
      log.info('Downvotes', `Removing downvote for poem ${poemId}`);
      // Optimistic update
      setDownvotedPoemIds((prev) => prev.filter((id) => id !== poemId));

      const { error } = await supabase
        .from('poem_events')
        .delete()
        .eq('user_id', user.id)
        .eq('poem_id', poemId)
        .eq('event_type', 'downvote');

      if (error) {
        // Revert optimistic update
        setDownvotedPoemIds((prev) => [...prev, poemId]);
        log.error('Downvotes', 'Failed to remove downvote', error.message);
        return { error };
      }

      log.info('Downvotes', 'Downvote removed successfully');
      return { error: null };
    } catch (error) {
      setDownvotedPoemIds((prev) => [...prev, poemId]);
      log.error('Downvotes', 'Exception removing downvote', error.message);
      return { error };
    }
  };

  const isPoemDownvoted = (poem) => {
    if (!poem?.id) return false;
    return downvotedPoemIds.includes(poem.id);
  };

  return {
    downvotedPoemIds,
    loading,
    downvotePoem,
    undownvotePoem,
    isPoemDownvoted,
  };
}

/**
 * Lightweight emit-only hook for poem analytics events
 * Fire-and-forget: no local state, no loading
 */
export function usePoemEvents(user) {
  const emitEvent = async (poemId, eventType, metadata = {}) => {
    if (!user || !isSupabaseConfigured()) return;
    try {
      log.info('Events', `Emitting ${eventType} for poem ${poemId}`);
      const { error } = await supabase.from('poem_events').insert({
        user_id: user.id,
        poem_id: poemId,
        event_type: eventType,
        metadata,
      });

      if (error) {
        log.error('Events', `Failed to emit ${eventType}`, error.message);
      }
    } catch (error) {
      // Fire-and-forget: don't throw
      log.error('Events', `Exception emitting ${eventType}`, error.message);
    }
  };

  return { emitEvent };
}

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

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
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured()) {
      console.error('Supabase is not configured');
      return { error: { message: 'Supabase is not configured' } };
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { data, error };
  };

  const signInWithApple = async () => {
    if (!isSupabaseConfigured()) {
      console.error('Supabase is not configured');
      return { error: { message: 'Supabase is not configured' } };
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase is not configured' } };
    }

    const { error } = await supabase.auth.signOut();
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
      setLoading(false);
      return;
    }

    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading settings:', error);
        return;
      }

      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...newSettings,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving settings:', error);
        return { error };
      }

      setSettings(data);
      return { data };
    } catch (error) {
      console.error('Error saving settings:', error);
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
      setLoading(false);
      return;
    }

    loadSavedPoems();
  }, [user]);

  const loadSavedPoems = async () => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      const { data, error } = await supabase
        .from('saved_poems')
        .select('*')
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false });

      if (error) {
        console.error('Error loading saved poems:', error);
        return;
      }

      setSavedPoems(data || []);
    } catch (error) {
      console.error('Error loading saved poems:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePoem = async (poem) => {
    if (!user || !isSupabaseConfigured()) return { error: { message: 'Not authenticated' } };

    try {
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
        console.error('Error saving poem:', error);
        return { error };
      }

      setSavedPoems((prev) => [data, ...prev]);
      return { data };
    } catch (error) {
      console.error('Error saving poem:', error);
      return { error };
    }
  };

  const unsavePoem = async (poemId, poemText) => {
    if (!user || !isSupabaseConfigured()) return { error: { message: 'Not authenticated' } };

    try {
      let query = supabase
        .from('saved_poems')
        .delete()
        .eq('user_id', user.id);

      if (poemId) {
        query = query.eq('poem_id', poemId);
      } else if (poemText) {
        query = query.eq('poem_text', poemText);
      }

      const { error } = await query;

      if (error) {
        console.error('Error unsaving poem:', error);
        return { error };
      }

      setSavedPoems((prev) =>
        prev.filter((p) => {
          if (poemId) return p.poem_id !== poemId;
          if (poemText) return p.poem_text !== poemText;
          return true;
        })
      );
      return { error: null };
    } catch (error) {
      console.error('Error unsaving poem:', error);
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

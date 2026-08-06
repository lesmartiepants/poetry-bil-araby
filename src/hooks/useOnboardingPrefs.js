import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase, isSupabaseConfigured } from '../supabaseClient';
import {
  readPrefs,
  writePrefs,
  mergePrefs,
  sanitizePrefs,
  hasForeignPrefs,
} from '../services/preferences.js';

const log = {
  info: (msg, data) => console.info('[Auth:Prefs]', msg, data ?? ''),
  error: (msg, data) => console.error('[Auth:Prefs]', msg, data ?? ''),
};

/**
 * useOnboardingPrefs — makes the five onboarding answers follow a signed-in
 * reader across devices.
 *
 * SHAPE OF THE SYNC. localStorage stays the single source of truth for READS.
 * The feed reads answers on every draw, synchronously, inside
 * stores/actions/fetchPoem.js — deliberately outside the await so a reader who
 * skipped onboarding reaches the fetch on the same microtask tick as before the
 * weighting existed. Making that read async to consult the account would reorder
 * it against the other requests a poet switch fires. So the account is a MIRROR:
 * on login we reconcile and write the winner back into localStorage, and every
 * later read is the same synchronous localStorage read it has always been.
 *
 * SIGNED OUT, THE FILE IS INERT. Every path below returns early when there is no
 * user or Supabase is unconfigured, and `persist` still writes localStorage in
 * that case — which OnboardingFlow has already done for itself by the time it
 * calls onComplete. Nothing about the signed-out flow changes.
 *
 * It reads user_settings directly rather than going through useUserSettings.
 * That hook cannot distinguish "row not loaded yet" from "user has no row" —
 * `settings` is null for both, and its `loading` never resets to true when the
 * user changes — and a merge that mistakes "still loading" for "the account has
 * nothing" would push this device's answers over the account's. The two hooks
 * write disjoint columns of the same row through ON CONFLICT upserts, so their
 * writes compose rather than race.
 *
 * @param {Object|null} user Supabase auth user
 */
export function useOnboardingPrefs(user) {
  const [syncing, setSyncing] = useState(false);
  // Which user id we have already reconciled, so a re-render or an unrelated
  // auth event does not re-run the merge and re-write storage.
  const reconciledFor = useRef(null);

  const writeRemote = useCallback(async (userId, prefs) => {
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, onboarding_preferences: prefs }, { onConflict: 'user_id' });
    if (error) {
      log.error('Failed to save preferences to account', error.message);
      return { error };
    }
    log.info('Preferences saved to account');
    return {};
  }, []);

  /**
   * Persist a completed set of answers. Called by OnboardingFlow's onComplete.
   * localStorage first and unconditionally — the account write is best-effort and
   * must never be able to lose the answers a reader just gave.
   */
  const persist = useCallback(
    async (prefs) => {
      const { prefs: clean } = sanitizePrefs(prefs);
      writePrefs(clean);
      if (!user || !isSupabaseConfigured()) return {};
      return writeRemote(user.id, clean);
    },
    [user, writeRemote]
  );

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) {
      reconciledFor.current = null;
      return undefined;
    }
    if (reconciledFor.current === user.id) return undefined;
    reconciledFor.current = user.id;

    let cancelled = false;

    const reconcile = async () => {
      setSyncing(true);
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('onboarding_preferences')
          .eq('user_id', user.id)
          .single();

        // PGRST116 = no row yet. That is a normal new user, not a failure.
        if (error && error.code !== 'PGRST116') {
          log.error('Failed to load preferences from account', error.message);
          return;
        }
        if (cancelled) return;

        // A payload this build cannot interpret (a newer client wrote it) is left
        // strictly alone in BOTH directions: we neither adopt it nor overwrite it.
        // Whichever client understands it still owns it.
        const remoteRaw = data?.onboarding_preferences ?? null;
        const { prefs: remote, versionMismatch: remoteForeign } = sanitizePrefs(remoteRaw);
        const localForeign = hasForeignPrefs();
        if (remoteForeign || localForeign) {
          log.info('Preference version mismatch — leaving both sides untouched', {
            remote: remoteForeign,
            local: localForeign,
          });
          return;
        }

        const local = readPrefs();
        const { winner, source } = mergePrefs(local, remoteRaw ? remote : null);
        if (source === 'neither') {
          log.info('No preferences on either side');
          return;
        }

        log.info(`Preferences reconciled — ${source} wins`, { completedAt: winner.completedAt });

        if (source === 'remote') {
          // Bring the device up to date so the next synchronous feed read sees it.
          writePrefs(winner);
        } else if (JSON.stringify(remoteRaw) !== JSON.stringify(winner)) {
          await writeRemote(user.id, winner);
        }
      } catch (err) {
        log.error('Exception reconciling preferences', err?.message);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    };

    reconcile();
    return () => {
      cancelled = true;
    };
  }, [user, writeRemote]);

  return { persist, syncing };
}

export default useOnboardingPrefs;

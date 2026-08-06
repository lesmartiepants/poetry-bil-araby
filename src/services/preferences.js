/**
 * Persistence for the five onboarding answers.
 *
 * Deliberately separate from `components/onboarding/OnboardingFlow.jsx`: the
 * feed needs to READ these answers on every draw
 * (`stores/actions/fetchPoem.js`), and importing them from a component would
 * drag the whole picker UI — framer-motion, gsap, the canvas effects — into the
 * data layer's module graph for the sake of two localStorage calls.
 *
 * Shape (v2):
 *   family      string|null   a category_families key      (single)
 *   moods       string[]      category_values keys, mood   (multi)
 *   motifs      string[]      category_values keys, motif  (multi, optional)
 *   era         string|null   a derived era BAND key       (single)
 *   difficulty  string|null   a derived difficulty BAND key (single)
 *
 * `era` and `difficulty` store BAND KEYS, not raw values, because the bands are
 * cut from the live distribution and can move as the corpus grows. Resolving a
 * key against the current bands at read time means a saved answer keeps meaning
 * "the early centuries" rather than freezing a numeric range that may no longer
 * line up with anything.
 */

export const PREFS_STORAGE_KEY = 'onboardingPrefs';
export const PREFS_VERSION = 2;

export const EMPTY_PREFS = {
  version: PREFS_VERSION,
  family: null,
  moods: [],
  motifs: [],
  era: null,
  difficulty: null,
  completedAt: null,
};

/**
 * Coerce an arbitrary parsed object into a prefs object this build can use.
 *
 * Version mismatches return EMPTY_PREFS rather than throwing or half-applying:
 *
 *   version < 2  Written by the pre-taxonomy build. Those key lists were
 *                authored against a schema that never shipped and are wrong in
 *                almost every entry (`anger`, `wonder`, `sea` and `praise` do
 *                not exist as taxonomy keys). The shape would survive a spread
 *                but the CONTENT is garbage — it would weight the feed toward
 *                keys that match no poem. Discarding is the honest read.
 *
 *   version > 2  Written by a newer client (another tab, another device that
 *                already shipped the next flow). We cannot know what its fields
 *                mean, so we do not guess. Note the caller must not WRITE over
 *                such a payload either; see readPrefs.
 *
 * In both cases the reader gets an unbiased feed — `hasPreferences` is false for
 * EMPTY_PREFS — which is the same degradation as a reader who skipped onboarding.
 *
 * @param {unknown} parsed
 * @returns {{prefs: Object, versionMismatch: boolean}}
 */
export const sanitizePrefs = (parsed) => {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { prefs: { ...EMPTY_PREFS }, versionMismatch: false };
  }
  // A missing version is treated as version 1: the only build that ever wrote
  // an unversioned object is the pre-taxonomy one.
  const version = typeof parsed.version === 'number' ? parsed.version : 1;
  if (version !== PREFS_VERSION) {
    return { prefs: { ...EMPTY_PREFS }, versionMismatch: true };
  }
  return {
    prefs: {
      ...EMPTY_PREFS,
      ...parsed,
      version: PREFS_VERSION,
      moods: Array.isArray(parsed.moods) ? parsed.moods : [],
      motifs: Array.isArray(parsed.motifs) ? parsed.motifs : [],
      completedAt: typeof parsed.completedAt === 'string' ? parsed.completedAt : null,
    },
    versionMismatch: false,
  };
};

/**
 * True when storage holds a payload this build refuses to interpret. The sync
 * layer uses it to stay hands-off: a newer client's answers must not be
 * overwritten by this build's empty ones.
 */
export const hasForeignPrefs = () => {
  try {
    const raw = globalThis.localStorage?.getItem(PREFS_STORAGE_KEY);
    if (!raw) return false;
    return sanitizePrefs(JSON.parse(raw)).versionMismatch;
  } catch {
    return false;
  }
};

export const readPrefs = () => {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(PREFS_STORAGE_KEY) || 'null');
    return sanitizePrefs(parsed).prefs;
  } catch {
    // Unavailable storage (private mode) or corrupt JSON. An unanswered reader
    // gets an unbiased feed, which is the correct degradation.
    return { ...EMPTY_PREFS };
  }
};

/* -------------------------------------------------------------------------- */
/* Change notification                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Answers changing has to be able to REDRAW THE FEED, and until this existed it
 * could not.
 *
 * The feed reads answers synchronously on each draw, which made "the answers are
 * the input" true and "changing them changes anything you are looking at" false.
 * A reader finished five questions, landed back on the feed, and saw the poem
 * that was already there — fetched before they answered — plus four more by that
 * poem's poet. The whole flow was observably inert.
 *
 * A subscription rather than a store because the writers are not components:
 * OnboardingFlow writes storage itself, and useOnboardingPrefs writes it again
 * from the account on sign-in. Both funnel through writePrefs/clearPrefs, so one
 * notify here covers every way the answers can change — completing the flow,
 * editing them later, and signing in to an account whose answers win the merge.
 *
 * The signature guard is what makes the sign-in case safe to wire up at all: the
 * overwhelmingly common reconcile writes back byte-identical answers, and
 * redrawing the feed under a reader who just signed in to look at a poem would
 * be a bug, not a feature.
 */
const listeners = new Set();

/** Everything the feed weights on. `completedAt` is deliberately NOT in it. */
const signatureOf = (p) =>
  JSON.stringify([
    p?.family ?? null,
    [...(p?.moods || [])].sort(),
    [...(p?.motifs || [])].sort(),
    p?.era ?? null,
    p?.difficulty ?? null,
  ]);

let lastSignature = null;

const notify = (prefs) => {
  const next = signatureOf(prefs);
  if (next === lastSignature) return;
  lastSignature = next;
  listeners.forEach((fn) => {
    try {
      fn(prefs);
    } catch {
      /* a listener throwing must not stop the others, or lose the write */
    }
  });
};

/**
 * Run `fn` whenever the ANSWERS change. Returns an unsubscribe.
 *
 * Seeds `lastSignature` from storage on first subscribe so a write that merely
 * restates what is already saved does not fire on mount.
 */
export const subscribePrefs = (fn) => {
  if (lastSignature === null) lastSignature = signatureOf(readPrefs());
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Test seam — forget subscribers and the last-seen answers. */
export const __resetPrefsSubscribers = () => {
  listeners.clear();
  lastSignature = null;
};

export const writePrefs = (prefs) => {
  try {
    globalThis.localStorage?.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode — selections just aren't persisted */
  }
  // Outside the try: a reader in private mode still changed their answers, and
  // the feed they are looking at should still respond to that.
  notify(prefs);
};

/** Answered at all? Mirrors preferenceWeighting.hasPreferences without importing it. */
const isAnswered = (p) =>
  Boolean(p && (p.family || p.era || p.difficulty || p.moods?.length || p.motifs?.length));

/** Epoch ms for a completedAt, or null when absent/unparseable. */
const completedMs = (p) => {
  const t = Date.parse(p?.completedAt ?? '');
  return Number.isNaN(t) ? null : t;
};

/**
 * Reconcile the answers on this device with the answers on the account.
 *
 * MOST-RECENT `completedAt` WINS, and it wins WHOLE — never field by field.
 *
 * Why most-recent: both sides carry a `completedAt` that is stamped only when a
 * reader actually finishes the flow, so it is a real answer to "when did this
 * person last tell us what they like". Local-wins would defeat the point of the
 * feature (a fresh device would fetch the account's answers and immediately
 * clobber them with its own empty ones). Remote-wins would throw away the five
 * answers a reader just gave while signed out and then signed in — which is
 * precisely the flow this exists to support.
 *
 * Why whole-object and not per-field: the five answers are one statement of
 * taste. Merging a family from March with moods from August produces a
 * combination the reader never chose, and the feed would then be weighted toward
 * a person who does not exist. A stale-but-coherent answer set beats a fresh
 * incoherent one.
 *
 * Why not prompt: it buys a modal on the sign-in path — the worst place for
 * one — to resolve a difference the reader cannot meaningfully evaluate ("night
 * + pride from Tuesday" vs "dawn + grief from last month"). The answers are a
 * WEIGHT on the feed, not a filter, so the cost of guessing wrong is a slightly
 * different mix, and redoing the flow takes about thirty seconds. That is not
 * worth an interstitial.
 *
 * Tie-breaks, in order:
 *   1. Only one side answered at all -> that side.
 *   2. Both answered, both timestamped -> newer timestamp; EXACT TIE goes remote,
 *      because the overwhelmingly common tie is "remote is already a mirror of
 *      local", and preferring remote makes the merge a no-op instead of a write.
 *   3. Both answered, only one timestamped -> the timestamped side (a stamped
 *      completion is evidence of a finished flow; an unstamped one is a partial
 *      or hand-edited payload).
 *   4. Neither timestamped -> local, the device in front of the reader.
 *
 * Callers pass already-sanitized objects, so a version-mismatched payload
 * arrives here as EMPTY_PREFS and simply loses to any real answer set.
 *
 * @param {Object} local  prefs from localStorage (sanitized)
 * @param {Object} remote prefs from user_settings.onboarding_preferences (sanitized), or null
 * @returns {{winner: Object, source: 'local'|'remote'|'neither'}}
 */
export const mergePrefs = (local, remote) => {
  const localAnswered = isAnswered(local);
  const remoteAnswered = isAnswered(remote);

  if (!localAnswered && !remoteAnswered) return { winner: { ...EMPTY_PREFS }, source: 'neither' };
  if (!remoteAnswered) return { winner: local, source: 'local' };
  if (!localAnswered) return { winner: remote, source: 'remote' };

  const l = completedMs(local);
  const r = completedMs(remote);

  if (l !== null && r !== null) {
    return l > r ? { winner: local, source: 'local' } : { winner: remote, source: 'remote' };
  }
  if (r !== null) return { winner: remote, source: 'remote' };
  if (l !== null) return { winner: local, source: 'local' };
  return { winner: local, source: 'local' };
};

export const clearPrefs = () => {
  try {
    globalThis.localStorage?.removeItem(PREFS_STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
  notify({ ...EMPTY_PREFS });
};

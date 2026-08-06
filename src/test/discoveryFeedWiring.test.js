/**
 * The wiring that made the onboarding answers reach the feed.
 *
 * These cover the two things that were broken while every unit test was green,
 * which is why they exist as their own file rather than as more cases inside
 * preferenceWeighting.test.js: the SCORING was always fine. What was missing was
 * that changing the answers notified nobody, and that only one poem per feed
 * ever carried a draw record.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  recordFeedDraw,
  getDrawFor,
  getFeedOrder,
  getLastDraw,
  clearLastDraw,
} from '../services/lastDraw.js';
import {
  writePrefs,
  clearPrefs,
  subscribePrefs,
  __resetPrefsSubscribers,
} from '../services/preferences.js';

const pick = (id, slot, scaled = 5, deterministic = false) => ({
  poem: { id, title: `poem ${id}` },
  slot,
  rank: slot + 1,
  scaled,
  ratio: scaled / 5,
  deterministic,
});

const batch = (picks, extra = {}) => ({
  picks,
  scored: picks.map((p) => ({ poem: p.poem, scaled: p.scaled, ratio: p.ratio, matched: {} })),
  temperature: 2,
  prefs: { family: 'valor-defiance' },
  queries: [{ role: 'anchored', query: { family: 'valor-defiance' } }],
  poemsSeen: 0,
  ...extra,
});

describe('lastDraw: a record per poem, not per feed', () => {
  beforeEach(() => clearLastDraw());

  it('gives every slide in a batch its own record', () => {
    recordFeedDraw(batch([pick(1, 0, 5, true), pick(2, 1, 4, true), pick(3, 2, 1)]));
    expect(getDrawFor(1).slot).toBe(0);
    expect(getDrawFor(2).slot).toBe(1);
    expect(getDrawFor(3).slot).toBe(2);
    expect(getDrawFor(3).scaled).toBe(1);
  });

  it('reports whether a slide was ranked or sampled', () => {
    recordFeedDraw(batch([pick(1, 0, 5, true), pick(2, 1, 5, true), pick(3, 2, 5, false)]));
    expect(getDrawFor(1).deterministic).toBe(true);
    expect(getDrawFor(3).deterministic).toBe(false);
  });

  it('returns null for a poem that was never drawn by score', () => {
    recordFeedDraw(batch([pick(1, 0)]));
    // A poet-run slide, or a load-more from an unanswered reader. Showing a
    // neighbour's numbers under its title is the frozen-panel bug.
    expect(getDrawFor(999)).toBe(null);
    expect(getDrawFor(undefined)).toBe(null);
  });

  it('shares one candidate list across the batch rather than copying it', () => {
    recordFeedDraw(batch([pick(1, 0), pick(2, 1)]));
    expect(getDrawFor(1).scored).toBe(getDrawFor(2).scored);
  });

  it('exposes the feed in slide order for the ahead/behind queue', () => {
    recordFeedDraw(batch([pick(7, 0, 5, true), pick(8, 1, 4, true), pick(9, 2, 0)]));
    expect(getFeedOrder().map((f) => [f.id, f.slot, f.scaled])).toEqual([
      [7, 0, 5],
      [8, 1, 4],
      [9, 2, 0],
    ]);
  });

  it('APPENDS a load-more batch instead of forgetting what came before', () => {
    recordFeedDraw(batch([pick(1, 0), pick(2, 1)]));
    recordFeedDraw(batch([pick(3, 2), pick(4, 3)], { replaceFeed: false }));
    expect(getFeedOrder().map((f) => f.id)).toEqual([1, 2, 3, 4]);
    expect(getDrawFor(1)).not.toBe(null);
  });

  it('REPLACES the queue when a fresh feed is drawn', () => {
    recordFeedDraw(batch([pick(1, 0), pick(2, 1)]));
    recordFeedDraw(batch([pick(5, 0), pick(6, 1)]));
    expect(getFeedOrder().map((f) => f.id)).toEqual([5, 6]);
  });

  it('still answers getLastDraw for the single-poem path', () => {
    recordFeedDraw(batch([pick(42, 0)]));
    expect(getLastDraw().picked.id).toBe(42);
  });
});

describe('preferences: changing the answers notifies the feed', () => {
  beforeEach(() => {
    __resetPrefsSubscribers();
    globalThis.localStorage?.clear?.();
  });

  it('fires when an answer actually changes', () => {
    const seen = vi.fn();
    subscribePrefs(seen);
    writePrefs({ family: 'valor-defiance', moods: [], motifs: [] });
    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen.mock.calls[0][0].family).toBe('valor-defiance');
  });

  it('does NOT fire when the same answers are written back', () => {
    // This is the sign-in reconcile: it writes the account's answers to the
    // device on every login, and they are almost always identical. Redrawing the
    // feed under someone who signed in to save a poem would be a bug.
    const seen = vi.fn();
    const prefs = { family: 'valor-defiance', moods: ['pride'], motifs: [] };
    subscribePrefs(seen);
    writePrefs(prefs);
    writePrefs({ ...prefs });
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('ignores completedAt — a re-save with the same answers is not a change', () => {
    const seen = vi.fn();
    subscribePrefs(seen);
    writePrefs({ family: 'valor-defiance', completedAt: '2020-01-01' });
    writePrefs({ family: 'valor-defiance', completedAt: '2026-01-01' });
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('treats multi-select order as the same answer', () => {
    const seen = vi.fn();
    subscribePrefs(seen);
    writePrefs({ moods: ['pride', 'defiance'] });
    writePrefs({ moods: ['defiance', 'pride'] });
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('fires on clear, so wiping the answers un-biases the feed', () => {
    const seen = vi.fn();
    subscribePrefs(seen);
    writePrefs({ family: 'valor-defiance' });
    clearPrefs();
    expect(seen).toHaveBeenCalledTimes(2);
  });

  it('one throwing subscriber does not silence the others', () => {
    const ok = vi.fn();
    subscribePrefs(() => {
      throw new Error('boom');
    });
    subscribePrefs(ok);
    writePrefs({ family: 'grief-loss' });
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes', () => {
    const seen = vi.fn();
    const off = subscribePrefs(seen);
    off();
    writePrefs({ family: 'valor-defiance' });
    expect(seen).not.toHaveBeenCalled();
  });
});

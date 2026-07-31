import { wordMoras } from './verseSyllableWeightedTimings.js';

/**
 * The production-safe profiles retained from the low-latency word-sync
 * investigation. They all use the same Live transcript anchors and 250 ms
 * visual lag. The selected default is the strongest held-out karaoke result:
 * 64.9% exact single-word state at audited speech starts.
 * Profiles differ only in how a measured verse span is divided between its
 * words and what clock remains active before that verse has usable anchors.
 */
export const DEFAULT_LIVE_TIMING_PROFILE = 'branch-transcript-moras';

export const LIVE_TIMING_PROFILE_OPTIONS = [
  {
    value: 'branch-transcript-moras',
    label: 'transcript + moras [64.9% exact word]',
    schedule: 'moras',
  },
  {
    value: 'transcript-moras-weighted-fallback',
    label: 'moras + weighted fallback [56.3% exact word]',
    schedule: 'moras',
    fallback: 'weighted',
  },
  {
    value: 'transcript-mora-blend-50',
    label: '50% mora / 50% even [49.8% exact word]',
    schedule: 'mora-blend',
    moraBlend: 0.5,
    requireFullSegment: true,
  },
  {
    value: 'transcript-mora-blend-75',
    label: '75% mora / 25% even [50.9% exact word]',
    schedule: 'mora-blend',
    moraBlend: 0.75,
    requireFullSegment: true,
  },
  {
    value: 'branch-transcript-letters',
    label: 'transcript + letters [24.1% exact word]',
    schedule: 'letters',
  },
  {
    value: 'transcript-mora-blend-25',
    label: '25% mora / 75% even [54.2% exact word]',
    schedule: 'mora-blend',
    moraBlend: 0.25,
    requireFullSegment: true,
  },
  {
    value: 'transcript-mora-blend-50-weighted-fallback',
    label: '50% mora / 50% even + fallback [43.6% exact word]',
    schedule: 'mora-blend',
    moraBlend: 0.5,
    fallback: 'weighted',
    requireFullSegment: true,
  },
  {
    value: 'transcript-mora-final',
    label: 'moras + final-word reserve [37.1% exact word]',
    schedule: 'moras-final',
    finalWeight: 1.25,
    requireFullSegment: true,
  },
  {
    value: 'weighted',
    label: 'global character-weighted clock [23.5% exact word]',
    fallback: 'weighted',
    fallbackOnly: true,
  },
];

const PROFILES_BY_VALUE = new Map(
  LIVE_TIMING_PROFILE_OPTIONS.map((profile) => [profile.value, profile])
);

export function liveTimingProfile(value) {
  return PROFILES_BY_VALUE.get(value) || PROFILES_BY_VALUE.get(DEFAULT_LIVE_TIMING_PROFILE);
}

/**
 * Build a visual schedule from aligned Live-transcript timing and a conservative
 * character-weighted fallback. A verse is only rescheduled once its measured
 * boundary words are direct transcript matches; the stricter blend profiles
 * additionally wait for every word in that verse to match.
 */
export function applyLiveTimingProfile({
  profile: profileValue,
  alignedTimings,
  fallbackTimings,
  wordOffsets,
  directMatches = [],
}) {
  if (!Array.isArray(alignedTimings) || alignedTimings.length === 0) return [];

  const profile = liveTimingProfile(profileValue);
  const output = (profile.fallback === 'weighted' ? fallbackTimings : alignedTimings).map(
    (timing) => ({
      ...timing,
    })
  );
  if (profile.fallbackOnly) return output;
  const offsets = Array.isArray(wordOffsets) && wordOffsets.length ? wordOffsets : [0];

  for (let verse = 0; verse < offsets.length; verse += 1) {
    const start = offsets[verse];
    const end = Math.min(offsets[verse + 1] ?? alignedTimings.length, alignedTimings.length);
    if (start >= end || !directMatches[start] || !directMatches[end - 1]) continue;
    if (profile.requireFullSegment && directMatches.slice(start, end).some((matched) => !matched)) {
      continue;
    }

    const first = alignedTimings[start];
    const last = alignedTimings[end - 1];
    if (!first || !last || last.end < first.start) continue;

    const weights = [];
    let totalWeight = 0;
    for (let index = start; index < end; index += 1) {
      const word = alignedTimings[index].word;
      let weight = 1;
      if (profile.schedule === 'letters') weight = Math.max(1, [...word].length);
      if (profile.schedule === 'moras' || profile.schedule === 'moras-final') {
        weight = wordMoras(word);
      }
      if (profile.schedule === 'mora-blend') {
        weight = 1 + profile.moraBlend * (wordMoras(word) - 1);
      }
      if (profile.schedule === 'moras-final' && index === end - 1) {
        weight *= profile.finalWeight;
      }
      weights.push(Math.max(1, weight));
      totalWeight += Math.max(1, weight);
    }

    const span = last.end - first.start;
    let cursor = first.start;
    for (let offset = 0; offset < weights.length; offset += 1) {
      const index = start + offset;
      const endTime =
        offset === weights.length - 1 ? last.end : cursor + span * (weights[offset] / totalWeight);
      output[index] = { ...alignedTimings[index], start: cursor, end: endTime };
      cursor = endTime;
    }
  }

  return output;
}

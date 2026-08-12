// ── Curated feed weighting ──
// Loads config/curation.json and turns a taste profile (favor/neutral/avoid
// tiers across mood/topic/motif) into SQL that biases the random serve toward
// favored content and away from avoided content, without hard-excluding anything.
//
// Weighting math:
//   - Each category value maps to a tier multiplier (favor 1.6 / neutral 1.0 / avoid 0.4).
//   - A poem's weight = mean of the multipliers of all its category labels
//     (across all three dimensions), so a poem is judged on its whole profile,
//     not one label. Uncategorized poems fall back to neutral (1.0).
//   - Weighted single-item sampling via Efraimidis-Spirakis: key = RANDOM()^(1/weight),
//     pick the largest key. Higher weight => surfaces more often. avoid stays > 0
//     so nothing is ever fully excluded by weight alone (downvotes do the excluding).

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let _config = null;

export function loadCuration() {
  if (_config) return _config;
  try {
    const file = join(__dirname, 'config', 'curation.json');
    _config = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    // Missing or malformed config must never take the server down: fall back to
    // an empty profile so curation degrades to plain random.
    console.warn(
      `[curation] config/curation.json unreadable, falling back to neutral: ${err.message}`
    );
    _config = {
      version: 1,
      dimensions: [],
      tiers: { favor: 1.6, neutral: 1.0, avoid: 0.4 },
      combine: 'mean',
      profiles: { default: {} },
      users: {},
    };
  }
  return _config;
}

// Resolve which profile to serve. userId-first so per-user profiles slot in
// later; for now everyone who opts into curation gets the shipped `default`.
// `requested` is an untrusted query param — only honored if it names a real profile.
export function resolveProfile(userId, requested) {
  const cfg = loadCuration();
  const byUser = userId && cfg.users && cfg.users[userId];
  const name = (requested && cfg.profiles[requested] && requested) || byUser || 'default';
  return {
    name,
    profile: cfg.profiles[name] || cfg.profiles.default,
    tiers: cfg.tiers,
    dims: cfg.dimensions,
  };
}

// Build the (value -> multiplier) VALUES rows for a profile, skipping neutral
// (neutral is the COALESCE default, so it needn't be listed in SQL).
function weightRows({ profile, tiers, dims }) {
  const rows = [];
  for (const dim of dims) {
    const map = profile[dim] || {};
    for (const [val, tier] of Object.entries(map)) {
      const mult = tiers[tier];
      if (mult == null || mult === tiers.neutral) continue;
      // val comes from the committed config file (developer-controlled), not user input.
      rows.push(`('${val.replace(/'/g, "''")}', ${Number(mult)})`);
    }
  }
  return rows;
}

// Returns { joinSql, orderExpr } to splice into the serve query. `p` is the
// poems table alias in the outer query. When a profile has no non-neutral
// weights, falls back to plain random.
export function curationSql(resolved) {
  const rows = weightRows(resolved);
  if (rows.length === 0) {
    return { joinSql: '', orderExpr: 'RANDOM()' };
  }
  const joinSql = `
      LEFT JOIN LATERAL (
        SELECT COALESCE(AVG(COALESCE(cw.mult, 1.0)), 1.0) AS weight
        FROM (
          SELECT jsonb_array_elements_text(p.categories->'moods')  AS v WHERE p.categories ? 'moods'
          UNION ALL
          SELECT jsonb_array_elements_text(p.categories->'topics')     WHERE p.categories ? 'topics'
          UNION ALL
          SELECT jsonb_array_elements_text(p.categories->'motifs')     WHERE p.categories ? 'motifs'
        ) labels
        LEFT JOIN (VALUES ${rows.join(', ')}) AS cw(val, mult) ON cw.val = labels.v
      ) curw ON true`;
  // Efraimidis-Spirakis: larger key => more likely. Guard weight against 0.
  const orderExpr = `POWER(RANDOM(), 1.0 / GREATEST(curw.weight, 0.01)) DESC`;
  return { joinSql, orderExpr };
}

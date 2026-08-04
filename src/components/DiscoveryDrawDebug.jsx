import { useEffect, useState } from 'react';

import { getLastDraw } from '../services/lastDraw.js';
import { MAX_SCORE, facetsOf } from '../services/preferenceWeighting.js';

/**
 * The last scored draw, laid out so the weighting can be checked by eye.
 *
 * This exists because low-scoring poems appearing in the feed is CORRECT — the
 * open candidate page is what keeps the corpus reachable — and from the outside
 * a correct surprise and a broken weighting look exactly the same. What
 * distinguishes them is visible here and nowhere else: every candidate's own
 * facets, the score it earned, which of the reader's answers it actually
 * matched, and the temperature the draw ran at.
 *
 * Ordered by score so the shape of the distribution reads at a glance; the
 * PICKED row is marked rather than moved to the top, so you can see whether it
 * came from the head or the tail. Seeing a tail pick occasionally is the feature
 * working.
 */

const pct = (n) => `${Math.round(n * 100)}%`;

const ROW = 'text-[0.5625rem] font-mono leading-tight';

const MatchedCell = ({ matched }) => {
  const bits = [];
  if (matched.family) bits.push(matched.family.overlapping ? 'fam*' : 'fam');
  if (matched.mood) bits.push(`mood:${matched.mood.join('+')}`);
  if (matched.motif) bits.push(`motif:${matched.motif.join('+')}`);
  if (matched.era) bits.push(`era:${matched.era}`);
  if (matched.difficulty) bits.push(`diff:${matched.difficulty}`);
  return <span className="opacity-70">{bits.join(' ') || '—'}</span>;
};

const DiscoveryDrawDebug = ({ theme }) => {
  // The draw is a module-level box (see services/lastDraw.js) and nothing
  // re-renders off it, so poll while the panel is mounted. Debug-only, and a
  // 1s tick is far cheaper than publishing a store update on every fetch.
  const [draw, setDraw] = useState(() => getLastDraw());
  useEffect(() => {
    const id = setInterval(() => setDraw(getLastDraw()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!draw) {
    return (
      <div className={`px-4 py-2 border-t ${theme.border} flex-none`}>
        <span className="text-[0.5625rem] font-brand-en uppercase tracking-widest font-semibold opacity-50">
          Discovery Draw
        </span>
        <p className="text-[0.5625rem] font-mono opacity-40 mt-1">
          No scored draw yet — answer the preference flow, then discover a poem.
        </p>
      </div>
    );
  }

  const { scored, temperature, picked, prefs, queries, poemsSeen } = draw;
  const rows = scored
    .map((s, i) => ({ ...s, i }))
    .sort((a, b) => b.scaled - a.scaled)
    .slice(0, 30);

  return (
    <div className={`px-4 py-2 border-t ${theme.border} flex-none`}>
      <div className="flex items-center gap-2">
        <span className="text-amber-400 flex-shrink-0 text-[0.5625rem]">◆</span>
        <span className="text-[0.5625rem] font-brand-en uppercase tracking-widest font-semibold opacity-50">
          Discovery Draw
        </span>
        <span className="text-[0.5625rem] font-mono opacity-40 ml-auto">
          T={temperature.toFixed(2)} · seen {poemsSeen} · {scored.length} cand.
        </span>
      </div>

      {/* What the reader asked for, and what was actually requested for it. */}
      <div className={`${ROW} opacity-50 mt-1.5`}>
        <div>
          answers: {prefs?.family || '—'} / {(prefs?.moods || []).join('+') || '—'} /{' '}
          {(prefs?.motifs || []).join('+') || '—'} / {prefs?.era || '—'} /{' '}
          {prefs?.difficulty || '—'}
        </div>
        <div>
          pages:{' '}
          {(queries || [])
            .map(
              (q) =>
                `${q.role}(${
                  Object.keys(q.query)
                    .filter((k) => k !== 'limit')
                    .join(',') || 'none'
                })`
            )
            .join(' + ')}
        </div>
      </div>

      <div className="overflow-x-auto mt-1.5">
        <table className={ROW} style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead className="opacity-40">
            <tr>
              <th className="text-left pr-2">score</th>
              <th className="text-left pr-2">poem</th>
              <th className="text-left pr-2">facets</th>
              <th className="text-left">matched</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const isPicked = s.poem?.id === picked?.id;
              const f = facetsOf(s.poem);
              return (
                <tr
                  key={s.poem?.id ?? s.i}
                  className={isPicked ? 'text-amber-400' : 'opacity-70'}
                  style={{ background: isPicked ? 'rgba(197,160,89,0.10)' : undefined }}
                >
                  <td className="pr-2 whitespace-nowrap align-top">
                    {isPicked ? '▶ ' : '  '}
                    {s.scaled.toFixed(2)}/{MAX_SCORE}
                    <span className="opacity-50"> ({pct(s.ratio)})</span>
                  </td>
                  <td className="pr-2 align-top" style={{ maxWidth: 140 }}>
                    <span className="opacity-60">#{s.poem?.id}</span> {s.poem?.title}
                  </td>
                  <td className="pr-2 align-top opacity-60" style={{ maxWidth: 190 }}>
                    {[
                      f.moods.join('+') || '·',
                      f.motifs.join('+') || '·',
                      f.century == null ? 'undated' : `c${f.century}`,
                      f.accessibility == null ? '·' : f.accessibility.toFixed(1),
                    ].join(' | ')}
                  </td>
                  <td className="align-top">
                    <MatchedCell matched={s.matched} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[0.5625rem] font-mono opacity-30 mt-1.5 leading-tight">
        A low-scoring pick is correct, not a bug — the unanchored page keeps every poem reachable.{' '}
        fam* = family credit discounted because the reader already named the value it matched on.
      </p>
    </div>
  );
};

export default DiscoveryDrawDebug;

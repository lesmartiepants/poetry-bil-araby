import { useEffect, useRef, useState } from 'react';
import { Scale, X } from 'lucide-react';

import { FEATURES } from '../constants/features.js';
import { THEME } from '../constants/theme.js';
import { useUIStore } from '../stores/uiStore';
import { getLastDraw } from '../services/lastDraw.js';
import { MAX_SCORE, facetsOf } from '../services/preferenceWeighting.js';

/**
 * الميزان — the scale. The last scored draw, laid out so the weighting can be
 * checked by eye.
 *
 * This exists because low-scoring poems appearing in the feed is CORRECT — the
 * open candidate page is what keeps the corpus reachable — and from the outside
 * a correct surprise and a broken weighting look exactly the same. What
 * distinguishes them is visible here and nowhere else: every candidate's own
 * facets, the score it earned, which of the reader's answers it actually
 * matched, and the temperature the draw ran at.
 *
 * It used to be a strip inside the debug panel, where thirty rows of monospace
 * ran off the bottom and the one row that mattered — the pick — looked like all
 * the others. As its own surface it leads with the answer (what got picked, and
 * where that score fell in the spread) and keeps the full table underneath it,
 * scrolling, for when the summary isn't enough.
 *
 * Ordered by score so the shape of the distribution reads at a glance; the
 * picked row is marked rather than moved to the top, so you can see whether it
 * came from the head or the tail. Seeing a tail pick occasionally is the feature
 * working.
 */

const pct = (n) => `${Math.round(n * 100)}%`;

const MONO = 'text-[0.5625rem] font-mono leading-tight';

/**
 * score / poem / facets / matched.
 *
 * Fixed score column so the numbers and their bars line up as a single readable
 * strip; the rest share what's left. Below `sm` there isn't room for four
 * columns without shredding every title to "What …", so the row wraps: score
 * keeps its column and spans both lines, the title gets the whole first line,
 * and facets + matched share the second.
 */
const ROW_GRID =
  'grid grid-cols-[92px_minmax(0,1fr)] sm:grid-cols-[104px_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,0.9fr)]';

const MatchedCell = ({ matched }) => {
  const bits = [];
  if (matched.family) bits.push(matched.family.overlapping ? 'fam*' : 'fam');
  if (matched.mood) bits.push(`mood:${matched.mood.join('+')}`);
  if (matched.motif) bits.push(`motif:${matched.motif.join('+')}`);
  if (matched.era) bits.push(`era:${matched.era}`);
  if (matched.difficulty) bits.push(`diff:${matched.difficulty}`);
  return <span>{bits.join(' ') || '—'}</span>;
};

/** Small caps label used for every chrome heading in the panel. */
const Label = ({ children, className = '' }) => (
  <span
    className={`text-[0.5625rem] font-brand-en uppercase tracking-widest font-semibold ${className}`}
  >
    {children}
  </span>
);

/**
 * Every candidate's score as a tick on a fixed 0→100% axis, with the pick in
 * gold. The whole point of the panel is "was this pick reasonable given the
 * spread", and that is a shape, not a number — so it gets drawn rather than
 * tabulated.
 */
const SpreadRail = ({ rows }) => (
  <div className="mt-2.5">
    <div
      className="relative h-7 rounded"
      style={{
        // A flat track, deliberately: a gradient here reads as a filled
        // progress bar, which is the opposite of what the ticks mean.
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Inset by half a tick so 0% and 100% candidates aren't half-clipped. */}
      <div className="absolute inset-y-0" style={{ left: 3, right: 3 }}>
        {rows.map((s, i) => (
          <span
            key={s.poem?.id ?? i}
            className="absolute rounded-full"
            style={{
              left: `${Math.min(100, Math.max(0, s.ratio * 100))}%`,
              transform: 'translateX(-50%)',
              top: s.isPicked ? 3 : 8,
              width: s.isPicked ? 3 : 1,
              height: s.isPicked ? 20 : 10,
              background: s.isPicked ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
              boxShadow: s.isPicked ? '0 0 7px 1px rgba(197,160,89,0.8)' : undefined,
            }}
          />
        ))}
      </div>
    </div>
    <div className={`${MONO} flex justify-between opacity-30 mt-1`}>
      <span>0%</span>
      <span>every candidate, by score · the pick in gold</span>
      <span>100%</span>
    </div>
  </div>
);

const DiscoveryDrawInspector = () => {
  const darkMode = useUIStore((s) => s.darkMode);
  // Rides the same switch as the other developer affordances, so one toggle
  // clears every dev surface off the reader's screen.
  const devSurfacesVisible = useUIStore((s) => s.showDebugLogs);
  const theme = darkMode ? THEME.dark : THEME.light;

  const [open, setOpen] = useState(false);
  const pickedRowRef = useRef(null);
  // The draw is a module-level box (see services/lastDraw.js) and nothing
  // re-renders off it, so poll while the trigger is mounted. Dev-only, and a
  // 1s tick is far cheaper than publishing a store update on every fetch.
  const [draw, setDraw] = useState(() => getLastDraw());
  useEffect(() => {
    const id = setInterval(() => setDraw(getLastDraw()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // A tail pick is exactly the case worth looking at, and it is also the case
  // that lands thirty rows down. Bring it into view on open so the row the
  // header is talking about is the row you are looking at.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() =>
      pickedRowRef.current?.scrollIntoView({ block: 'center' })
    );
    return () => cancelAnimationFrame(id);
  }, [open, draw]);

  if (!FEATURES.drawInspector || !FEATURES.onboardingPrefs || !devSurfacesVisible) return null;

  const picked = draw?.picked;
  const rows = (draw?.scored || [])
    .map((s, i) => ({ ...s, i, isPicked: s.poem?.id === picked?.id }))
    .sort((a, b) => b.scaled - a.scaled);
  const pickedIndex = rows.findIndex((r) => r.isPicked);
  const pickedRow = pickedIndex >= 0 ? rows[pickedIndex] : null;

  const surface = darkMode ? 'bg-black/80' : 'bg-white/90';

  return (
    <>
      {/* Trigger — sits immediately left of the debug bug icon so the two read
          as one cluster of dev tools, clear of the centred nav pill. */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed z-[200] w-[44px] h-[44px] flex items-center justify-center"
        style={{ right: 52, bottom: 52 }}
        title="الميزان — inspect the scored discovery draw"
        aria-label="Inspect the scored discovery draw"
        aria-expanded={open}
      >
        <span
          className={`relative w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
            darkMode
              ? `bg-black/70 text-gold/40 hover:text-gold/80 border ${theme.border}`
              : `bg-white/80 text-gold/30 hover:text-gold/70 border ${theme.border}`
          } backdrop-blur-xl`}
          style={open ? { boxShadow: '0 0 10px 2px rgba(197,160,89,0.45)' } : undefined}
        >
          <Scale size={10} strokeWidth={1.5} />
          {/* A draw is waiting to be read. */}
          {draw && !open && (
            <span
              className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--gold)' }}
            />
          )}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[199]" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      <div
        role="dialog"
        aria-label="Discovery draw inspector"
        aria-hidden={!open}
        className={`fixed z-[200] left-2 right-2 md:left-auto md:w-[560px] flex flex-col rounded-2xl border ${theme.border} ${surface} backdrop-blur-xl transition-all duration-200 ${
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        style={{
          bottom: 100,
          right: 8,
          maxHeight: 'min(62vh, 540px)',
          boxShadow: '0 0 24px 4px rgba(197,160,89,0.12), 0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header — bilingual, because this is chrome. */}
        <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${theme.border} flex-none`}>
          <span className="text-[0.6875rem] flex-shrink-0" style={{ color: 'var(--gold)' }}>
            ◆
          </span>
          <span
            className="font-brand-ar text-sm leading-none"
            style={{ color: 'var(--gold)' }}
            dir="rtl"
          >
            الميزان
          </span>
          <Label className="opacity-50">Discovery Draw</Label>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto opacity-40 hover:opacity-90 transition-opacity"
            aria-label="Close the discovery draw inspector"
          >
            <X size={12} strokeWidth={1.5} />
          </button>
        </div>

        {!draw ? (
          <div className="px-4 py-6">
            <p className={`${MONO} opacity-40`}>
              No scored draw yet — answer the preference flow, then discover a poem.
            </p>
          </div>
        ) : (
          <>
            {/* The answer, up top: what was picked and where it landed. */}
            <div className={`px-4 pt-3 pb-2.5 border-b ${theme.border} flex-none`}>
              <div className="flex items-baseline gap-2">
                <span
                  className="font-brand-en text-2xl leading-none"
                  style={{ color: 'var(--gold)' }}
                >
                  {(pickedRow?.scaled ?? 0).toFixed(2)}
                </span>
                <span className="font-brand-en text-sm opacity-40 leading-none">/ {MAX_SCORE}</span>
                <span className={`${MONO} opacity-50`}>({pct(pickedRow?.ratio ?? 0)})</span>
                <span className={`${MONO} opacity-40 ml-auto text-right`}>
                  T={draw.temperature.toFixed(2)} · seen {draw.poemsSeen} · {rows.length} cand.
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-1.5">
                <div className="text-[0.6875rem] truncate">
                  <span className="opacity-40">#{picked?.id}</span>{' '}
                  <span className="opacity-90">{picked?.title}</span>
                </div>
                {/* Head or tail — the one thing the raw score can't tell you. */}
                {pickedIndex >= 0 && (
                  <span className={`${MONO} opacity-45 ml-auto flex-none`}>
                    rank {pickedIndex + 1} of {rows.length}
                  </span>
                )}
              </div>

              <SpreadRail rows={rows} />
            </div>

            {/* What the reader asked for, and what was actually requested for it. */}
            <div className={`${MONO} opacity-50 px-4 py-2 border-b ${theme.border} flex-none`}>
              <div className="truncate">
                answers: {draw.prefs?.family || '—'} / {(draw.prefs?.moods || []).join('+') || '—'}{' '}
                / {(draw.prefs?.motifs || []).join('+') || '—'} / {draw.prefs?.era || '—'} /{' '}
                {draw.prefs?.difficulty || '—'}
              </div>
              <div className="truncate mt-0.5">
                pages:{' '}
                {(draw.queries || [])
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

            {/* Column labels live OUTSIDE the scroller rather than as a sticky
                <thead>. The rows carry `opacity`, which makes each one its own
                stacking context, and a sticky header loses to them however its
                z-index is set — it ends up transparent with rows sliding
                through the labels. A plain header row above the scroll box has
                no such fight, and grid keeps the columns aligned. */}
            <div
              className={`${MONO} ${ROW_GRID} gap-x-2 opacity-40 px-4 pt-2 pb-1 flex-none border-b ${theme.border}`}
            >
              <span>score</span>
              <span>poem</span>
              <span className="hidden sm:block">facets</span>
              <span className="hidden sm:block">matched</span>
            </div>

            {/* The full list — now the thing that scrolls, rather than the
                thing that runs off the bottom of the panel. */}
            <div className={`${MONO} overflow-y-auto flex-1 min-h-0 px-4 py-1`}>
              {rows.map((s) => {
                const f = facetsOf(s.poem);
                return (
                  <div
                    key={s.poem?.id ?? s.i}
                    ref={s.isPicked ? pickedRowRef : undefined}
                    className={`${ROW_GRID} gap-x-2 py-1 -mx-2 px-2 rounded-sm ${
                      s.isPicked ? '' : 'opacity-60'
                    }`}
                    style={
                      s.isPicked
                        ? {
                            color: 'var(--gold)',
                            background: 'rgba(197,160,89,0.12)',
                            boxShadow: 'inset 2px 0 0 var(--gold)',
                          }
                        : undefined
                    }
                  >
                    <span className="whitespace-nowrap row-span-2 sm:row-span-1">
                      <span className="inline-block w-2">{s.isPicked ? '▶' : ''}</span>
                      {s.scaled.toFixed(2)}
                      <span className="opacity-50">/{MAX_SCORE}</span>
                      {/* Per-row bar: the spread again, but per line, so
                          scanning the list doesn't mean parsing numbers. */}
                      <span
                        className="inline-block align-middle ml-1.5 rounded-full overflow-hidden"
                        style={{ width: 26, height: 3, background: 'rgba(255,255,255,0.10)' }}
                      >
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.round(s.ratio * 100)}%`,
                            background: s.isPicked ? 'var(--gold)' : 'rgba(255,255,255,0.45)',
                          }}
                        />
                      </span>
                    </span>
                    <span className="truncate">
                      <span className="opacity-60">#{s.poem?.id}</span> {s.poem?.title}
                    </span>
                    {/* Below sm these two share the second line; at sm and up
                        they are their own columns. */}
                    <span className="truncate opacity-70">
                      {[
                        f.moods.join('+') || '·',
                        f.motifs.join('+') || '·',
                        f.century == null ? 'undated' : `c${f.century}`,
                        f.accessibility == null ? '·' : f.accessibility.toFixed(1),
                      ].join(' | ')}
                      <span className="sm:hidden opacity-90">
                        {' · '}
                        <MatchedCell matched={s.matched} />
                      </span>
                    </span>
                    <span className="truncate opacity-70 hidden sm:block">
                      <MatchedCell matched={s.matched} />
                    </span>
                  </div>
                );
              })}
            </div>

            {/* The sentence that prevents a false bug report. Pinned, because it
                is only useful when you are staring at a low-scoring pick. */}
            <p
              className={`${MONO} opacity-40 px-4 py-2 border-t ${theme.border} flex-none leading-relaxed`}
            >
              A low-scoring pick is correct, not a bug — the unanchored page keeps every poem
              reachable. <span className="opacity-80">fam*</span> = family credit discounted because
              the reader already named the value it matched on.
            </p>
          </>
        )}
      </div>
    </>
  );
};

export default DiscoveryDrawInspector;

import { useEffect, useMemo, useRef, useState } from 'react';
import { Scale, X } from 'lucide-react';

import { FEATURES } from '../constants/features.js';
import { THEME } from '../constants/theme.js';
import { useUIStore } from '../stores/uiStore';
import { usePoemStore } from '../stores/poemStore';
import { getDrawFor, getFeedOrder, getLastDraw } from '../services/lastDraw.js';
import {
  FAMILY_OVERLAP_DISCOUNT,
  MAX_SCORE,
  explainRows,
  hasPreferences,
  isCategorized,
} from '../services/preferenceWeighting.js';
import { fetchCategoryBands } from '../services/categoryBands.js';
import { readPrefs, subscribePrefs } from '../services/preferences.js';

/**
 * الميزان — the scale. The scored draw FOR THE POEM IN FRONT OF THE READER, laid
 * out so the weighting can be checked by eye.
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
 *
 * IT FOLLOWS THE SLIDE. It used to read a single module-level box and poll it
 * once a second, which was defensible only while there was genuinely one scored
 * draw per feed. Now that every slide is its own draw, the panel keys off the
 * carousel index — reactive state it already had — so scrolling moves the
 * numbers AND the spread rail. The poll is gone: there is nothing left to poll
 * for, since the index change is what makes the draw change.
 */

const pct = (n) => `${Math.round(n * 100)}%`;

const MONO = 'text-[0.5625rem] font-mono leading-tight';

/**
 * score / poem.
 *
 * Fixed score column so the numbers and their bars line up as a single readable
 * strip; the title takes what's left. This used to carry two more columns —
 * `facets` and `matched` — which is where the poem's own labels and the reasons
 * it matched lived. At 375px those two were ~90px each and ellipsed to nothing,
 * so the panel's actual answer was the part you could not read. They moved up
 * into the WHY block, at full width. The table keeps the job it was always good
 * at: how this pick compares to the other twenty-nine.
 */
const ROW_GRID = 'grid grid-cols-[minmax(0,116px)_minmax(0,1fr)]';

/* -------------------------------------------------------------------------- */
/* The why block                                                               */
/* -------------------------------------------------------------------------- */

/**
 * One colour per state, and they have to survive being read at 10px on a phone
 * in sunlight, so they are separated by HUE, WEIGHT and GLYPH rather than by
 * opacity alone — opacity was what made the old table unreadable.
 *
 *   matched  gold, filled, ✓   the reader asked for it and got it
 *   partial  gold, hollow, ≈   graded credit: adjacent century, near difficulty
 *   present  grey, flat,   ·   true of the poem, never asked for
 *   absent   rose, struck, ✕   asked for and NOT here — the interesting miss
 */
const CHIP_STATES = {
  matched: {
    glyph: '✓',
    color: 'var(--gold)',
    background: 'rgba(197,160,89,0.16)',
    border: 'rgba(197,160,89,0.55)',
  },
  partial: {
    glyph: '≈',
    color: 'var(--gold)',
    background: 'transparent',
    border: 'rgba(197,160,89,0.4)',
  },
  present: {
    glyph: '',
    color: 'rgba(255,255,255,0.55)',
    background: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.12)',
  },
  absent: {
    glyph: '✕',
    color: '#d98b83',
    background: 'rgba(217,139,131,0.10)',
    border: 'rgba(217,139,131,0.42)',
  },
};

/**
 * One taxonomy value.
 *
 * Arabic leads and English follows on the same chip, which is the app's rule
 * everywhere else and is also the only way this stays useful — the taxonomy
 * keys are English slugs, so an Arabic-only chip would be unmatchable against
 * the answers stored in localStorage, and an English-only one would be the one
 * surface in the app that drops the Arabic.
 *
 * `whitespace-normal` + `break-words` is the whole acceptance criterion: a chip
 * WRAPS. Nothing in this block may truncate.
 */
const Chip = ({ chip }) => {
  const s = CHIP_STATES[chip.state] || CHIP_STATES.present;
  return (
    <span
      className="inline-flex items-baseline gap-1 rounded px-1.5 py-[2px] whitespace-normal break-words max-w-full"
      style={{ color: s.color, background: s.background, border: `1px solid ${s.border}` }}
      title={`${chip.label_en} — ${chip.state}`}
    >
      {chip.wanted && <span className="opacity-60 text-[0.5rem]">wanted</span>}
      {chip.label_ar && (
        <span className="font-brand-ar text-[0.75rem] leading-none" dir="rtl">
          {chip.label_ar}
        </span>
      )}
      <span
        className={`font-mono text-[0.5625rem] leading-tight ${chip.label_ar ? 'opacity-70' : ''}`}
      >
        {chip.label_en}
      </span>
      {s.glyph && <span className="text-[0.625rem] leading-none">{s.glyph}</span>}
    </span>
  );
};

/**
 * WHY THIS POEM — one row per dimension, full panel width.
 *
 * The layout is a two-column grid rather than a flex row so every dimension
 * name starts at the same x, which is what makes the block scannable when the
 * chip lists are ragged (mood might carry four values, era carries one).
 *
 * The credit sits UNDER the dimension name, in the label column, instead of
 * being a trailing column of its own. A third column would reintroduce exactly
 * the squeeze this change removes, and stacking it costs nothing: the label
 * column is already two lines tall on any row whose chips wrap.
 */
/**
 * How a poem got into a family: the poem's own values that placed it there.
 *
 * A poem has no family field — family membership is derived from mood/topic/
 * motif, so a poem usually sits in SEVERAL families at once. A bare list of
 * family labels would leave that looking arbitrary; naming the values that did
 * the placing makes each membership checkable against the rows right below it.
 *
 * It also makes the family overlap discount self-explanatory: the values named
 * here are the same ones already being credited under mood and motif, which is
 * the entire reason that discount exists.
 */
const ViaRoute = ({ via }) => (
  <span className="font-mono text-[0.5rem] leading-tight opacity-45 ml-1 mr-0.5 break-words">
    via{' '}
    {via.map((v, i) => (
      <span key={`${v.dim}-${v.key}`}>
        {i > 0 && <span className="opacity-60"> + </span>}
        {v.label_en}
      </span>
    ))}
  </span>
);

/**
 * The classifier's own sentence about why it assigned these categories.
 *
 * Collapsed by default. It is prose, in Arabic, and at 375px it runs three or
 * four lines — expanded it would push the facet rows the panel exists to show
 * below the fold. It answers a different question from the rest of the block
 * ("why is this poem in these categories" rather than "why was it served to
 * you"), so it reads as a footnote and is shaped like one.
 */
const Rationale = ({ text, border }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`mt-2 pt-2 border-t ${border}`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 opacity-50 hover:opacity-90 transition-opacity"
        aria-expanded={expanded}
      >
        <span className="font-mono text-[0.5rem] leading-none">{expanded ? '▾' : '▸'}</span>
        <Label>classifier&apos;s rationale</Label>
      </button>
      {expanded && (
        <p
          className="font-brand-ar text-[0.8125rem] leading-relaxed mt-1.5 opacity-80 break-words"
          dir="rtl"
        >
          {text}
        </p>
      )}
    </div>
  );
};

const WhyBlock = ({ rows, border, scored, uncategorized, rationale }) => (
  <div className={`px-4 py-2.5 border-b ${border} flex-none`}>
    {/* The heading names which of the panel's two jobs you are looking at.
        With a draw this block answers "why was this served to you"; without
        one it still answers "what is this poem", which is a fact about the
        poem and does not need a draw to be true. */}
    <Label className="opacity-40">{scored ? 'Why this poem' : 'What this poem is'}</Label>
    {uncategorized && (
      <p className={`${MONO} opacity-50 mt-1.5 leading-relaxed`}>
        This poem has not been through the classifier — it carries no moods, topics or motifs. The
        rows below show what is known regardless (century, reading difficulty).
      </p>
    )}
    <div className="mt-1.5 flex flex-col gap-1.5">
      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-[56px_minmax(0,1fr)] gap-x-2 items-start">
          <div className="pt-[3px]">
            {/* Lowercased in CSS, not in the data: the taxonomy ships these
                title-cased ("Mood") and the two non-taxonomy rows are ours, so
                without this the column reads as two different label styles. */}
            <div className="font-mono text-[0.5625rem] leading-tight opacity-55 lowercase">
              {row.label_en}
            </div>
            {/* Only ANSWERED steps carry arithmetic — an unanswered step
                contributes to neither the score nor the max, and printing
                "0.00/0.0" next to it would read as a poem failing a test it was
                never given. */}
            {row.term && (
              <div
                className="font-mono text-[0.5rem] leading-tight mt-[1px]"
                style={{
                  color: row.term.earned > 0 ? 'var(--gold)' : '#d98b83',
                  opacity: row.term.earned > 0 ? 0.75 : 0.7,
                }}
                title={`${row.term.detail} — ${row.term.earned} of ${row.term.weight} points`}
              >
                +{row.term.earned.toFixed(2)}
                <span className="opacity-50">/{row.term.weight.toFixed(1)}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1 min-w-0">
            {row.chips.length ? (
              row.chips.map((c) => (
                // A family chip carries its route, so the two stay on the same
                // line as one unit while the LIST still wraps between families.
                <span key={`${c.key}-${c.state}`} className="inline-flex flex-wrap items-center">
                  <Chip chip={c} />
                  {c.via?.length > 0 && <ViaRoute via={c.via} />}
                </span>
              ))
            ) : row.noFamilyMatch ? (
              // Not the same statement as "none". The poem HAS facets; none of
              // them appear in any family's value set, which is a fact about
              // the taxonomy's coverage rather than about this poem.
              <span className="font-mono text-[0.5625rem] opacity-45 pt-[3px] leading-relaxed">
                in no family — none of this poem&apos;s values belong to one
              </span>
            ) : (
              <span className="font-mono text-[0.5625rem] opacity-30 pt-[3px]">none</span>
            )}
            {/* The family overlap discount, annotated where it happens rather
                than in a footnote. A poem can match all five answers and still
                score 4.4/5 because of this line; without it on screen next to
                the number, that reads as arithmetic being broken. */}
            {row.term?.state === 'discounted' && (
              <span
                className="font-mono text-[0.5rem] leading-tight self-center opacity-60"
                style={{ color: 'var(--gold)' }}
              >
                ×{FAMILY_OVERLAP_DISCOUNT} — already counted under a mood/motif you named
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
    {rationale && <Rationale text={rationale} border={border} />}
  </div>
);

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

/**
 * The feed as drawn — every slide, its score, and where the reader is in it.
 *
 * "What's ahead and behind" is read as THE QUEUE, not as the neighbouring rows
 * of this slide's own ranking. The ranking neighbours are already visible in the
 * table below (that is what the table is), whereas the queue answers the
 * question the table cannot: is the whole feed well-matched, or did one good
 * pick land in front of four weak ones. That is the difference between "the
 * weighting works" and "the weighting worked once".
 *
 * `*` marks a slide taken by rank rather than sampled — the deterministic
 * opening. It should appear on slots 0 and 1 of a fresh draw and nowhere else.
 */
const FeedQueue = ({ feed, hereIndex, border }) => {
  if (!feed?.length) return null;
  return (
    <div className={`${MONO} px-4 py-2 border-b ${border} flex-none`}>
      <div className="opacity-40 mb-1">feed queue · ◆ = you are here · * = ranked, not sampled</div>
      <div className="flex gap-1 overflow-x-auto pb-0.5" style={{ overscrollBehavior: 'contain' }}>
        {feed.map((f, i) => {
          const here = i === hereIndex;
          return (
            <span
              key={`${f.id}-${f.slot}`}
              title={`slot ${f.slot} · ${f.title || f.id} · ${f.scaled?.toFixed?.(2)}/${MAX_SCORE}${
                f.rank ? ` · rank ${f.rank}` : ''
              }`}
              className="flex-none px-1.5 py-1 rounded-sm text-center"
              style={{
                minWidth: 46,
                color: here ? 'var(--gold)' : undefined,
                background: here ? 'rgba(197,160,89,0.14)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${here ? 'var(--gold)' : 'rgba(255,255,255,0.08)'}`,
                opacity: here ? 1 : 0.6,
              }}
            >
              <span className="block opacity-60">
                {here ? '◆' : ''}
                {f.slot}
                {f.deterministic ? '*' : ''}
              </span>
              <span className="block">{(f.scaled ?? 0).toFixed(2)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

const DiscoveryDrawInspector = () => {
  const darkMode = useUIStore((s) => s.darkMode);
  // Rides the same switch as the other developer affordances, so one toggle
  // clears every dev surface off the reader's screen.
  const devSurfacesVisible = useUIStore((s) => s.showDebugLogs);
  const theme = darkMode ? THEME.dark : THEME.light;

  const [open, setOpen] = useState(false);
  const pickedRowRef = useRef(null);
  const tableScrollRef = useRef(null);

  // The taxonomy, independent of any draw.
  //
  // A draw carries the bands it scored with, but the panel has to label facets
  // for poems that were never scored — a deep link, a poet run, the default
  // feed with onboarding skipped. fetchCategoryBands memoises per page load, so
  // this costs one request per session no matter how often the panel opens.
  const [ownBands, setOwnBands] = useState(null);
  const [prefs, setPrefs] = useState(() => readPrefs());

  // The poem the reader is actually on. Both of these are reactive, so the panel
  // re-renders on every swipe without polling anything.
  const carouselPoems = usePoemStore((s) => s.carouselPoems);
  const carouselIndex = usePoemStore((s) => s.carouselIndex);
  const currentPoemId = carouselPoems[carouselIndex]?.id ?? null;

  const { draw, feed } = useMemo(
    () => ({
      // Fall back to the last draw only when this slide has no record of its
      // own — an unweighted poem (poet filter, load-more without answers) has
      // nothing to show, and showing a neighbour's numbers under its title is
      // exactly the frozen-panel bug this replaced.
      draw: getDrawFor(currentPoemId) || (currentPoemId == null ? getLastDraw() : null),
      feed: getFeedOrder(),
    }),
    // carouselPoems is in the deps because a load-more appends records for
    // slides that already existed by index; the id alone would not change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPoemId, carouselPoems]
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Fetched lazily on first open rather than on mount: this is a dev surface,
  // and a reader who never opens it should not pay for the taxonomy.
  useEffect(() => {
    if (!open || ownBands) return undefined;
    let alive = true;
    // A failed taxonomy fetch degrades to key-only labels rather than an empty
    // panel — explainRows falls back to the raw keys when a dimension is
    // missing, which is still a readable answer.
    fetchCategoryBands()
      .then((b) => alive && setOwnBands(b))
      .catch(() => alive && setOwnBands({}));
    return () => {
      alive = false;
    };
  }, [open, ownBands]);

  // Answers can change while the panel is open (the preferences drawer writes
  // them), and the chip states are derived from them.
  useEffect(() => subscribePrefs(() => setPrefs(readPrefs())), []);

  // A tail pick is exactly the case worth looking at, and it is also the case
  // that lands thirty rows down. Bring it into view on open so the row the
  // header is talking about is the row you are looking at.
  //
  // Deliberately NOT `scrollIntoView`: that scrolls every scrollable ancestor,
  // and since the whole panel body scrolls now it would drag the why block off
  // screen to centre a table row. Setting scrollTop on the table's own box
  // moves exactly one scroller.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const row = pickedRowRef.current;
      const box = tableScrollRef.current;
      if (!row || !box) return;
      box.scrollTop = row.offsetTop - box.clientHeight / 2 + row.clientHeight / 2;
    });
    return () => cancelAnimationFrame(id);
  }, [open, draw]);

  if (!FEATURES.drawInspector || !FEATURES.onboardingPrefs || !devSurfacesVisible) return null;

  const picked = draw?.picked;
  const rows = (draw?.scored || [])
    .map((s, i) => ({ ...s, i, isPicked: s.poem?.id === picked?.id }))
    .sort((a, b) => b.scaled - a.scaled);
  const pickedIndex = rows.findIndex((r) => r.isPicked);
  const pickedRow = pickedIndex >= 0 ? rows[pickedIndex] : null;
  const hereInFeed = feed.findIndex((f) => f.id === currentPoemId);

  /* -- the two halves, degrading independently ----------------------------- */
  //
  // The panel does two jobs and they have different preconditions. "What is
  // this poem" needs only the poem, which is always on screen; "why was it
  // picked" needs a scored draw, which most poems never get. Deriving the
  // facets from the DRAW is what made the whole panel dead for a deep link, a
  // saved poem, or the default feed with onboarding skipped — the facets were
  // on the poem the entire time.
  const subject = carouselPoems[carouselIndex] || picked || null;
  // The draw's bands are preferred only because they are what the arithmetic
  // was actually computed against.
  const bands = draw?.bands || ownBands || {};
  const activePrefs = draw?.prefs || prefs;
  const why = subject ? explainRows(subject, activePrefs, bands, pickedRow) : [];
  const categorized = subject ? isCategorized(subject) : false;
  const rationale = subject?.categories?.rationale || '';
  const hasAnswers = hasPreferences(activePrefs);

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
        // PoemFeed binds its pointer listeners on `window`, so without this a drag
        // inside the panel swipes the poem out from under you while you are reading
        // why that poem was picked. See the matching guard in PoemFeed.jsx.
        data-owns-gesture=""
        className={`fixed z-[200] left-2 right-2 md:left-auto md:w-[560px] flex flex-col rounded-2xl border ${theme.border} ${surface} backdrop-blur-xl transition-all duration-200 ${
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        style={{
          bottom: 100,
          right: 8,
          // Sized so the whole why block clears the fold on a 375x812 phone.
          // At 62vh the block ended at `topic` and the unmet motif — the row
          // someone opened the panel to see — sat below the cut.
          maxHeight: 'min(76vh, 640px)',
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

        {!subject ? (
          <div className="px-4 py-6">
            <p className={`${MONO} opacity-40 leading-relaxed`}>
              No poem on screen yet. The panel reads whichever poem the carousel is showing.
            </p>
          </div>
        ) : (
          <>
            {/* The answer, up top: what was picked and where it landed.
                DRAW-ONLY, all of it. Score, rank, and the spread are answers to
                "how did this compare to the alternatives", and with no draw
                there are no alternatives — rendering 0.00 and an empty rail
                would be inventing a comparison that never happened. */}
            {draw && (
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
                    <span className="font-brand-en text-sm opacity-40 leading-none">
                      / {MAX_SCORE}
                    </span>
                    <span className={`${MONO} opacity-50`}>({pct(pickedRow?.ratio ?? 0)})</span>
                    <span className={`${MONO} opacity-40 ml-auto text-right`}>
                      T={draw.temperature.toFixed(2)} · seen {draw.poemsSeen} · {rows.length} cand.
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mt-1.5">
                    <div className="text-[0.6875rem] truncate">
                      <span className="opacity-40">
                        slot {draw.slot ?? '?'} · #{picked?.id}
                      </span>{' '}
                      <span className="opacity-90">{picked?.title}</span>
                    </div>
                    {/* Head or tail — the one thing the raw score can't tell you. */}
                    {pickedIndex >= 0 && (
                      <span className={`${MONO} opacity-45 ml-auto flex-none`}>
                        {/* The draw's own rank, not this table's row index. They
                        differ on ties — and a family-only answer produces a lot
                        of exact 5.00 ties — so showing the row index here would
                        contradict the tie-break the pick was actually made
                        with, in the one place a reader checks it. */}
                        rank {draw.rank ?? pickedIndex + 1} of {rows.length}
                        {draw.deterministic ? ' · ranked' : ' · sampled'}
                      </span>
                    )}
                  </div>

                  <SpreadRail rows={rows} />
                </div>
              </>
            )}

            {/* ONE scroller from here down.

                These used to be five `flex-none` blocks stacked above a
                scrolling table, which worked only while their combined height
                fit the panel. The why block is ~200px of that budget, and at
                375x812 the sum went past `maxHeight` — so the table's `flex-1`
                resolved to nothing and the pinned footer drew on top of the
                rows. Scrolling the whole body instead has no such budget: the
                score summary stays pinned because it is the answer, the footer
                stays pinned because it is a legend, and everything between
                them is content. */}
            <div
              className="overflow-y-auto flex-1 min-h-0"
              style={{ overscrollBehavior: 'contain' }}
            >
              {/* Why there is no ranking to show. Stated once, at the top of the
                  content, so the facets below are not mistaken for a draw. */}
              {!draw && (
                <div className={`px-4 py-2.5 border-b ${theme.border}`}>
                  <p className={`${MONO} opacity-40 leading-relaxed`}>
                    {`#${subject.id} was not drawn by score — no ranking, no candidates, nothing to compare it against. Its own categories are below.`}
                  </p>
                </div>
              )}

              {/* The feed queue is the draw's ordering. Without a draw there is
                  no queue — the carousel is whatever the plain fetch returned. */}
              {draw && <FeedQueue feed={feed} hereIndex={hereInFeed} border={theme.border} />}

              {/* What the reader asked for, and what was actually requested for it. */}
              {draw && (
                <div className={`${MONO} opacity-50 px-4 py-2 border-b ${theme.border} flex-none`}>
                  {/* Raw stored keys, wrapped not clipped — this is the literal
                  contents of `onboardingPrefs`, and half of debugging the flow
                  is seeing that a key is spelled the way the scorer expects. */}
                  <div className="break-words">
                    answers: {draw.prefs?.family || '—'} /{' '}
                    {(draw.prefs?.moods || []).join('+') || '—'} /{' '}
                    {(draw.prefs?.motifs || []).join('+') || '—'} / {draw.prefs?.era || '—'} /{' '}
                    {draw.prefs?.difficulty || '—'}
                  </div>
                  <div className="break-words mt-0.5">
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
              )}

              <WhyBlock
                rows={why}
                border={theme.border}
                scored={!!draw}
                uncategorized={!categorized}
                rationale={rationale}
              />

              {/* Column labels live OUTSIDE the scroller rather than as a sticky
                <thead>. The rows carry `opacity`, which makes each one its own
                stacking context, and a sticky header loses to them however its
                z-index is set — it ends up transparent with rows sliding
                through the labels. A plain header row above the scroll box has
                no such fight, and grid keeps the columns aligned. */}
              {draw && (
                <div
                  className={`${MONO} ${ROW_GRID} gap-x-2 opacity-40 px-4 pt-2 pb-1 flex-none border-b ${theme.border}`}
                >
                  <span>score</span>
                  <span>the other candidates</span>
                </div>
              )}

              {/* The table keeps a scroller of its OWN, nested inside the body
                one and capped, for a single reason: the picked row auto-scrolls
                into view on open, and a scroll that walked up to the body would
                take the why block off screen — scrolling past the answer to get
                to the comparison. Capped rather than `flex-1` because inside a
                scrolling parent there is no height to be a fraction of. */}
              <div
                ref={tableScrollRef}
                className={`${MONO} px-4 py-1 overflow-y-auto`}
                style={{ maxHeight: '34vh', overscrollBehavior: 'contain' }}
                hidden={!draw}
              >
                {rows.map((s) => {
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
                      <span className="whitespace-nowrap">
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
                      {/* The title is the ONE thing left that may still clip —
                        it is a free-text field with no upper bound, and a
                        wrapping title would make every row a different height
                        and destroy the scannability the table exists for. The
                        facets that used to clip here are in the block above,
                        where they wrap. */}
                      <span className="truncate">
                        <span className="opacity-60">#{s.poem?.id}</span> {s.poem?.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* The chip legend is always useful — the states describe the block
                above, which always renders. The low-scoring sentence is not:
                it prevents a false bug report about a RANK, and with no draw
                there is no rank to misread. */}
            <p
              className={`${MONO} opacity-40 px-4 py-2 border-t ${theme.border} flex-none leading-relaxed`}
            >
              {draw && (
                <>
                  A low-scoring pick is correct, not a bug — the unanchored page keeps every poem
                  reachable.{' '}
                </>
              )}
              {/* With no answers saved there is nothing to match against, so
                  every chip is `present` and the other three states cannot
                  occur. Listing them anyway would describe a vocabulary the
                  panel is not currently speaking. */}
              {hasAnswers ? (
                <>
                  <span style={{ color: 'var(--gold)' }}>✓ matched</span> ·{' '}
                  <span style={{ color: 'var(--gold)' }}>≈ partial credit</span> ·{' '}
                  <span className="opacity-70">· on the poem, not asked for</span> ·{' '}
                  <span style={{ color: '#d98b83' }}>✕ asked for, not here</span>
                </>
              ) : (
                <>No answers saved — every chip above is simply what the poem carries.</>
              )}
            </p>
          </>
        )}
      </div>
    </>
  );
};

export default DiscoveryDrawInspector;

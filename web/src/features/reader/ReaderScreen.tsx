// Area 2 · Reading (2.1–2.18) and the reader side of listening (3.7).
import { useEffect, useMemo, useRef, useState, type ComponentType, type HTMLAttributes, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, NotFoundError } from '@core/api';
import { qk, useDoors, useExplanation, useGloss, useInvalidate, useKeeps, usePoem, usePrefs, useSetPrefs } from '@core/hooks';
import { transliterate } from '@core/logic/transliterate';
import type { Poem } from '@core/types';
import { FullAreaError, MarginNote, Segmented, Sheet, Skeleton, Slider, Switch } from '@ds/primitives';
import { Back, Heart, Lamp, Mark, Pause, Play, Share } from '@ds/icons';
import { DoorCard, Verse } from '@components/index';
import { useOverlay } from '@components/overlays';
import { usePlayback } from '@components/playback';
import { logEvent } from '@components/devlog';
import './reader.css';

export interface PlayerSlotProps { poem: Poem; compact: boolean; onMark: () => void; onExpand: () => void; devLongPress?: HTMLAttributes<HTMLElement> }

export function ReaderScreen({ id, Player, defaultVoice, onLongPressMark, holding, endNavigation }: {
  id: string; Player: ComponentType<PlayerSlotProps>; defaultVoice: string; onLongPressMark?: HTMLAttributes<HTMLElement>; holding?: boolean; endNavigation: (visible: boolean) => ReactNode;
}) {
  const poemQ = usePoem(id);
  const prefs = usePrefs().data;
  const [, nav] = useLocation();
  const pb = usePlayback();
  const [sheet, setSheet] = useState<'none' | 'aa' | 'insights' | 'fan'>('none');
  const [gloss, setGloss] = useState<{ line: number; word: number } | null>(null);
  const [verseMenu, setVerseMenu] = useState<number | null>(null);
  const poemEnd = useRef<HTMLDivElement>(null);
  const [endInView, setEndInView] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bottom, setBottom] = useState(false); // at the end of the page the dock is back (2.17)
  const [progress, setProgress] = useState(0);
  const open = useOverlay((s) => s.open);
  const showToast = useOverlay((s) => s.showToast);
  const keeps = useKeeps().data;
  const inv = useInvalidate();

  useEffect(() => {
    const on = () => {
      setScrolled(window.scrollY > 80);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setBottom(max > 0 && window.scrollY >= max - 2);
      setProgress(max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0);
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    const end = poemEnd.current;
    if (!end) return;
    // Reveal the tabs as the end of the reading comes into view above the controls.
    const observer = new IntersectionObserver(([entry]) => {
      setEndInView(entry.isIntersecting);
    }, { rootMargin: '0px 0px -174px 0px' });
    observer.observe(end);
    return () => observer.disconnect();
  }, [poemQ.data]);
  useEffect(() => () => pb.send({ type: 'STOP' }), [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const poemId = poemQ.data?.id;
  const openedPoem = useRef<string>();
  useEffect(() => {
    if (!poemId || poemId === openedPoem.current) return;
    openedPoem.current = poemId;
    logEvent({ kind: 'event', source: 'app', label: 'Reader', text: `Opened poem ${poemId}` });
  }, [poemId]);

  if (poemQ.isLoading) return <PoemLoading />;
  if (poemQ.error || !poemQ.data) {
    const notFound = poemQ.error instanceof NotFoundError || (poemQ.error as { status?: number })?.status === 404;
    return notFound ? (
      <div className="screen"><button className="icon-btn" style={{ margin: '48px 12px 0' }} aria-label="Back" onClick={() => nav('/explore')}><Back /></button>
        <FullAreaError title="This link leads nowhere" body="The poem may have moved, or the link was cut short. Explore has the rest." action="Go to Explore" onAction={() => nav('/explore')} /></div>
    ) : (
      <div className="screen"><FullAreaError title="A poem didn’t open" body="Check your connection, then try again." action="Try again" onAction={() => poemQ.refetch()} /></div>
    );
  }
  const poem = poemQ.data;
  const listening = pb.poemId === poem.id && pb.status !== 'idle';
  const marks = prefs?.vowelMarks ?? true;
  const under = prefs?.under ?? 'english';
  const showEndNavigation = progress > 0 && endInView;

  const startListening = (fromLine = 0) => {
    pb.send({ type: 'PLAY', poemId: poem.id, lineCount: poem.lines.length, voice: pb.voice !== 'Zephyr' ? pb.voice : defaultVoice, fromLine });
    setSheet('none');
  };
  const onWord = (line: number, word: number) => {
    if (listening) return setVerseMenu(line);
    if (prefs?.tapWord !== false) {
      logEvent({ kind: 'user', source: 'app', label: 'Gloss', text: `Tapped word ${word + 1} on line ${line + 1}` });
      setGloss({ line, word });
    }
  };
  const kept = keeps?.includes(poem.id) ?? false;
  const unkeep = async () => {
    await api.keeps.unkeep([poem.id]);
    await inv(qk.keeps, qk.lists);
    showToast({ text: 'Removed from your diwan', undo: async () => { await api.keeps.keep(poem.id); inv(qk.keeps, qk.lists); } });
  };
  const actions = {
    listen: () => (listening ? pb.send(pb.status === 'playing' ? { type: 'PAUSE' } : { type: 'RESUME' }) : startListening()),
    insights: () => {
      logEvent({ kind: 'user', source: 'app', label: 'Insights', text: `Tapped Insights for poem ${poem.id}` });
      setSheet('insights');
    },
    keep: () => (kept ? unkeep() : open({ type: 'keep', poemId: poem.id })),
    share: () => open({ type: 'share', poemId: poem.id }),
    aa: () => setSheet('aa'),
  };

  return (
    <div className={`screen reader${showEndNavigation ? ' reader--end-navigation' : ''}`} data-testid="reader">
      <ReaderBackdrop />
      <header className="reader__top">
        <button className="icon-btn" aria-label="Back" onClick={() => history.length > 1 ? history.back() : nav('/explore')}><Back /></button>
        <Mark size={28} colour="var(--c-accent-line)" />
        <span className="hdr__spacer" />
      </header>
      <section className="reader__title">
        <h1 lang="ar" dir="rtl" className="reader__title-ar">{poem.titleAr}</h1>
        <p className="reader__title-en">{poem.titleEn.toUpperCase()}</p>
        <Link href={`/poet/${poem.poetSlug}`} className="reader__poet"><span lang="ar" className="ar" style={{ fontSize: 17 }}>{poem.poetAr}</span> · {poem.poetEn}</Link>
      </section>
      <main className="reader__verses">
        {poem.lines.map((l, i) => (
          <Verse key={i} line={l} index={i} showMarks={marks} under={under} translit={under === 'sounds' ? transliterate(l.ar) : undefined}
            active={listening ? pb.line === i : undefined} wordAt={listening ? (i === pb.line ? pb.word : i < pb.line ? 99 : -2) : undefined}
            dimmed={listening && i !== pb.line} selectedWord={gloss?.line === i ? gloss.word : undefined} onWord={(w) => onWord(i, w)} onLine={listening ? () => setVerseMenu(i) : undefined} />
        ))}
        {listening && pb.status === 'error' && <MarginNote message="The recitation won’t load." onRetry={() => startListening(pb.line)} />}
      </main>
      <div ref={poemEnd}>
        <EndOfPoem poem={poem} />
      </div>
      {endNavigation(showEndNavigation)}

      {listening ? (
        <Player poem={poem} compact={scrolled} onMark={() => setSheet('fan')} onExpand={() => window.scrollTo({ top: 0, behavior: 'smooth' })} devLongPress={onLongPressMark} />
      ) : scrolled && !bottom ? (
        <div className="reader__fold">
          <button className={`reader__mark${holding ? ' reader__mark--holding' : ''}`} aria-label="Actions" onClick={() => setSheet('fan')} {...onLongPressMark}><Mark size={34} colour="var(--c-accent)" /></button>
          <span className="reader__progress" aria-hidden><span style={{ width: `${progress}%` }} /></span>
        </div>
      ) : (
        <Dock {...actions} listening={false} kept={kept} hold={onLongPressMark} holding={holding} />
      )}

      {sheet === 'fan' && <Fan {...actions} kept={kept} listening={listening && pb.status === 'playing'} onClose={() => setSheet('none')} />}
      {sheet === 'aa' && <AaSheet onClose={() => setSheet('none')} />}
      {sheet === 'insights' && <InsightsSheet poem={poem} onClose={() => setSheet('none')} />}
      {gloss && <GlossSheet poem={poem} at={gloss} onClose={() => setGloss(null)} />}
      {verseMenu !== null && (
        <Sheet label="This verse" onClose={() => setVerseMenu(null)}>
          <p lang="ar" dir="rtl" className="ar" style={{ margin: 0, fontSize: 22, textAlign: 'right' }}>{poem.lines[verseMenu].ar}</p>
          <button className="btn btn--primary btn--block" onClick={() => { pb.send({ type: 'SEEK_LINE', line: verseMenu }); setVerseMenu(null); }}>Play from here</button>
          <button className="btn btn--block" onClick={() => { setGloss({ line: verseMenu, word: 0 }); setVerseMenu(null); }}>Meaning</button>
        </Sheet>
      )}
    </div>
  );
}

/** The faint eight-point lattice behind the title, fading out down the page. */
function ReaderBackdrop() {
  return (
    <svg aria-hidden className="reader__backdrop" width="100%" height="420">
      <defs>
        <pattern id="reader-lattice" width="64" height="64" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="var(--c-lattice)" strokeWidth="1">
            <rect x="16" y="16" width="32" height="32" />
            <rect x="16" y="16" width="32" height="32" transform="rotate(45 32 32)" />
          </g>
        </pattern>
        <linearGradient id="reader-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <mask id="reader-mask"><rect width="100%" height="420" fill="url(#reader-fade)" /></mask>
      </defs>
      <rect width="100%" height="420" fill="url(#reader-lattice)" mask="url(#reader-mask)" />
    </svg>
  );
}

type Actions = { listen: () => void; insights: () => void; keep: () => void; share: () => void; aa: () => void; listening: boolean; kept: boolean };

function Dock({ listen, insights, keep, share, kept, hold, holding }: Actions & { hold?: HTMLAttributes<HTMLElement>; holding?: boolean }) {
  return (
    <nav aria-label="Poem actions" className={`dock${holding ? ' dock--holding' : ''}`} {...hold}>
      <button className="dock__btn" onClick={listen}><Play size={14} /> LISTEN</button>
      <button className="dock__btn dock__btn--main" onClick={insights}><Lamp size={18} /> INSIGHTS</button>
      <button className={`dock__btn${kept ? ' dock__btn--kept' : ''}`} aria-label={kept ? 'Kept. Tap to remove' : 'Keep'} onClick={keep}><Heart filled={kept} /></button>
      <button className="dock__btn" aria-label="Share" onClick={share}><Share /></button>
    </nav>
  );
}

// 2.3 The fan: five actions on an arc around the mark (positions from the frame).
const FAN = [
  { key: 'listen', x: 50, b: 62 }, { key: 'insights', x: 90, b: 135 }, { key: 'keep', x: 167, b: 164 },
  { key: 'share', x: 244, b: 135 }, { key: 'aa', x: 284, b: 62 },
] as const;

function Fan({ listen, insights, keep, share, aa, listening, kept, onClose }: Actions & { onClose: () => void }) {
  const fns = { listen, insights, keep, share, aa };
  const label = { listen: listening ? 'PAUSE' : 'LISTEN', insights: 'INSIGHTS', keep: 'KEEP', share: 'SHARE', aa: 'TEXT' };
  const icon = { listen: listening ? <Pause size={20} /> : <Play size={20} />, insights: <Lamp />, keep: <Heart filled={kept} />, share: <Share />, aa: <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>Aa</span> };
  return (
    <>
      <div className="fan-scrim" onClick={onClose} />
      <div className="fan" role="menu" aria-label="Actions">
        {FAN.map((f) => (
          <div key={f.key} className="fan__item" style={{ left: f.x, bottom: f.b }}>
            <button role="menuitem" aria-label={label[f.key][0] + label[f.key].slice(1).toLowerCase()} className="fan__btn" onClick={() => { if (f.key !== 'listen') onClose(); fns[f.key](); }}>{icon[f.key]}</button>
            <span className="fan__label">{label[f.key]}</span>
          </div>
        ))}
        <button className="fan__close" aria-label="Close actions" onClick={onClose}><Mark size={34} colour="var(--c-accent)" /></button>
      </div>
    </>
  );
}

/** 2.4 Aa: what sits under the Arabic, Arabic font, size, vowel marks, page. */
/**
 * Reading settings. In the Aa sheet (2.4) "under the Arabic" leads; on the
 * Appearance page (12.2) a live preview leads and "under the Arabic" lives on
 * Translation and sounds instead.
 */
export function AppearanceControls({ preview }: { preview?: boolean }) {
  const p = usePrefs().data;
  const set = useSetPrefs();
  if (!p) return <Skeleton />;
  const fonts = [
    { value: 'amiri' as const, label: <><span lang="ar" style={{ fontFamily: 'var(--font-amiri)', fontSize: 22, lineHeight: 1 }}>ليلى</span><span>AMIRI</span></> },
    { value: 'naskh' as const, label: <><span lang="ar" style={{ fontFamily: 'var(--font-naskh)', fontSize: 19, lineHeight: 1 }}>ليلى</span><span>NASKH</span></> },
    { value: 'scheherazade' as const, label: <><span lang="ar" style={{ fontFamily: 'var(--font-scheherazade)', fontSize: 24, lineHeight: 1 }}>ليلى</span><span>SCHEHERAZADE</span></> },
  ];
  const SIZES = ['SMALL', 'MEDIUM', 'LARGE', 'LARGER', 'LARGEST'];
  const under = (
    <>
      <p className="t-eyebrow">SHOW UNDER THE ARABIC</p>
      <Segmented label="Show under the Arabic" value={p.under} onChange={(under) => set.mutate({ under })}
        options={[{ value: 'english', label: 'ENGLISH' }, { value: 'sounds', label: 'SOUNDS' }, { value: 'nothing', label: 'NOTHING' }]} />
    </>
  );
  const font = <><p className="t-eyebrow">ARABIC FONT</p><Segmented label="Arabic font" tall value={p.font} onChange={(font) => set.mutate({ font })} options={fonts} /></>;
  const marks = (
    <div className="card row between" style={{ padding: '12px 14px', gap: 14 }}>
      <div><p className="group-row__title">Vowel marks <span lang="ar" className="ar" style={{ color: 'var(--c-accent)' }}>· تشكيل</span></p><p className="group-row__sub">For learners; turn off when fluent</p></div>
      <Switch label="Vowel marks" on={p.vowelMarks} onChange={(vowelMarks) => set.mutate({ vowelMarks })} />
    </div>
  );
  const size = (
    <>
      <div className="row between"><p className="t-eyebrow">TEXT SIZE</p><span className="t-eyebrow t-eyebrow--accent">{SIZES[p.textSize - 1]}</span></div>
      <div className="size-row">
        <span lang="ar" aria-hidden className="size-row__small">ع</span>
        <Slider label="Text size" min={1} max={5} value={p.textSize} valueText={SIZES[p.textSize - 1]} onChange={(v) => set.mutate({ textSize: v as 1 | 2 | 3 | 4 | 5 })} />
        <span lang="ar" aria-hidden className="size-row__large">ع</span>
      </div>
    </>
  );
  const page = (
    <>
      <p className="t-eyebrow">PAGE</p>
      <div role="radiogroup" aria-label="Page" className="page-tiles">
        {([['night', 'ليل', 'NIGHT'], ['parchment', 'رَقّ', 'PARCHMENT'], ['indigo', 'نيل', 'INDIGO']] as const).map(([v, ar, en]) => (
          <button key={v} role="radio" aria-checked={p.page === v} className={`page-tile page-tile--${v}`} onClick={() => set.mutate({ page: v })}>
            <span lang="ar" className="page-tile__ar">{ar}</span><span className="page-tile__en">{en}</span>
          </button>
        ))}
      </div>
    </>
  );
  if (preview) {
    return (
      <div className="stack gap-12">
        <div className="card" style={{ padding: '12px 18px', textAlign: 'right', background: 'var(--c-bg)' }}>
          <p lang="ar" dir="rtl" style={{ margin: 0, fontFamily: 'var(--reading-font)', fontSize: 22, lineHeight: 1.7 }}>{p.vowelMarks ? 'أَمُرُّ عَلى الدِيارِ دِيارِ لَيلى' : 'أمر على الديار ديار ليلى'}</p>
          <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--c-muted)' }}>I pass by the dwellings, Layla’s dwellings,</p>
        </div>
        {font}{page}{size}{marks}
      </div>
    );
  }
  return <div className="stack gap-12">{under}{font}{marks}{size}{page}</div>;
}

function AaSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet label="Reading settings" onClose={onClose}>
      <div className="sheet__head"><span className="t-eyebrow t-eyebrow--accent">READING</span><button className="link-btn" onClick={onClose}>DONE</button></div>
      <AppearanceControls />
    </Sheet>
  );
}

/** 2.5 Insights: a sheet over the poem with The meaning and The poet. */
function InsightsSheet({ poem, onClose }: { poem: Poem; onClose: () => void }) {
  const [tab, setTab] = useState<'meaning' | 'poet'>('meaning');
  const ex = useExplanation(poem.id);
  return (
    <Sheet label="Insights" onClose={onClose} height={520}>
      <div className="sheet__head"><span className="t-eyebrow t-eyebrow--accent">INSIGHTS</span><button className="link-btn" onClick={onClose}>DONE</button></div>
      <Segmented label="Insights" value={tab} onChange={setTab} options={[{ value: 'meaning', label: 'THE MEANING' }, { value: 'poet', label: 'THE POET' }]} />
      {ex.isLoading && <Skeleton lines={5} width={['95%', '88%', '92%', '70%', '84%']} />}
      {ex.error && <MarginNote message="The guide’s notes didn’t load." onRetry={() => ex.refetch()} />}
      {ex.data && <p className="t-lede" style={{ fontSize: 19, lineHeight: 1.5 }}>{tab === 'meaning' ? ex.data.meaning : ex.data.poet}</p>}
    </Sheet>
  );
}

/** 2.6 Tap a word: root and meaning in this line. */
function GlossSheet({ poem, at, onClose }: { poem: Poem; at: { line: number; word: number }; onClose: () => void }) {
  const g = useGloss(poem.id, at.line, at.word);
  return (
    <Sheet label="Word meaning" onClose={onClose}>
      <div className="sheet__head"><span className="t-eyebrow t-eyebrow--accent">THE WORD</span><button className="icon-btn icon-btn--muted" aria-label="Close" onClick={onClose}>×</button></div>
      {g.isLoading && <Skeleton lines={3} />}
      {g.error && <MarginNote message="The meaning didn’t load." onRetry={() => g.refetch()} />}
      {g.data && (
        <div className="stack gap-10">
          <div className="row between">
            <span className="icon-btn" style={{ border: '1px solid var(--c-accent-deep)' }} aria-hidden><Play size={12} /></span>
            <div className="stack" style={{ alignItems: 'flex-end' }}>
              <span lang="ar" className="ar" style={{ fontSize: 34, color: 'var(--c-accent)', lineHeight: 1.2 }}>{g.data.word}</span>
              <span className="t-small" style={{ fontStyle: 'italic' }}>{g.data.translit}</span>
            </div>
          </div>
          <div className="row gap-8">
            <span className="chip chip--sm">ROOT <span lang="ar" className="ar" style={{ letterSpacing: 2 }}>{g.data.root}</span></span>
            <span className="chip chip--sm">{g.data.partOfSpeech.toUpperCase()}</span>
          </div>
          <p className="t-eyebrow">IN THIS LINE</p>
          <p className="t-lede" style={{ fontSize: 20, color: 'var(--c-text)', marginTop: -4 }}>{g.data.meaning}</p>
          <p className="t-eyebrow">OTHER SENSES</p>
          <p className="t-small" style={{ marginTop: -4 }}>{g.data.otherSenses}</p>
          <p className="t-note">Written by the guide for this line.</p>
        </div>
      )}
    </Sheet>
  );
}

/** A poem counts as read once the reader passes its last line (V2.3). */
function useMarkReadAtEnd(poemId: string, onEnd?: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  const qc = useQueryClient();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;
    const io = new IntersectionObserver((entries) => {
      if (done || !entries.some((e) => e.isIntersecting)) return;
      done = true;
      endRef.current?.();
      api.library.markRead(poemId).then(() => Promise.all([qc.invalidateQueries({ queryKey: ['reads'] }), qc.invalidateQueries({ queryKey: ['last-read'] })])).catch(() => {});
    });
    io.observe(el);
    return () => io.disconnect();
  }, [poemId, qc]);
  return ref;
}

/** A poem opened from a journey step (?journey=slug&step=n) completes that step at its end. */
function useJourneyStep(atEnd: boolean) {
  const params = new URLSearchParams(location.search);
  const slug = params.get('journey');
  const step = Number(params.get('step')) || 0;
  const qc = useQueryClient();
  const j = useQuery({ queryKey: ['collection', slug], queryFn: () => api.collections.get(slug!), enabled: !!slug }).data;
  useEffect(() => {
    if (!atEnd || !slug || !step || !j) return;
    (async () => {
      const mine = (await api.collections.progress()).find((p) => p.slug === slug);
      if ((mine?.position ?? 0) >= step) return; // already past this step
      await api.collections.setProgress({ slug, position: step, saved: true, completedAt: step >= j.poemIds.length ? Date.now() : undefined });
      qc.invalidateQueries({ queryKey: ['progress'] });
    })().catch(() => {});
  }, [atEnd, slug, step, j, qc]);
  return slug && step ? { slug, step, label: j?.stepEn ?? 'Step' } : null;
}

function EndOfPoem({ poem }: { poem: Poem }) {
  const [atEnd, setAtEnd] = useState(false);
  const readRef = useMarkReadAtEnd(poem.id, () => setAtEnd(true));
  const journey = useJourneyStep(atEnd);
  const end = <p className="end__mark">END · <span lang="ar" className="ar" style={{ fontSize: 14, letterSpacing: 0 }}>تمّت</span></p>;
  // A journey step ends in step complete (9.7); Tonight's poem in You finished (2.18).
  if (journey) {
    return (
      <>
        <section className="end" aria-label="End of poem">
          <div ref={readRef} data-testid="read-sentinel" />
          {end}
          <Link href={`/journey/${journey.slug}/done/${journey.step}`} className="btn btn--primary btn--block end__journey">{journey.label} {journey.step} complete</Link>
        </section>
        {poem.fullPoemId ? <GuideDoors poem={poem} /> : null}
      </>
    );
  }
  if (new URLSearchParams(location.search).get('from') === 'tonight') {
    return (
      <section className="end" aria-label="End of poem">
        <div ref={readRef} data-testid="read-sentinel" />
        {end}
        <Link href={`/journey/finished/${poem.slug}`} className="btn btn--primary btn--block end__journey">Tonight’s poem, finished</Link>
      </section>
    );
  }
  return <><div ref={readRef} data-testid="read-sentinel" /><GuideDoors poem={poem} /></>;
}

/** 2.17 Every other poem ends with the guide's three doors (V3, replacing V1's Next poem). */
function GuideDoors({ poem }: { poem: Poem }) {
  const d = useDoors(poem.id);
  return (
    <section className="end end--doors" aria-label="Where the guide would take you next">
      <div className="end__rule" aria-hidden><span /><Mark size={22} colour="var(--c-accent-line)" /><span /></div>
      <p className="end__mark">WHERE THE GUIDE WOULD TAKE YOU NEXT</p>
      {d.error ? <MarginNote message="The guide’s doors didn’t open." onRetry={() => d.refetch()} />
        : d.data ? d.data.map((door) => <DoorCard key={door.poem.id} door={door} />)
        : <div className="end__doors-wait"><Skeleton lines={3} /></div>}
    </section>
  );
}

function PoemLoading() {
  return (
    <div className="screen reader" aria-busy="true">
      <div style={{ padding: '120px 28px 0' }} className="stack gap-16">
        <span className="skel" style={{ width: '60%', height: 34, alignSelf: 'flex-end' }} />
        <span className="skel" style={{ width: '40%', alignSelf: 'flex-end' }} />
        <div style={{ height: 24 }} />
        <Skeleton lines={8} width={['92%', '70%', '86%', '64%', '90%', '72%', '84%', '60%']} />
      </div>
    </div>
  );
}

export const useReaderTitle = (poem?: Poem) => useMemo(() => (poem ? `${poem.titleEn} · ${poem.poetEn}` : ''), [poem]);

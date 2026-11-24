// Area 2 · Reading (2.1–2.18) and the reader side of listening (3.7).
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { api, NotFoundError } from '@core/api';
import { useDoors, useExplanation, useGloss, usePoem, usePoet, usePrefs, useSetPrefs } from '@core/hooks';
import { sourceOf } from '@core/sources';
import { transliterate } from '@core/logic/transliterate';
import type { Poem } from '@core/types';
import { FullAreaError, MarginNote, Segmented, Sheet, Skeleton, Switch } from '@ds/primitives';
import { Back, Heart, Lamp, Mark, Pause, Play, Share, Up } from '@ds/icons';
import { PoetAvatar, Verse } from '@components/index';
import { useOverlay } from '@components/overlays';
import { usePlayback } from '@components/playback';
import './reader.css';

export interface PlayerSlotProps { poem: Poem; compact: boolean; onMark: () => void; onExpand: () => void }

export function ReaderScreen({ id, Player, defaultVoice, onLongPressMark }: {
  id: string; Player: ComponentType<PlayerSlotProps>; defaultVoice: string; onLongPressMark?: Record<string, unknown>;
}) {
  const poemQ = usePoem(id);
  const prefs = usePrefs().data;
  const [, nav] = useLocation();
  const pb = usePlayback();
  const [sheet, setSheet] = useState<'none' | 'aa' | 'insights' | 'fan'>('none');
  const [gloss, setGloss] = useState<{ line: number; word: number } | null>(null);
  const [verseMenu, setVerseMenu] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const open = useOverlay((s) => s.open);

  useEffect(() => {
    const on = () => {
      setScrolled(window.scrollY > 80);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0);
    };
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => () => pb.send({ type: 'STOP' }), [id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const startListening = (fromLine = 0) => {
    pb.send({ type: 'PLAY', poemId: poem.id, lineCount: poem.lines.length, voice: pb.voice !== 'Zephyr' ? pb.voice : defaultVoice, fromLine });
    setSheet('none');
  };
  const onWord = (line: number, word: number) => {
    if (listening) return setVerseMenu(line);
    if (prefs?.tapWord !== false) setGloss({ line, word });
  };
  const actions = {
    listen: () => (listening ? pb.send(pb.status === 'playing' ? { type: 'PAUSE' } : { type: 'RESUME' }) : startListening()),
    insights: () => setSheet('insights'),
    keep: () => open({ type: 'keep', poemId: poem.id }),
    share: () => open({ type: 'share', poemId: poem.id }),
    aa: () => setSheet('aa'),
  };

  return (
    <div className="screen reader" data-testid="reader">
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
      <EndOfPoem poem={poem} />

      {listening ? (
        <Player poem={poem} compact={scrolled} onMark={() => setSheet('fan')} onExpand={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
      ) : scrolled ? (
        <div className="reader__fold">
          <button className="reader__mark" aria-label="Actions" onClick={() => setSheet('fan')} {...onLongPressMark}><Mark size={34} colour="var(--c-accent)" /></button>
          <span className="reader__progress" aria-hidden><span style={{ width: `${progress}%` }} /></span>
        </div>
      ) : (
        <Dock {...actions} listening={false} />
      )}

      {sheet === 'fan' && <Fan {...actions} listening={listening && pb.status === 'playing'} onClose={() => setSheet('none')} />}
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

type Actions = { listen: () => void; insights: () => void; keep: () => void; share: () => void; aa: () => void; listening: boolean };

function Dock({ listen, insights, keep, share }: Actions) {
  return (
    <nav aria-label="Poem actions" className="dock">
      <button className="dock__btn" onClick={listen}><Play size={14} /> LISTEN</button>
      <button className="dock__btn dock__btn--main" onClick={insights}><Lamp size={18} /> INSIGHTS</button>
      <button className="dock__btn" aria-label="Keep" onClick={keep}><Heart /></button>
      <button className="dock__btn" aria-label="Share" onClick={share}><Share /></button>
    </nav>
  );
}

// 2.3 The fan: five actions on an arc around the mark (positions from the frame).
const FAN = [
  { key: 'listen', x: 50, b: 62 }, { key: 'insights', x: 90, b: 135 }, { key: 'keep', x: 167, b: 164 },
  { key: 'share', x: 244, b: 135 }, { key: 'aa', x: 284, b: 62 },
] as const;

function Fan({ listen, insights, keep, share, aa, listening, onClose }: Actions & { onClose: () => void }) {
  const fns = { listen, insights, keep, share, aa };
  const label = { listen: listening ? 'PAUSE' : 'LISTEN', insights: 'INSIGHTS', keep: 'KEEP', share: 'SHARE', aa: 'TEXT' };
  const icon = { listen: listening ? <Pause size={20} /> : <Play size={20} />, insights: <Lamp />, keep: <Heart />, share: <Share />, aa: <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>Aa</span> };
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
export function AppearanceControls({ preview }: { preview?: boolean }) {
  const p = usePrefs().data;
  const set = useSetPrefs();
  if (!p) return <Skeleton />;
  const fonts = [
    { value: 'amiri' as const, label: <><span lang="ar" style={{ fontFamily: 'var(--font-amiri)', fontSize: 22, lineHeight: 1 }}>ليلى</span><span>AMIRI</span></> },
    { value: 'naskh' as const, label: <><span lang="ar" style={{ fontFamily: 'var(--font-naskh)', fontSize: 19, lineHeight: 1 }}>ليلى</span><span>NASKH</span></> },
    { value: 'scheherazade' as const, label: <><span lang="ar" style={{ fontFamily: 'var(--font-scheherazade)', fontSize: 24, lineHeight: 1 }}>ليلى</span><span>SCHEHERAZADE</span></> },
  ];
  return (
    <div className="stack gap-12">
      {preview && (
        <div className="card" style={{ padding: '12px 18px', textAlign: 'right', background: 'var(--c-bg)' }}>
          <p lang="ar" dir="rtl" style={{ margin: 0, fontFamily: 'var(--reading-font)', fontSize: 22, lineHeight: 1.7 }}>أَمُرُّ عَلى الدِيارِ دِيارِ لَيلى</p>
          <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--c-muted)' }}>I pass by the dwellings, Layla’s dwellings,</p>
        </div>
      )}
      <p className="t-eyebrow">SHOW UNDER THE ARABIC</p>
      <Segmented label="Show under the Arabic" value={p.under} onChange={(under) => set.mutate({ under })}
        options={[{ value: 'english', label: 'ENGLISH' }, { value: 'sounds', label: 'SOUNDS' }, { value: 'nothing', label: 'NOTHING' }]} />
      <p className="t-eyebrow">ARABIC FONT</p>
      <Segmented label="Arabic font" tall value={p.font} onChange={(font) => set.mutate({ font })} options={fonts} />
      <div className="card row between" style={{ padding: '12px 14px', gap: 14 }}>
        <div><p className="group-row__title">Vowel marks <span lang="ar" className="ar" style={{ color: 'var(--c-accent)' }}>· تشكيل</span></p><p className="group-row__sub">For learners; turn off when fluent</p></div>
        <Switch label="Vowel marks" on={p.vowelMarks} onChange={(vowelMarks) => set.mutate({ vowelMarks })} />
      </div>
      <div className="row between"><p className="t-eyebrow">TEXT SIZE</p><span className="t-eyebrow t-eyebrow--accent">{['SMALL', 'MEDIUM', 'LARGE', 'LARGER', 'LARGEST'][p.textSize - 1]}</span></div>
      <input className="slider" type="range" min={1} max={5} step={1} value={p.textSize} aria-label="Text size" onChange={(e) => set.mutate({ textSize: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })} />
      <p className="t-eyebrow">PAGE</p>
      <Segmented label="Page" tall value={p.page} onChange={(page) => set.mutate({ page })} options={[
        { value: 'night', label: <><span lang="ar" className="ar">ليل</span><span>NIGHT</span></> },
        { value: 'parchment', label: <><span lang="ar" className="ar">رَقّ</span><span>PARCHMENT</span></> },
        { value: 'indigo', label: <><span lang="ar" className="ar">نيل</span><span>INDIGO</span></> },
      ]} />
    </div>
  );
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

/** 2.7 (V1) End of poem: next poem, more by the poet, more of the feeling. V3 swaps in the doors (2.17). */
function EndOfPoem({ poem }: { poem: Poem }) {
  const guide = sourceOf('journey') === 'live' || new URLSearchParams(location.search).get('end') === 'doors';
  const poet = usePoet(poem.poetSlug).data;
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const [err, setErr] = useState(false);
  const next = async () => {
    try {
      setErr(false);
      const n = await qc.fetchQuery({ queryKey: ['next', poem.id], queryFn: () => api.poems.next([poem.id]) });
      nav(`/p/${n.slug}`);
      window.scrollTo(0, 0);
    } catch {
      setErr(true);
    }
  };
  const feeling = poem.feelingKeys[0];
  if (guide) return <Doors poem={poem} />;
  return (
    <section className="end" aria-label="End of poem">
      <p className="end__mark">END · <span lang="ar" className="ar" style={{ fontSize: 14, letterSpacing: 0 }}>تمّت</span></p>
      <button className="end__next" onClick={next}><span className="end__up"><Up /></span><span><span className="end__next-t">Next poem</span><span className="end__next-s">Swipe up, or tap · chosen from what you read</span></span></button>
      {err && <MarginNote message="The next poem didn’t arrive." onRetry={next} />}
      <Link href={`/poet/${poem.poetSlug}`} className="end__row">
        <PoetAvatar initial={poet?.initial ?? 'ش'} eraKey={poem.eraKey} size={44} />
        <span className="end__row-main"><span className="group-row__title">More by {poem.poetEn}</span><span className="group-row__sub"><span lang="ar" className="ar">{poem.poetAr}</span>{poet && ` · ${poet.poemCount} poems`}</span></span>
      </Link>
      {feeling && (
        <Link href={`/explore/feeling/${feeling}`} className="end__row">
          <span className="end__feel" aria-hidden>{feeling === 'longing' ? 'حنين' : feeling}</span>
          <span className="end__row-main"><span className="group-row__title">More {feeling}</span><span className="group-row__sub">From the feeling shelf</span></span>
        </Link>
      )}
    </section>
  );
}

/** 2.17 The guide's doors (V3). */
function Doors({ poem }: { poem: Poem }) {
  const d = useDoors(poem.id);
  return (
    <section className="end" aria-label="Where the guide goes next">
      <p className="end__mark">WHERE THE GUIDE GOES NEXT</p>
      {d.isLoading && <Skeleton lines={3} />}
      {d.data?.map((door) => (
        <Link key={door.poem.id} href={`/p/${door.poem.slug}`} className="door">
          <span className="door__hook">{door.hook}</span>
          <span lang="ar" className="door__ar">{door.poem.titleAr}</span>
          <span className="door__meta">{door.poem.poetEn} · {door.reason}</span>
        </Link>
      ))}
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

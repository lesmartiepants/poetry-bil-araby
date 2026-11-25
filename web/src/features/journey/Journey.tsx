// Area 9 · Journey and first run (9.1–9.10).
import { useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQueries } from '@tanstack/react-query';
import { api } from '@core/api';
import { useCollection, useCollections, useEras, useInvalidate, usePoem, useProgress, useSetPrefs, useTonight } from '@core/hooks';
import type { Collection } from '@core/types';
import { Header, Segmented, Skeleton } from '@ds/primitives';
import { Back, Bookmark, Chevron, Mark } from '@ds/icons';
import { Pattern } from '@ds/Pattern';
import { collectionArt, PathDock } from '@components/index';
import './journey.css';

/** The arched door at the foot of Tonight: tap, or swipe up, to enter the poem. */
function Door({ href }: { href: string }) {
  return (
    <Link href={href} aria-label="Enter the poem" className="enter">
      <svg aria-hidden width="118" height="150" viewBox="0 0 120 152" className="enter__arch">
        <path d="M4 150V72A67.2 67.2 0 0 1 60 5.74 67.2 67.2 0 0 1 116 72v78z" fill="#14120C" stroke="var(--c-accent)" strokeWidth="1.6" />
        <path d="M14 150V76a55.2 55.2 0 0 1 46-54.43A55.2 55.2 0 0 1 106 76v73.2" fill="none" stroke="#5C4C2A" />
      </svg>
      <span className="enter__label"><span lang="ar" className="enter__ar">ادخل</span><span className="enter__en">ENTER</span></span>
    </Link>
  );
}

const Leaf = () => (
  <svg aria-hidden width="24" height="24" viewBox="0 0 120 120">
    <path d="M60 16q-5.72 28.68 22 38t22 38q-22-19.36-44 0T16 92q27.72-9.32 22-38t22-38z" fill="var(--c-accent)" />
    <circle cx="60" cy="40" r="4" fill="var(--c-bg)" />
  </svg>
);

export function TonightScreen() {
  const t = useTonight();
  const poem = usePoem(t.data?.poem.slug ?? '').data;
  const eras = useEras().data;
  const [tab, setTab] = useState<'tonight' | 'pathways'>('tonight');
  const [, nav] = useLocation();
  const startY = useRef<number | null>(null);
  if (tab === 'pathways') return <Pathways onTonight={() => setTab('tonight')} />;
  const href = t.data ? `/p/${t.data.poem.slug}` : '/';
  const step = t.data?.journeyStep;
  const era = eras?.find((e) => e.slug === t.data?.poem.eraKey);
  const minutes = poem ? Math.max(1, Math.round(poem.lines.length / 4)) : 0;
  return (
    <div className="screen journey tonight"
      onTouchStart={(e) => { startY.current = e.touches[0].clientY; }}
      onTouchEnd={(e) => { if (startY.current !== null && startY.current - e.changedTouches[0].clientY > 80) nav(href); startY.current = null; }}>
      <div className="tonight__hero panel">
        <Pattern name="pajarita" />
        <header className="hub-hdr tonight__hdr"><BrandMark /></header>
        <div className="tonight__tabs journey-tabs">
          <Segmented pill label="Journey" value={tab} onChange={setTab} options={TABS} />
        </div>
        {t.data && (
          <div className="tonight__title">
            <p className="tonight__eyebrow">{step ? `CHOSEN FOR YOU · ${step.stepEn.toUpperCase()} ${step.index} OF ${step.titleEn.toUpperCase()}` : 'CHOSEN FOR TONIGHT'}</p>
            <h1 lang="ar" dir="rtl" className="tonight__ar">{t.data.poem.titleAr}</h1>
            <p className="tonight__en">{t.data.poem.titleEn.toUpperCase()}</p>
          </div>
        )}
      </div>
      {!t.data ? <div className="pad" style={{ paddingTop: 24 }}><Skeleton lines={4} /></div> : (
        <main className="tonight__body">
          <p className="tonight__poet"><span lang="ar">{t.data.poem.poetAr}</span> · {t.data.poem.poetEn}</p>
          <p className="tonight__meta">{[era?.nameEn, poem && `${poem.lines.length} lines`, poem && `about ${minutes} min`].filter(Boolean).join(' · ').toUpperCase()}</p>
          <div className="tonight__why">
            <Leaf />
            <div><p className="t-eyebrow">WHY TONIGHT</p><p className="tonight__reason">{t.data.reason}</p></div>
          </div>
        </main>
      )}
      {t.data && (
        <div className="tonight__enter">
          <Door href={href} />
          <span className="tonight__swipe">OR SWIPE UP</span>
        </div>
      )}
    </div>
  );
}

/** The Journey tab is headed by the mark alone (the other tabs use the full logo). */
const BrandMark = () => <span role="img" aria-label="poetry بالعربي" className="brand-mark"><Mark size={26} colour="var(--c-accent)" /></span>;

/** Tonight and Pathways share one tab bar, in the same place on both. */
const TABS: { value: 'tonight' | 'pathways'; label: string }[] = [{ value: 'tonight', label: 'TONIGHT’S POEM' }, { value: 'pathways', label: 'PATHWAYS' }];

function Pathways({ onTonight }: { onTonight: () => void }) {
  const journeys = useCollections('journey').data;
  const prog = useProgress().data;
  const tonight = useTonight().data;
  const doors = useQueries({ queries: [{ queryKey: ['doors', tonight?.poem.id], queryFn: () => api.ai.doors(tonight!.poem.id), enabled: !!tonight }] })[0].data;
  return (
    <div className="screen journey">
      <header className="hub-hdr"><BrandMark /></header>
      <div className="journey__top journey-tabs"><Segmented pill label="Journey" value="pathways" onChange={(v) => v === 'tonight' && onTonight()} options={TABS} /></div>
      <main className="pad stack gap-12" style={{ paddingTop: 20 }}>
        <p className="t-eyebrow t-eyebrow--accent">JOURNEYS</p>
        {journeys?.map((j) => {
          const p = prog?.find((x) => x.slug === j.slug);
          return (
            <Link key={j.slug} href={`/journey/${j.slug}`} className="journey-card" style={{ background: j.colour }}>
              <span className="journey-card__titles"><span className="journey-card__en">{j.titleEn}</span><span lang="ar" dir="rtl" className="journey-card__ar">{j.titleAr}</span></span>
              <span className="journey-card__meta">{j.poemIds.length} {j.stepEn.toUpperCase()}S{p ? ` · ${p.position} DONE` : ''}</span>
            </Link>
          );
        })}
        <p className="t-eyebrow t-eyebrow--accent mt-12">THREE DOORS</p>
        {doors?.map((d) => (
          <Link key={d.poem.id} href={`/p/${d.poem.slug}`} className="door">
            <span className="door__hook">{d.hook}</span><span lang="ar" className="door__ar">{d.poem.titleAr}</span><span className="door__meta">{d.poem.poetEn} · {d.reason}</span>
          </Link>
        ))}
      </main>
    </div>
  );
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n: number) => WORDS[n] ?? String(n);

/** A step's poem opens in the reader with the journey in its address, so its end can complete the step. */
const stepHref = (j: Collection, i: number, slugOf?: string) => `/p/${slugOf ?? j.poemIds[i]}?journey=${j.slug}&step=${i + 1}`;

function StepMark({ state }: { state: 'read' | 'next' | 'later' }) {
  return (
    <span className={`step-mark step-mark--${state}`}>
      <Mark size={state === 'next' ? 30 : 24} colour={state === 'later' ? '#4A463E' : state === 'read' ? 'var(--brand-old-gold)' : 'var(--c-accent)'} />
    </span>
  );
}

export function JourneyScreen({ slug }: { slug: string }) {
  const j = useCollection(slug).data;
  const inv = useInvalidate();
  const prog = useProgress().data?.find((p) => p.slug === slug);
  const [, nav] = useLocation();
  const poems = useQueries({ queries: (j?.poemIds ?? []).map((id) => ({ queryKey: ['poem', id], queryFn: () => api.poems.get(id) })) });
  if (!j) return <div className="screen pad" style={{ paddingTop: 120 }} aria-busy="true"><Skeleton lines={7} /></div>;
  const of = j.poemIds.length;
  const pos = Math.min(prog?.position ?? 0, of);
  const step = j.stepEn.toUpperCase();
  const nextPoem = poems[pos]?.data;
  const saved = prog?.saved ?? false;
  const toggleSave = async () => {
    await api.collections.setProgress({ slug, position: pos, saved: !saved, completedAt: prog?.completedAt });
    inv(['progress']);
  };
  return (
    <div className="screen journey">
      <Header onBack={() => nav('/journey')} right={
        <button className="icon-btn" aria-pressed={saved} aria-label={saved ? 'Saved' : 'Save'} onClick={toggleSave}><Bookmark style={saved ? { fill: 'currentColor' } : undefined} /></button>
      } />
      <main className="journey__main">
        <div className="row between" style={{ alignItems: 'baseline' }}>
          <p className="t-eyebrow t-eyebrow--accent">JOURNEY · {pos} OF {of} READ</p>
          <span lang="ar" className="journey__ar">{j.titleAr}</span>
        </div>
        <h1 className="journey__title">{j.titleEn}</h1>
        <p className="journey__intro">{j.intro}</p>
        <ol className="steps">
          {j.poemIds.map((id, i) => {
            const p = poems[i]?.data;
            const state = i < pos ? 'read' : i === pos ? 'next' : 'later';
            const theme = j.themes?.[i] ?? p?.titleEn;
            return (
              <li key={`${id}-${i}`}>
                <Link href={stepHref(j, i, p?.slug)} className={`step step--${state}`}>
                  <StepMark state={state} />
                  <span className="step__text">
                    <span className="step__label">{step} {i + 1}{state === 'read' ? ' · READ' : state === 'next' ? ' · NEXT' : ''}</span>
                    <span className="step__title">{[theme, p?.poetEn].filter(Boolean).join(' · ') || '…'}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </main>
      <PathDock label="JOURNEY" pos={pos} of={of} title={j.titleEn} next={pos < of ? { href: stepHref(j, pos, nextPoem?.slug), label: `${step} ${pos + 1}` } : undefined} />
    </div>
  );
}

/** 9.7 A step complete: the path so far, and the next step's opening line. 9.8 when it was the last. */
export function StepDone({ slug, step }: { slug: string; step: number }) {
  const j = useCollection(slug).data;
  const done = usePoem(j?.poemIds[step - 1] ?? '').data;
  const next = usePoem(j?.poemIds[step] ?? '').data;
  const [, nav] = useLocation();
  if (!j) return <div className="screen pad" style={{ paddingTop: 120 }} aria-busy="true"><Skeleton lines={5} /></div>;
  const of = j.poemIds.length;
  const finished = step >= of;
  const theme = j.themes?.[step - 1];
  const nextTheme = j.themes?.[step];
  const art = collectionArt(j);
  return (
    <div className="screen journey">
      <header className="step-done__top">
        <button className="icon-btn" aria-label="Back to the poem" onClick={() => history.back()}><Back /></button>
        <span className="t-eyebrow">{j.titleEn.toUpperCase()}</span>
        <span className="hdr__spacer" />
      </header>
      <main className="step-done">
        <div className="step-done__marks" aria-label={`${step} of ${of} read`}>
          {j.poemIds.map((_, i) => <span key={i} className={i === step - 1 ? 'is-now' : ''}><StepMark state={i < step ? 'read' : 'later'} /></span>)}
        </div>
        <div style={{ textAlign: 'center' }}>
          <p className="step-done__title">{finished ? `You finished ${j.titleEn}.` : `${j.stepEn} ${word(step)}${theme ? `, ${theme.toLowerCase()}` : ''}.`}</p>
          <p className="step-done__body">
            {done ? `You read ${done.poetEn}’s poem to the end. ` : ''}
            {finished ? 'Every step is read. The journey stays in your Library.' : `${word(of - step)[0].toUpperCase()}${word(of - step).slice(1)} ${(j.stepEn + (of - step === 1 ? '' : 's')).toLowerCase()} to go.`}
          </p>
        </div>
        {!finished && next && (
          <>
            <p className="t-eyebrow t-eyebrow--accent" style={{ margin: '6px 0 -8px' }}>THE NEXT {j.stepEn.toUpperCase()}</p>
            <Link href={stepHref(j, step, next.slug)} className="next-step panel" style={{ background: j.colour }}>
              <Pattern {...art} scale={0.7} scrim={0.78} />
              <span className="next-step__label">{j.stepEn.toUpperCase()} {step + 1} OF {of}{nextTheme ? ` · ${nextTheme.toUpperCase()}` : ''}</span>
              <span lang="ar" dir="rtl" className="next-step__ar">{next.lines[0]?.ar}</span>
              <span className="next-step__en">{next.lines[0]?.en}</span>
              <span className="next-step__foot"><span>{next.poetEn} <span lang="ar" className="next-step__poet-ar">· {next.poetAr}</span></span><span className="next-step__read">READ <Chevron size={14} /></span></span>
            </Link>
          </>
        )}
        <Link href={`/journey/${slug}`} className="step-done__all">See all {word(of)}<Chevron /></Link>
        <button className="step-done__enough" onClick={() => nav('/journey')}>{finished ? 'BACK TO TONIGHT' : 'ENOUGH FOR TONIGHT'}</button>
      </main>
    </div>
  );
}
export function WelcomeFlow({ onDone }: { onDone: (firstPoemSlug: string) => void }) {
  const tonight = useTonight().data;
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const set = useSetPrefs();
  const [under, setUnder] = useState<'nothing' | 'english' | 'sounds'>('english');
  const dots = (
    <div className="welcome__dots" aria-label={`Step ${step + 1} of 2`}>{[0, 1].map((i) => <span key={i} className={i === step ? 'is-on' : ''} />)}</div>
  );
  if (step === 0) {
    const next = () => { if (name.trim()) set.mutate({ displayName: name.trim() }); setStep(1); };
    return (
      <div className="screen screen--bare journey welcome welcome--hello">
        <div className="welcome__mark"><Mark size={88} colour="var(--c-accent)" /></div>
        <div className="welcome__hello">
          <p lang="ar" className="welcome__ar">أهلاً بك</p>
          <h1 className="welcome__en">Welcome</h1>
          <p className="welcome__lede">A poem a night, chosen for you, from fourteen centuries of Arabic verse.</p>
        </div>
        <label className="welcome__name">
          <span className="t-eyebrow">WHAT SHOULD THE GUIDE CALL YOU?</span>
          <input className="welcome__input" aria-label="Your name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && next()} />
          <span className="welcome__help">Just a first name. Optional.</span>
        </label>
        <div style={{ flex: 1 }} />
        {dots}
        <button className="btn btn--primary btn--block welcome__go" onClick={next}>Continue</button>
        <button className="welcome__skip" onClick={() => setStep(1)}>SKIP</button>
      </div>
    );
  }
  return (
    <div className="screen screen--bare journey welcome">
      <p className="t-eyebrow t-eyebrow--accent">HOW YOU’D LIKE TO READ</p>
      <div className="stack gap-10" style={{ width: '100%' }}>
        {(['nothing', 'english', 'sounds'] as const).map((u) => (
          <button key={u} role="radio" aria-checked={under === u} className={`read-opt${under === u ? ' read-opt--on' : ''}`} onClick={() => setUnder(u)}>
            <span lang="ar" className="ar" style={{ fontSize: 22 }}>أَمُرُّ عَلى الدِيارِ دِيارِ لَيلى</span>
            {u === 'english' && <span className="read-opt__en">I pass by the dwellings, Layla’s dwellings,</span>}
            {u === 'sounds' && <span className="read-opt__en">amurru ʿala d-diyari diyari layla</span>}
            <span className="t-count">{u === 'nothing' ? 'ARABIC ONLY' : u === 'english' ? 'WITH TRANSLATION' : 'WITH SOUNDS'}</span>
          </button>
        ))}
      </div>
      <button className="btn btn--primary btn--block" onClick={() => { set.mutate({ under }); onDone(tonight?.poem.slug ?? ''); }}>Read my first poem</button>
    </div>
  );
}

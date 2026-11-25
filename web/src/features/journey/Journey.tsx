// Area 9 · Journey and first run (9.1–9.10).
import { useRef, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { useQueries } from '@tanstack/react-query';
import { api } from '@core/api';
import { useCollection, useCollections, useDoors, useEras, useLastRead, usePoem, usePrefs, useProgress, useSetPrefs, useSetProgress, useTonight } from '@core/hooks';
import type { Collection } from '@core/types';
import { Header, Segmented, Skeleton } from '@ds/primitives';
import { Back, Bookmark, Chevron, Mark } from '@ds/icons';
import { Pattern } from '@ds/Pattern';
import { BrandLogo, collectionArt, DoorCard, PathDock } from '@components/index';
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
  // Straight from the welcome (9.3): the first poem greets the reader by name.
  const welcome = new URLSearchParams(useSearch()).has('welcome');
  const name = usePrefs().data?.displayName?.trim();
  if (tab === 'pathways') return <Pathways onTonight={() => setTab('tonight')} />;
  const step = t.data?.journeyStep;
  // A journey step opens as that step (its end completes it, 9.7); otherwise its end is You finished (2.18).
  const href = !t.data ? '/' : step ? `/p/${t.data.poem.slug}?journey=${step.slug}&step=${step.index}` : `/p/${t.data.poem.slug}?from=tonight`;
  const era = eras?.find((e) => e.slug === t.data?.poem.eraKey);
  const minutes = poem ? Math.max(1, Math.round(poem.lines.length / 4)) : 0;
  const eyebrow = welcome
    ? `WELCOME${name ? `, ${name.toUpperCase()}` : ''} · YOUR FIRST POEM`
    : step ? `CHOSEN FOR YOU · ${step.stepEn.toUpperCase()} ${step.index} OF ${step.titleEn.toUpperCase()}` : 'CHOSEN FOR TONIGHT';
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
            <p className="tonight__eyebrow">{eyebrow}</p>
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
  // The doors of the last poem the reader finished; none until they have finished one.
  const lastId = useLastRead().data;
  const last = usePoem(lastId ?? '').data;
  const doors = useDoors(lastId).data;
  const tonight = useTonight().data;
  return (
    <div className="screen journey">
      <header className="hub-hdr"><BrandMark /></header>
      <div className="journey__top journey-tabs"><Segmented pill label="Journey" value="pathways" onChange={(v) => v === 'tonight' && onTonight()} options={TABS} /></div>
      <main className="pad stack gap-12" style={{ paddingTop: 20 }}>
        <p className="t-eyebrow t-eyebrow--accent">JOURNEYS</p>
        {journeys?.map((j, i) => {
          const read = prog?.find((x) => x.slug === j.slug)?.position ?? 0;
          const of = j.poemIds.length;
          if (i > 0) {
            return (
              <Link key={j.slug} href={`/journey/${j.slug}`} className="journey-row">
                <span className="journey-row__count">{read}/{of}</span>
                <span className="journey-row__text"><span className="journey-row__title">{j.titleEn}</span>{j.subtitle && <span className="journey-row__sub">{j.subtitle}</span>}</span>
                <Chevron size={16} />
              </Link>
            );
          }
          // The first journey is suggested, never required (9.5).
          const step = tonight?.journeyStep?.slug === j.slug ? tonight.journeyStep : undefined;
          return (
            <Link key={j.slug} href={`/journey/${j.slug}`} className="journey-start">
              <span className="journey-start__head">
                <StartPath read={read} of={of} />
                <span className="journey-start__titles"><span className="journey-start__eyebrow">START HERE · NOT REQUIRED</span><span className="journey-start__title">{j.titleEn}</span></span>
                <span className="journey-start__count">{read} / {of}</span>
              </span>
              <span className="journey-start__intro">{j.intro}{step && ` Tonight’s poem is ${j.stepEn.toLowerCase()} ${step.index}.`}</span>
            </Link>
          );
        })}
        {last && doors?.length ? (
          <section aria-label="From your last poem" className="stack gap-12">
            <p className="t-eyebrow t-eyebrow--accent mt-12">FROM YOUR LAST POEM · {last.titleEn.toUpperCase()}</p>
            {doors.map((d) => <DoorCard key={d.poem.id} door={d} size="path" />)}
          </section>
        ) : null}
      </main>
    </div>
  );
}

/** Seven stones along a path, lit as far as the reader has come. */
function StartPath({ read, of }: { read: number; of: number }) {
  const lit = of ? Math.round((Math.min(read, of) / of) * 7) : 0;
  const stones: [number, number][] = [[10, 90], [22, 70], [38, 58], [56, 62], [72, 48], [86, 30], [104, 22]];
  return (
    <svg aria-hidden="true" width="40" height="40" viewBox="0 0 120 120">
      <path d="M10 90 L22 70 L38 58 L56 62 L72 48 L86 30 L104 22" fill="none" stroke="#5C4C2A" strokeWidth="3" strokeDasharray="2 6" />
      {stones.map(([x, y], k) => <circle key={k} cx={x} cy={y} r={k < lit ? 7 : 6} fill={k < lit ? '#D4B36A' : '#0A0A0D'} stroke="#D4B36A" strokeWidth="3" />)}
    </svg>
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
  const progress = useProgress();
  const prog = progress.data?.find((p) => p.slug === slug);
  const saveProgress = useSetProgress();
  const [, nav] = useLocation();
  const poems = useQueries({ queries: (j?.poemIds ?? []).map((id) => ({ queryKey: ['poem', id], queryFn: () => api.poems.get(id) })) });
  if (!j) return <div className="screen pad" style={{ paddingTop: 120 }} aria-busy="true"><Skeleton lines={7} /></div>;
  const of = j.poemIds.length;
  const pos = Math.min(prog?.position ?? 0, of);
  const step = j.stepEn.toUpperCase();
  const nextPoem = poems[pos]?.data;
  const saved = prog?.saved ?? false;
  const toggleSave = () => saveProgress.mutate({ slug, position: pos, saved: !saved, completedAt: prog?.completedAt });
  return (
    <div className="screen journey">
      <Header onBack={() => nav('/journey')} right={
        <button className="icon-btn" disabled={progress.isPending || saveProgress.isPending} aria-pressed={saved} aria-label={saved ? 'Saved' : 'Save'} onClick={toggleSave}><Bookmark style={saved ? { fill: 'currentColor' } : undefined} /></button>
      } />
      <main className="journey__main">
        {saveProgress.isError && <p role="alert">Couldn’t update this journey. Try again.</p>}
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
  if (finished) return <JourneyDone j={j} />;
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
/** 9.8 The last step read: the whole journey complete, and where to go next. */
function JourneyDone({ j }: { j: Collection }) {
  const others = useCollections('journey').data?.filter((x) => x.slug !== j.slug).slice(0, 2) ?? [];
  const prog = useProgress().data;
  const first = usePoem(j.poemIds[0] ?? '').data;
  const last = usePoem(j.poemIds[j.poemIds.length - 1] ?? '').data;
  const of = j.poemIds.length;
  const themes = (j.themes ?? []).filter((t): t is string => !!t).map((t) => t.toUpperCase());
  const half = Math.ceil(themes.length / 2);
  const [t0, tN] = [j.themes?.[0]?.toLowerCase(), j.themes?.[of - 1]?.toLowerCase()];
  const from = first && last && first.poetEn !== last.poetEn
    ? `From ${first.poetEn}’s ${t0 ?? 'first poem'} to ${last.poetEn}’s ${tN ?? 'last'}: `
    : '';
  return (
    <div className="screen journey">
      <header className="step-done__top">
        <button className="icon-btn" aria-label="Back to the poem" onClick={() => history.back()}><Back /></button>
        <span className="t-eyebrow">{j.titleEn.toUpperCase()}</span>
        <span className="hdr__spacer" />
      </header>
      <main className="journey-done">
        <div className="journey-done__mark"><Mark size={120} colour="var(--c-accent)" /></div>
        <div className="journey-done__head">
          <p lang="ar" className="journey-done__ar">{j.titleAr}</p>
          <h1 className="journey-done__title">All {word(of)}, complete.</h1>
          <p className="journey-done__body">{from}{word(of)[0].toUpperCase() + word(of).slice(1)} poems, read to the end. The journey stays in your Library.</p>
        </div>
        <div className="journey-done__marks" aria-label={`All ${of} read`}>{j.poemIds.map((id) => <span key={id} className="journey-done__step"><Mark size={22} colour="var(--brand-old-gold)" /></span>)}</div>
        {themes.length > 0 && <p className="journey-done__themes">{themes.slice(0, half).join(' · ')}<br />{themes.slice(half).join(' · ')}</p>}
        {others.length > 0 && (
          <>
            <p className="t-eyebrow t-eyebrow--accent journey-done__next">YOUR NEXT JOURNEY</p>
            {others.map((o) => (
              <Link key={o.slug} href={`/journey/${o.slug}`} className="journey-row">
                <span className="journey-row__count">{prog?.find((x) => x.slug === o.slug)?.position ?? 0}/{o.poemIds.length}</span>
                <span className="journey-row__text"><span className="journey-row__title">{o.titleEn}</span>{o.subtitle && <span className="journey-row__sub">{o.subtitle}</span>}</span>
                <Chevron size={16} />
              </Link>
            ))}
          </>
        )}
      </main>
    </div>
  );
}

/** 2.18 You finished Tonight's poem: three doors with their reasons, or enough for tonight. */
export function FinishedScreen({ id }: { id: string }) {
  const poem = usePoem(id).data;
  const doors = useDoors(poem?.id);
  const [, nav] = useLocation();
  return (
    <div className="screen journey">
      <header className="finished__top">
        <button className="icon-btn finished__back" aria-label="Back to the poem" onClick={() => history.back()}><Back /></button>
        <BrandLogo />
      </header>
      <main className="finished">
        <div className="finished__head">
          <h1 className="finished__title">{poem ? `You finished ${poem.titleEn}.` : 'You finished.'}</h1>
          <p className="finished__body">The guide would take you to one of these next.</p>
        </div>
        {doors.data ? doors.data.map((d) => <DoorCard key={d.poem.id} door={d} size="finished" />) : <Skeleton lines={4} />}
        <button className="finished__enough" onClick={() => nav('/journey')}>ENOUGH FOR TONIGHT</button>
      </main>
    </div>
  );
}

const READ_OPTS = [
  { under: 'nothing', en: 'Arabic only', desc: 'The poem as it was written.', ar: 'عربي فقط' },
  { under: 'english', en: 'With translation', desc: 'English under every line.', ar: 'مع الترجمة' },
  { under: 'sounds', en: 'With sounds', desc: 'How it sounds in Latin letters, plus the English.', ar: 'مع النطق' },
] as const;

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
  const who = name.trim() ? `${name.trim().toUpperCase()}, ` : '';
  return (
    <div className="screen screen--bare journey welcome welcome--read">
      <div className="welcome__mark-sm"><Mark size={40} colour="var(--c-accent)" /></div>
      <div className="welcome__read-head">
        <p className="t-eyebrow t-eyebrow--accent">{who ? `${who}HOW WOULD YOU LIKE TO READ?` : 'HOW WOULD YOU LIKE TO READ?'}</p>
        <div className="welcome__read-title"><h1>Your reading</h1><span lang="ar">كيف تقرأ</span></div>
      </div>
      <div role="radiogroup" aria-label="Your reading" className="stack gap-10 welcome__opts">
        {READ_OPTS.map((o) => (
          <button key={o.under} role="radio" aria-checked={under === o.under} className={`read-opt${under === o.under ? ' read-opt--on' : ''}`} onClick={() => setUnder(o.under)}>
            <span className="read-opt__head">
              <span className="read-opt__dot" aria-hidden />
              <span className="read-opt__label"><span className="read-opt__name">{o.en}</span><span className="read-opt__desc">{o.desc}</span></span>
              <span lang="ar" className="read-opt__ar">{o.ar}</span>
            </span>
            <span className="read-opt__sample">
              <span lang="ar" dir="rtl" className="read-opt__verse">قِفا نَبكِ مِن ذِكرى حَبيبٍ ومَنزِلِ</span>
              {o.under === 'sounds' && <span className="read-opt__sounds">qifā nabki min dhikrā ḥabībin wa-manzili</span>}
              {o.under !== 'nothing' && <span className="read-opt__en">Stop, let us weep for a beloved and a dwelling</span>}
            </span>
          </button>
        ))}
      </div>
      <p className="welcome__later">Change it anytime in You · Translation and sounds.</p>
      <div style={{ flex: 1 }} />
      {dots}
      <button className="btn btn--primary btn--block welcome__go" onClick={() => { set.mutate({ under }); onDone(tonight?.poem.slug ?? ''); }}>BEGIN WITH TONIGHT’S POEM</button>
    </div>
  );
}

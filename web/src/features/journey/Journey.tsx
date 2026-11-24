// Area 9 · Journey and first run (9.1–9.10).
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQueries } from '@tanstack/react-query';
import { api } from '@core/api';
import { useCollection, useCollections, usePoem, useProgress, useSetPrefs, useTonight } from '@core/hooks';
import { stripMarks } from '@core/logic/arabic';
import { Header, Segmented, Skeleton } from '@ds/primitives';
import { Mark } from '@ds/icons';
import { ProgressBar } from '@components/index';
import './journey.css';

export function TonightScreen() {
  const t = useTonight();
  const poem = usePoem(t.data?.poem.slug ?? '').data;
  const [tab, setTab] = useState<'tonight' | 'pathways'>('tonight');
  if (tab === 'pathways') return <Pathways onTonight={() => setTab('tonight')} />;
  return (
    <div className="screen journey">
      <header className="journey__top"><Mark size={26} colour="var(--c-accent)" /><Segmented pill label="Journey" value={tab} onChange={setTab} options={[{ value: 'tonight', label: 'TONIGHT' }, { value: 'pathways', label: 'PATHWAYS' }]} /></header>
      {!t.data ? <div className="pad" style={{ paddingTop: 60 }}><Skeleton lines={6} /></div> : (
        <main className="pad stack gap-16" style={{ paddingTop: 30 }}>
          <p className="t-eyebrow t-eyebrow--accent">{t.data.journeyStep ? `${t.data.journeyStep.stepEn.toUpperCase()} ${t.data.journeyStep.index} OF ${t.data.journeyStep.of} · ${t.data.journeyStep.titleEn.toUpperCase()}` : 'CHOSEN FOR TONIGHT'}</p>
          <h1 lang="ar" className="tonight__ar">{t.data.poem.titleAr}</h1>
          <p className="tonight__en">{t.data.poem.titleEn}</p>
          <p className="tonight__poet"><span lang="ar" className="ar">{t.data.poem.poetAr}</span> · {t.data.poem.poetEn}</p>
          {poem && <p lang="ar" dir="rtl" className="tonight__line">{poem.lines[0].ar}</p>}
          <p className="t-lede">{t.data.reason}</p>
          <Link href={`/p/${t.data.poem.slug}`} className="btn btn--primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Read tonight’s poem</Link>
        </main>
      )}
    </div>
  );
}

function Pathways({ onTonight }: { onTonight: () => void }) {
  const journeys = useCollections('journey').data;
  const prog = useProgress().data;
  const tonight = useTonight().data;
  const doors = useQueries({ queries: [{ queryKey: ['doors', tonight?.poem.id], queryFn: () => api.ai.doors(tonight!.poem.id), enabled: !!tonight }] })[0].data;
  return (
    <div className="screen journey">
      <header className="journey__top"><Mark size={26} colour="var(--c-accent)" /><Segmented pill label="Journey" value="pathways" onChange={(v) => v === 'tonight' && onTonight()} options={[{ value: 'tonight', label: 'TONIGHT' }, { value: 'pathways', label: 'PATHWAYS' }]} /></header>
      <main className="pad stack gap-12" style={{ paddingTop: 20 }}>
        <p className="t-eyebrow t-eyebrow--accent">THREE DOORS</p>
        {doors?.map((d) => (
          <Link key={d.poem.id} href={`/p/${d.poem.slug}`} className="door">
            <span className="door__hook">{d.hook}</span><span lang="ar" className="door__ar">{d.poem.titleAr}</span><span className="door__meta">{d.poem.poetEn} · {d.reason}</span>
          </Link>
        ))}
        <p className="t-eyebrow t-eyebrow--accent mt-12">JOURNEYS</p>
        {journeys?.map((j) => {
          const p = prog?.find((x) => x.slug === j.slug);
          return (
            <Link key={j.slug} href={`/journey/${j.slug}`} className="journey-card" style={{ background: j.colour }}>
              <span className="row between"><span className="journey-card__en">{j.titleEn}</span><span lang="ar" className="journey-card__ar">{j.titleAr}</span></span>
              <span className="journey-card__meta">{j.poemIds.length} {j.stepEn.toUpperCase()}S{p ? ` · ${p.position} DONE` : ''}</span>
            </Link>
          );
        })}
      </main>
    </div>
  );
}

export function JourneyScreen({ slug }: { slug: string }) {
  const j = useCollection(slug).data;
  const prog = useProgress().data?.find((p) => p.slug === slug);
  const [, nav] = useLocation();
  const poems = useQueries({ queries: (j?.poemIds ?? []).map((id, i) => ({ queryKey: ['poem', id, i], queryFn: () => api.poems.get(id) })) });
  const [done, setDone] = useState<number | null>(null);
  if (!j) return <div className="screen pad" style={{ paddingTop: 120 }} aria-busy="true"><Skeleton lines={7} /></div>;
  const pos = prog?.position ?? 0;
  const complete = async () => {
    const next = pos + 1;
    await api.collections.setProgress({ slug, position: next, saved: true, completedAt: next >= j.poemIds.length ? Date.now() : undefined });
    setDone(next);
  };
  if (done !== null) {
    const finished = done >= j.poemIds.length;
    return (
      <div className="screen journey"><div className="coming">
        <Mark size={64} colour="var(--c-accent)" />
        <p className="t-eyebrow t-eyebrow--accent">{finished ? 'JOURNEY COMPLETE' : `${j.stepEn.toUpperCase()} ${done} COMPLETE`}</p>
        <h2 className="t-title">{finished ? `You finished ${j.titleEn}` : `${j.stepEn} ${done} of ${j.poemIds.length}`}</h2>
        <button className="btn btn--primary" onClick={() => nav('/journey')}>Back to tonight</button>
      </div></div>
    );
  }
  return (
    <div className="screen journey">
      <Header onBack={() => nav('/journey')} />
      <div className="pad stack gap-12">
        <div className="row between" style={{ alignItems: 'baseline' }}><h1 className="t-title">{j.titleEn}</h1><span lang="ar" className="t-title-ar">{j.titleAr}</span></div>
        <p className="t-lede">{j.intro}</p>
        <ProgressBar done={pos} of={j.poemIds.length} label={`${j.titleEn} progress`} />
        <ol className="path">
          {poems.map((q, i) => (
            <li key={i} className={`path__step${i < pos ? ' path__step--done' : i === pos ? ' path__step--now' : ''}`}>
              <span className="path__dot">{i + 1}</span>
              <span className="stack"><span className="t-count">{j.stepEn.toUpperCase()} {i + 1}</span>
                {i <= pos && q.data ? <Link href={`/p/${q.data.slug}`} className="path__title">{q.data.titleEn} · <span lang="ar" className="ar">{stripMarks(q.data.titleAr)}</span></Link> : <span className="path__title path__title--locked">Opens after {j.stepEn.toLowerCase()} {i}</span>}
              </span>
            </li>
          ))}
        </ol>
        {pos < j.poemIds.length && <button className="btn btn--primary" onClick={complete}>I’ve read {j.stepEn.toLowerCase()} {pos + 1}</button>}
      </div>
    </div>
  );
}

/** 9.1–9.3 First run. */
export function WelcomeFlow({ onDone }: { onDone: (firstPoemSlug: string) => void }) {
  const tonight = useTonight().data;
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const set = useSetPrefs();
  const [under, setUnder] = useState<'nothing' | 'english' | 'sounds'>('english');
  if (step === 0) {
    return (
      <div className="screen screen--bare journey welcome">
        <Mark size={72} colour="var(--c-accent)" />
        <h1 lang="ar" className="welcome__ar">أهلاً</h1>
        <p className="t-lede" style={{ textAlign: 'center' }}>Arabic poetry, read and heard. What should we call you?</p>
        <input className="text-in" style={{ width: '100%', flex: 'none' }} aria-label="Your name" placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn--primary btn--block" onClick={() => { if (name.trim()) set.mutate({ displayName: name.trim() }); setStep(1); }}>Continue</button>
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

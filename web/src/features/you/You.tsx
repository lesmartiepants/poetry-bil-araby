// Area 12 · You (12.1–12.8).
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { api } from '@core/api';
import { qk, useAccount, useFeelings, useInvalidate, usePrefs, useSetPrefs } from '@core/hooks';
import { isAvailable } from '@core/sources';
import { FEMALE_VOICES, MALE_VOICES } from '@core/voices';
import { GroupCard, Header, LoadNote, Segmented, Skeleton, Slider, Switch, TitleRow } from '@ds/primitives';
import { Check, Chevron, Pause, Play } from '@ds/icons';
import { BrandLogo, RowLink } from '@components/index';
import './you.css';
import { useOverlay } from '@components/overlays';

function AccountCard() {
  const account = useAccount();
  const acc = account.data;
  const inv = useInvalidate();
  const { open, showToast } = useOverlay();
  const [signingOut, setSigningOut] = useState(false);
  const signOut = async () => {
    setSigningOut(true);
    try {
      await api.profile.signOut();
      await inv(qk.account);
    } catch {
      showToast({ text: 'Couldn’t sign out. Try again.', alert: true });
    } finally {
      setSigningOut(false);
    }
  };
  if (account.isError) return <GroupCard>
    <p className="group-row" role="alert">Couldn’t load your account.</p>
    <button className="group-row" onClick={() => void account.refetch()}>Try again</button>
  </GroupCard>;
  if (!acc) return <Skeleton lines={2} />;
  if (!acc.signedIn) return <GroupCard><button className="group-row" onClick={() => open({ type: 'signin' })}><div className="group-row__main"><p className="group-row__title">Sign in</p><p className="group-row__sub">Apple or Google · keeps your diwan on every device</p></div></button></GroupCard>;
  return (
    <GroupCard>
      <div className="group-row"><div className="group-row__main"><p className="group-row__title">Signed in with {acc.provider === 'google' ? 'Google' : 'Apple'}</p><p className="group-row__sub">Your diwan is kept on every device</p></div></div>
      <button className="group-row group-row--danger" disabled={signingOut} onClick={signOut}><div className="group-row__main"><p className="group-row__title">Sign out</p></div></button>
    </GroupCard>
  );
}

const SAMPLE_MS = 2500;
const cap = (x: string) => x[0].toUpperCase() + x.slice(1);

export function YouHub() {
  const pq = usePrefs();
  const p = pq.data;
  const set = useSetPrefs();
  const fq = useFeelings();
  const feelings = fq.data;
  const guide = isAvailable('profile', 'journey');
  const SIZES = ['Small', 'Medium', 'Large', 'Larger', 'Largest'];
  const leaning = (x: number) => (x < 0.2 ? 'Classical' : x < 0.45 ? 'Mostly classical, some modern' : x <= 0.55 ? 'Classical and modern' : x <= 0.8 ? 'Mostly modern, some classical' : 'Modern');
  const moves = p?.feelings.map((k) => feelings?.find((f) => f.key === k)?.en ?? k).join(', ');
  return (
    <div className="screen">
      <header className="hub-hdr"><BrandLogo /></header>
      <main className="pad stack" style={{ paddingTop: 6 }}>
        <LoadNote of={[pq, fq]} message="Your settings didn’t load." />
        {guide && (
          <>
            <p className="you-label">YOUR GUIDE</p>
            <GroupCard>
              <RowLink href="/you/moves" title="What moves you" sub={moves ? cap(moves.toLowerCase()) : 'Nothing picked yet'} />
              <RowLink href="/you/guide" title="How the guide chooses" sub={p ? `${leaning(p.classicalModern)}${p.difficulty === 'any' ? '' : ` · ${p.difficulty}`}` : ''} />
            </GroupCard>
            <p className="you-label">LISTENING</p>
            <GroupCard>
              <RowLink href="/you/reciter" title="Reciter" sub={p?.voice ?? ''} />
              {p && (
                <div className="group-row">
                  <div className="group-row__main"><p className="group-row__title">Play through silent mode</p><p className="group-row__sub">{p.silentMode ? 'On' : 'Off'}</p></div>
                  <Switch label="Play through silent mode" on={p.silentMode} onChange={(silentMode) => set.mutate({ silentMode })} />
                </div>
              )}
            </GroupCard>
          </>
        )}
        <p className="you-label">READING</p>
        <GroupCard>
          <RowLink href="/you/appearance" title="Appearance" sub={p ? `${cap(p.page)} · ${SIZES[p.textSize - 1]} text · Vowel marks ${p.vowelMarks ? 'on' : 'off'}` : ''} />
          {guide && <RowLink href="/you/translation" title="Translation and sounds" sub={p ? { english: 'English under the Arabic', sounds: 'Sounds under the Arabic', nothing: 'Arabic only' }[p.under] : ''} />}
        </GroupCard>
        <p className="you-label">ACCOUNT</p>
        <AccountCard />
        {!guide && <p className="t-note mt-12">Your voice is the last one you picked while listening. The guide’s settings arrive with the guide.</p>}
      </main>
    </div>
  );
}

export function AppearanceScreen({ Controls }: { Controls: ComponentType<{ preview?: boolean }> }) {
  const [, nav] = useLocation();
  return (
    <div className="screen">
      <Header onBack={() => nav('/you')} label="Back to You" />
      <TitleRow en="Appearance" ar="المظهر" />
      <div className="pad mt-12"><Controls preview /></div>
    </div>
  );
}

export function MovesScreen() {
  const [, nav] = useLocation();
  const feelings = useFeelings().data;
  const p = usePrefs().data;
  const set = useSetPrefs();
  if (!p) return null;
  const toggle = (k: string) => set.mutate({ feelings: p.feelings.includes(k) ? p.feelings.filter((x) => x !== k) : [...p.feelings, k] });
  return (
    <div className="screen">
      <Header onBack={() => nav('/you')} label="Back to You" />
      <TitleRow en="What moves you" ar="ما يحرّكك" />
      <div className="pad stack gap-16 mt-12">
        <p className="t-lede">Pick as many as you like. The guide leans toward these, and still surprises you.</p>
        <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
          {feelings?.map((f) => <button key={f.key} className="chip" aria-pressed={p.feelings.includes(f.key)} onClick={() => toggle(f.key)}>{f.en}<span lang="ar" className="ar">{f.ar}</span></button>)}
        </div>
        <p className="t-eyebrow">LEARNING</p>
        <div className="card row between" style={{ padding: 14, gap: 14 }}>
          <div><p className="group-row__title">Learn from what I keep</p><p className="group-row__sub">Kept poems shape the guide’s picks</p></div>
          <Switch label="Learn from what I keep" on={p.learnFromKeeps} onChange={(learnFromKeeps) => set.mutate({ learnFromKeeps })} />
        </div>
      </div>
    </div>
  );
}

export function GuideScreen() {
  const [, nav] = useLocation();
  const p = usePrefs().data;
  const set = useSetPrefs();
  if (!p) return null;
  return (
    <div className="screen">
      <Header onBack={() => nav('/you')} label="Back to You" />
      <TitleRow en="The guide" ar="الدليل" />
      <div className="pad stack gap-16 mt-12">
        <p className="t-eyebrow">CLASSICAL OR MODERN</p>
        <div className="stack gap-4">
          <div className="row between t-small"><span>Classical</span><span className="t-eyebrow t-eyebrow--accent">{p.classicalModern < 0.4 ? 'MOSTLY CLASSICAL' : p.classicalModern > 0.6 ? 'MOSTLY MODERN' : 'BOTH'}</span><span>Modern</span></div>
          <Slider label="Classical or modern" min={0} max={1} step={0.1} value={p.classicalModern} onChange={(classicalModern) => set.mutate({ classicalModern })} />
        </div>
        <p className="t-eyebrow">DIFFICULTY</p>
        <Segmented label="Difficulty" value={p.difficulty} onChange={(difficulty) => set.mutate({ difficulty })}
          options={[{ value: 'any', label: 'ANY' }, { value: 'gentle', label: 'GENTLE' }, { value: 'measured', label: 'MEASURED' }, { value: 'demanding', label: 'DEMANDING' }]} />
        <p className="t-small" style={{ marginTop: -6 }}>The same bands as Explore. Gentle means plain words and direct images; Demanding brings classical vocabulary and dense allusion.</p>
        <p className="t-eyebrow">POEM LENGTH</p>
        <Segmented label="Poem length" value={p.length} onChange={(length) => set.mutate({ length })} options={[{ value: 'short', label: 'SHORT' }, { value: 'any', label: 'ANY' }, { value: 'long', label: 'LONG' }]} />
      </div>
    </div>
  );
}

export function ReciterScreen() {
  const [, nav] = useLocation();
  const p = usePrefs().data;
  const set = useSetPrefs();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  // Each voice has a sample (12.6); one plays at a time and stops by itself.
  const [sampling, setSampling] = useState<string | null>(null);
  useEffect(() => {
    if (!sampling) return;
    const t = window.setTimeout(() => setSampling(null), SAMPLE_MS);
    return () => window.clearTimeout(t);
  }, [sampling]);
  if (!p) return null;
  const group = (key: string, title: ReactNode, list: typeof FEMALE_VOICES) => {
    // Three show at first, with the chosen voice always among them.
    const chosen = list.findIndex((v) => v.name === p.voice);
    const first = chosen > 2 ? [...list.slice(0, 2), list[chosen]] : list.slice(0, 3);
    const shown = open[key] ? list : first;
    return (
      <>
        <div className="row between you-voices__head"><p className="t-eyebrow">{title}</p><span className="t-eyebrow">{list.length}</span></div>
        <div className="reciter-group" role="radiogroup" aria-label={key}>
          {shown.map((v) => (
            <div key={v.name} className="voice-row voice-row--sample">
              <button className="voice-row__play" aria-label={sampling === v.name ? `Stop the ${v.name} sample` : `Play a sample of ${v.name}`} aria-pressed={sampling === v.name} onClick={() => setSampling(sampling === v.name ? null : v.name)}>
                {sampling === v.name ? <Pause size={12} /> : <Play size={12} />}
              </button>
              <button role="radio" aria-checked={p.voice === v.name} className="voice-row__pick" onClick={() => set.mutate({ voice: v.name })}>
                <span className="voice-row__name">{v.name} <span className="voice-row__desc">{v.descriptor}</span></span>
                {p.voice === v.name && <Check size={16} className="voice-row__check" />}
              </button>
            </div>
          ))}
          {!open[key] && list.length > shown.length && (
            <button className="voice-more" onClick={() => setOpen({ ...open, [key]: true })}>{list.length - shown.length} MORE <Chevron size={16} /></button>
          )}
        </div>
      </>
    );
  };
  return (
    <div className="screen">
      <Header onBack={() => nav('/you')} label="Back to You" />
      <TitleRow en="Reciter" ar="القارئ" />
      <div className="pad stack gap-8 mt-8">
        {group('Female voices', <>FEMALE · <span lang="ar">نساء</span></>, FEMALE_VOICES)}
        {group('Male voices', <>MALE · <span lang="ar">رجال</span></>, MALE_VOICES)}
        <div className="reciter-group mt-8">
          <div className="voice-setting"><p className="group-row__title">Play through silent mode</p><Switch label="Play through silent mode" on={p.silentMode} onChange={(silentMode) => set.mutate({ silentMode })} /></div>
          <div className="voice-setting"><div><p className="group-row__title">Pause between lines</p><p className="group-row__sub">A breath after each bayt</p></div><Switch label="Pause between lines" on={p.pauseLines} onChange={(pauseLines) => set.mutate({ pauseLines })} /></div>
        </div>
      </div>
    </div>
  );
}

export function TranslationScreen() {
  const [, nav] = useLocation();
  const p = usePrefs().data;
  const set = useSetPrefs();
  if (!p) return null;
  return (
    <div className="screen">
      <Header onBack={() => nav('/you')} label="Back to You" />
      <TitleRow en="Translation" ar="الترجمة" />
      <div className="pad stack gap-16 mt-12">
        {/* The choice previewed on a real opening line (12.7). */}
        <div className="card under-preview" aria-label="Preview">
          <p lang="ar" dir="rtl" className="under-preview__ar">أَمُرُّ عَلى الدِيارِ دِيارِ لَيلى</p>
          {p.under === 'sounds' && <p className="under-preview__sounds">amurru ʿala d-diyāri diyāri laylā</p>}
          {p.under !== 'nothing' && <p className="under-preview__en">I pass by the dwellings, Layla’s dwellings,</p>}
        </div>
        <p className="t-eyebrow">SHOW UNDER THE ARABIC</p>
        <Segmented label="Show under the Arabic" value={p.under} onChange={(under) => set.mutate({ under })} options={[{ value: 'english', label: 'ENGLISH' }, { value: 'sounds', label: 'SOUNDS' }, { value: 'nothing', label: 'NOTHING' }]} />
        <div className="card row between" style={{ padding: 14, gap: 14 }}>
          <div><p className="group-row__title">Tap a word for its meaning</p><p className="group-row__sub">Shows the root and a short gloss</p></div>
          <Switch label="Tap a word for its meaning" on={p.tapWord} onChange={(tapWord) => set.mutate({ tapWord })} />
        </div>
      </div>
    </div>
  );
}

export { Link };

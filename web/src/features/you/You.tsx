// Area 12 · You (12.1–12.8).
import { useState, type ComponentType } from 'react';
import { Link, useLocation } from 'wouter';
import { api } from '@core/api';
import { qk, useAccount, useFeelings, useInvalidate, usePrefs, useSetPrefs } from '@core/hooks';
import { isAvailable } from '@core/sources';
import { FEMALE_VOICES, MALE_VOICES } from '@core/voices';
import { GroupCard, Header, Segmented, Sheet, Skeleton, Switch, TitleRow } from '@ds/primitives';
import { Mark, Play } from '@ds/icons';
import { RowLink } from '@components/index';
import { useOverlay } from '@components/overlays';

function AccountCard({ onDelete }: { onDelete: () => void }) {
  const acc = useAccount().data;
  const inv = useInvalidate();
  const open = useOverlay((s) => s.open);
  if (!acc) return <Skeleton lines={2} />;
  if (!acc.signedIn) return <GroupCard><button className="group-row" onClick={() => open({ type: 'signin' })}><div className="group-row__main"><p className="group-row__title">Sign in</p><p className="group-row__sub">Apple or Google · keeps your diwan on every device</p></div></button></GroupCard>;
  return (
    <GroupCard>
      <div className="group-row"><div className="group-row__main"><p className="group-row__title">Signed in with {acc.provider === 'google' ? 'Google' : 'Apple'}</p><p className="group-row__sub">Your diwan is kept on every device</p></div></div>
      <button className="group-row group-row--danger" onClick={async () => { await api.profile.signOut(); inv(qk.account); }}><div className="group-row__main"><p className="group-row__title">Sign out</p></div></button>
      <button className="group-row group-row--danger" onClick={onDelete}><div className="group-row__main"><p className="group-row__title">Delete account</p></div></button>
    </GroupCard>
  );
}

export function YouHub() {
  const p = usePrefs().data;
  const [deleting, setDeleting] = useState(false);
  const guide = isAvailable('profile', 'journey');
  const fontName = { amiri: 'Amiri', naskh: 'Naskh', scheherazade: 'Scheherazade' };
  return (
    <div className="screen">
      <header className="row" style={{ justifyContent: 'center', height: 60, paddingTop: 16 }}><Mark size={23} colour="var(--c-accent)" /></header>
      <main className="pad stack gap-4">
        {guide && (
          <>
            <p className="t-eyebrow t-eyebrow--accent mt-8">YOUR GUIDE</p>
            <GroupCard>
              <RowLink href="/you/moves" title="What moves you" sub={p?.feelings.length ? p.feelings.join(', ') : 'Nothing picked yet'} />
              <RowLink href="/you/guide" title="How the guide chooses" sub={p ? `${p.classicalModern < 0.5 ? 'Mostly classical' : 'Mostly modern'} · ${p.difficulty === 'any' ? 'any difficulty' : p.difficulty}` : ''} />
            </GroupCard>
            <p className="t-eyebrow t-eyebrow--accent mt-8">LISTENING</p>
            <GroupCard><RowLink href="/you/reciter" title="Reciter" sub={p?.voice ?? ''} /></GroupCard>
          </>
        )}
        <p className="t-eyebrow t-eyebrow--accent mt-8">READING</p>
        <GroupCard>
          <RowLink href="/you/appearance" title="Appearance" sub={p ? `${p.page[0].toUpperCase()}${p.page.slice(1)} · ${fontName[p.font]} · Size ${p.textSize} · Vowel marks ${p.vowelMarks ? 'on' : 'off'}` : ''} />
          {guide && <RowLink href="/you/translation" title="Translation and sounds" sub={p ? `Under the Arabic: ${p.under}` : ''} />}
        </GroupCard>
        <p className="t-eyebrow t-eyebrow--accent mt-8">ACCOUNT</p>
        <AccountCard onDelete={() => setDeleting(true)} />
        {!guide && <p className="t-note mt-12">Your voice is the last one you picked while listening. The guide’s settings arrive with the guide.</p>}
      </main>
      {deleting && <DeleteAccount onClose={() => setDeleting(false)} />}
    </div>
  );
}

/** 12.8 Delete account: confirm. */
function DeleteAccount({ onClose }: { onClose: () => void }) {
  const inv = useInvalidate();
  const showToast = useOverlay((s) => s.showToast);
  return (
    <Sheet label="Delete account" onClose={onClose}>
      <div className="stack gap-12" style={{ alignItems: 'center', textAlign: 'center' }}>
        <h2 className="t-title" style={{ fontSize: 26 }}>Delete your account?</h2>
        <p className="t-body">This erases your kept poems, lists, the poets you follow, your reading history and your settings, on every device. It can’t be undone.</p>
        <p className="t-note">Shared images and links you sent stay with the people who have them.</p>
      </div>
      <button className="btn btn--danger btn--block" onClick={async () => { await api.profile.signOut(); localStorage.clear(); inv(qk.account, qk.keeps, qk.lists); onClose(); showToast({ text: 'Your account was deleted.' }); }}>DELETE ACCOUNT</button>
      <button className="btn btn--ghost btn--block" onClick={onClose}>KEEP MY ACCOUNT</button>
    </Sheet>
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
          <input className="slider" type="range" min={0} max={1} step={0.1} value={p.classicalModern} aria-label="Classical or modern" onChange={(e) => set.mutate({ classicalModern: Number(e.target.value) })} />
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
  const [silent, setSilent] = useState(true);
  const [pause, setPause] = useState(false);
  if (!p) return null;
  const group = (title: string, list: typeof FEMALE_VOICES) => (
    <>
      <p className="t-eyebrow">{title}</p>
      <GroupCard>
        {list.map((v) => (
          <button key={v.name} role="radio" aria-checked={p.voice === v.name} className="group-row" onClick={() => set.mutate({ voice: v.name })}>
            <span className="icon-btn" style={{ width: 32, height: 32, border: '1px solid var(--c-accent-deep)' }} aria-hidden><Play size={12} /></span>
            <div className="group-row__main"><p className="group-row__title">{v.name} <span className="group-row__sub">{v.descriptor}</span></p></div>
            {p.voice === v.name && <span className="t-eyebrow t-eyebrow--accent">✓</span>}
          </button>
        ))}
      </GroupCard>
    </>
  );
  return (
    <div className="screen">
      <Header onBack={() => nav('/you')} label="Back to You" />
      <TitleRow en="Reciter" ar="القارئ" />
      <div className="pad stack gap-8 mt-12">
        {group('FEMALE · 8', FEMALE_VOICES)}
        {group('MALE · 8', MALE_VOICES)}
        <div className="card stack" style={{ padding: 14, gap: 12 }}>
          <div className="row between"><p className="group-row__title">Play through silent mode</p><Switch label="Play through silent mode" on={silent} onChange={setSilent} /></div>
          <div className="row between"><div><p className="group-row__title">Pause between lines</p><p className="group-row__sub">A breath after each bayt</p></div><Switch label="Pause between lines" on={pause} onChange={setPause} /></div>
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

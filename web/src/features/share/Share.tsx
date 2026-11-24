// Area 7 · Share (7.1–7.15): cards on 4 grounds, chosen lines, dedication, Copy text.
import { useMemo, useState } from 'react';
import { api } from '@core/api';
import { usePoem } from '@core/hooks';
import { splitForCards } from '@core/logic/cards';
import { Segmented, Sheet, Skeleton } from '@ds/primitives';
import { Copy, Link as LinkIcon, Mark } from '@ds/icons';
import { useOverlay } from '@components/overlays';
import './share.css';

const GROUNDS = [
  { key: 'midnight', bg: '#0A0A0D', ink: '#F2EEE6', accent: '#D4B36A' },
  { key: 'parchment', bg: '#EFE6D2', ink: '#2A2216', accent: '#6E4F14' },
  { key: 'cobalt', bg: '#22406E', ink: '#EDE3CF', accent: '#E8CC8A' },
  { key: 'verdigris', bg: '#2F6B5A', ink: '#EDE3CF', accent: '#E8CC8A' },
] as const;

export function ShareSheet({ poemId }: { poemId: string }) {
  const poem = usePoem(poemId).data;
  const { close, showToast } = useOverlay();
  const [ground, setGround] = useState<(typeof GROUNDS)[number]['key']>('midnight');
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [chosen, setChosen] = useState<number[] | null>(null);
  const [dedication, setDedication] = useState('');
  const [card, setCard] = useState(0);
  const lines = useMemo(() => chosen ?? poem?.lines.map((_, i) => i) ?? [], [chosen, poem]);
  const split = splitForCards(lines.length);
  const cardLines = (i: number) => {
    const start = split.slice(0, i).reduce((a, b) => a + b, 0);
    return lines.slice(start, start + split[i]);
  };
  if (!poem) return <Sheet label="Share" onClose={close}><Skeleton /></Sheet>;
  const g = GROUNDS.find((x) => x.key === ground)!;
  const copy = async (text: string, msg: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* clipboard may be blocked */ }
    showToast({ text: msg });
  };
  const toggle = (i: number) => {
    const base = chosen ?? [];
    setChosen(base.includes(i) ? base.filter((x) => x !== i) : [...base, i].sort((a, b) => a - b));
    setCard(0);
  };
  const shown = cardLines(Math.min(card, split.length - 1));
  return (
    <Sheet label="Share" onClose={close}>
      <div className="sheet__head"><span className="t-eyebrow t-eyebrow--accent">SHARE</span><button className="link-btn" onClick={close}>DONE</button></div>
      <div className="share-card" style={{ background: g.bg, color: g.ink }} data-testid="share-card">
        {dedication && <p className="share-card__ded" style={{ color: g.accent }}>For {dedication}</p>}
        <div className="stack gap-8" style={{ flex: 1, justifyContent: 'center' }}>
          {shown.map((i) => <p key={i} lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={lang === 'ar' ? 'share-card__ar' : 'share-card__en'}>{lang === 'ar' ? poem.lines[i].ar : poem.lines[i].en}</p>)}
        </div>
        <div className="row between share-card__foot" style={{ color: g.accent }}>
          <span><span lang="ar" className="ar">{poem.poetAr}</span> · {poem.poetEn.toUpperCase()}</span>
          <span className="row gap-4"><Mark size={16} colour={g.accent} />{split.length > 1 && `${card + 1} / ${split.length}`}</span>
        </div>
      </div>
      {split.length > 1 && (
        <div className="row gap-8" style={{ justifyContent: 'center' }}>
          {split.map((_, i) => <button key={i} className="chip chip--sm" aria-pressed={i === card} onClick={() => setCard(i)}>CARD {i + 1}</button>)}
        </div>
      )}
      <div role="radiogroup" aria-label="Ground" className="row gap-10" style={{ justifyContent: 'center' }}>
        {GROUNDS.map((x) => <button key={x.key} role="radio" aria-checked={x.key === ground} aria-label={x.key} className="swatch" style={{ background: x.bg, borderColor: x.key === ground ? 'var(--c-accent)' : 'var(--c-border-2)' }} onClick={() => setGround(x.key)} />)}
      </div>
      <Segmented label="Card language" value={lang} onChange={setLang} options={[{ value: 'ar', label: 'ARABIC' }, { value: 'en', label: 'ENGLISH' }]} />
      <p className="t-eyebrow">CHOOSE LINES · {lines.length} OF {poem.lines.length}</p>
      <div className="stack gap-4">
        {poem.lines.map((l, i) => (
          <button key={i} role="checkbox" aria-checked={lines.includes(i)} className="pick-line" onClick={() => toggle(i)}>
            <span className={`check${lines.includes(i) ? ' check--on' : ''}`} /><span lang="ar" className="ar pick-line__ar">{l.ar}</span>
          </button>
        ))}
      </div>
      <input className="text-in" aria-label="Dedication" placeholder="Dedicate it (optional)" value={dedication} onChange={(e) => setDedication(e.target.value)} />
      <div className="row gap-8">
        <button className="btn btn--block" onClick={() => copy(api.share.link(poem), 'Link copied')}><LinkIcon /> Copy link</button>
        <button className="btn btn--block" onClick={() => copy(lines.map((i) => `${poem.lines[i].ar}\n${poem.lines[i].en}`).join('\n\n') + `\n\n${poem.poetEn} · ${api.share.link(poem)}`, 'Text copied')}><Copy /> Copy text</button>
      </div>
      <button className="btn btn--primary btn--block" onClick={() => showToast({ text: split.length > 1 ? `${split.length} images saved` : 'Image saved' })}>Save {split.length > 1 ? `${split.length} images` : 'image'}</button>
    </Sheet>
  );
}

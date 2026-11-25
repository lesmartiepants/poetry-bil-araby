// Area 7 · Share (7.1–7.15): a full-screen card maker over the poem. The card is
// drawn by core/logic/shareCard (the server renders the same SVG for saved images).
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@core/api';
import { usePoem, usePrefs } from '@core/hooks';
import { cardSvg, cardsFor, COLOURWAYS, RECIPIENTS, type CardSpec } from '@core/logic/shareCard';
import { Segmented, Sheet, Skeleton } from '@ds/primitives';
import { Back, Check, Copy, Link as LinkIcon, Share as SendIcon } from '@ds/icons';
import { useOverlay } from '@components/overlays';
import './share.css';

/** Types out who the poem might go to, one after another (ShTo); still for reduced motion. */
function useRecipient(on: boolean) {
  const [shown, setShown] = useState(RECIPIENTS[0]);
  useEffect(() => {
    if (!on || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let i = 0;
    let len = RECIPIENTS[0].length;
    let deleting = false;
    let hold = 18;
    const t = window.setInterval(() => {
      const word = RECIPIENTS[i];
      if (hold > 0) { hold -= 1; return; }
      if (!deleting) {
        len += 1;
        if (len >= word.length) { len = word.length; deleting = true; hold = 22; }
      } else {
        len -= 1;
        if (len <= 3) { i = (i + 1) % RECIPIENTS.length; deleting = false; len = 3; }
      }
      setShown(RECIPIENTS[i].slice(0, len));
    }, 70);
    return () => window.clearInterval(t);
  }, [on]);
  return shown;
}

/** A colour as the frames draw it: a small arch of the card's colours. */
function Swatch({ cw }: { cw: (typeof COLOURWAYS)[number] }) {
  return (
    <svg width="40" height="50" viewBox="0 0 56 72" aria-hidden>
      <path d="M2 70V30Q2 14 28 2q26 12 26 28v40z" fill={cw.bg} stroke={cw.key === 'obsidian' ? cw.title : '#3A352C'} strokeWidth="1.6" />
      <path d="M16 34h24M12 41h32" stroke={cw.ink} strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
      <path d="M19 48h18" stroke={cw.title} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="28" cy="57" r="3" fill={cw.title} />
    </svg>
  );
}

export function ShareScreen({ poemId }: { poemId: string }) {
  const poem = usePoem(poemId).data;
  const prefs = usePrefs().data;
  const { close, showToast } = useOverlay();
  const [colourway, setColourway] = useState('obsidian');
  const [showEn, setShowEn] = useState<boolean | null>(null);
  const [chosen, setChosen] = useState<number[] | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [dedication, setDedication] = useState('');
  const [editing, setEditing] = useState(false);
  const [card, setCard] = useState(0);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const recipient = useRecipient(!editing && !dedication);
  const row = useRef<HTMLDivElement>(null);
  const en = showEn ?? prefs?.under === 'english';
  const all = useMemo(() => poem?.lines.map((_, i) => i) ?? [], [poem]);
  const lines = chosen ?? all;
  const pages = cardsFor(lines);
  if (!poem) return <div className="share-screen"><div className="pad" style={{ paddingTop: 120 }}><Skeleton lines={6} /></div></div>;

  const link = api.share.link(poem);
  const spec = (i: number): CardSpec => ({
    titleAr: poem.titleAr, titleEn: poem.titleEn, poetAr: poem.poetAr, poetEn: poem.poetEn,
    lines: pages[i].map((x) => poem.lines[x]), showEn: en, colourway, dedication: dedication.trim() || undefined,
    card: { index: i, of: pages.length },
  });
  const cw = COLOURWAYS.find((c) => c.key === colourway)!;
  const urls = pages.map((_, i) => api.share.cardUrl({
    poemId: poem.id, lines: chosen ?? undefined, en, colourway, dedication: dedication.trim() || undefined, card: i, link: link.replace(/^https?:\/\//, ''),
  }));
  const images = async () => {
    if (urls.some((u) => !u)) return null;
    const blobs = await Promise.all(urls.map(async (u) => { const r = await fetch(u!); if (!r.ok) throw new Error(String(r.status)); return r.blob(); }));
    return blobs.map((b, i) => new File([b], `${poem.slug}${pages.length > 1 ? `-${i + 1}` : ''}.png`, { type: 'image/png' }));
  };
  const copy = async (text: string, msg: string) => {
    setMenu(false);
    try { await navigator.clipboard.writeText(text); showToast({ text: msg }); } catch { showToast({ text: 'Couldn’t copy. Try again.', alert: true }); }
  };
  const save = async () => {
    setBusy(true);
    try {
      const files = await images();
      if (!files) { showToast({ text: pages.length > 1 ? `${pages.length} images saved` : 'Image saved' }); return; }
      for (const f of files) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(f);
        a.download = f.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
      showToast({ text: files.length > 1 ? `${files.length} images saved` : 'Image saved' });
    } catch {
      showToast({ text: 'The image didn’t save. Try again.', alert: true, action: 'RETRY', onAction: save });
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    setBusy(true);
    const text = `${poem.titleEn} · ${poem.poetEn}`;
    try {
      const files = await images().catch(() => null);
      if (files && navigator.canShare?.({ files })) await navigator.share({ files, text, url: link });
      else if (navigator.share) await navigator.share({ title: text, url: link });
      else await copy(link, 'Link copied');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') showToast({ text: 'Sharing didn’t open. The link is copied instead.' });
    } finally {
      setBusy(false);
    }
  };
  const toggleLine = (i: number) => {
    const base = chosen ?? all;
    const next = base.includes(i) ? base.filter((x) => x !== i) : [...base, i].sort((a, b) => a - b);
    setChosen(next.length ? next : null);
    setCard(0);
  };
  const plainText = lines.map((i) => `${poem.lines[i].ar}\n${poem.lines[i].en}`).join('\n\n') + `\n\n${poem.titleEn} · ${poem.poetEn}\n${link}`;

  return (
    <div className="share-screen" role="dialog" aria-label="Share">
      <header className="share__top"><button className="icon-btn" aria-label="Back to the poem" onClick={close}><Back /></button></header>
      <div className="share__title"><h1 className="t-title">Share</h1><span lang="ar" className="t-title-ar">شارِك</span></div>
      {editing ? (
        <>
          <label className="share__to share__to--edit">
            <span>Send this poem to</span>
            <input autoFocus aria-label="Dedication" maxLength={40} value={dedication} onChange={(e) => setDedication(e.target.value)}
              onBlur={() => setEditing(false)} onKeyDown={(e) => e.key === 'Enter' && setEditing(false)} />
          </label>
          <p className="share__help">Adds a dedication to the card. Write it in Arabic or English.</p>
        </>
      ) : (
        <button className="share__to" onClick={() => setEditing(true)} aria-label={dedication ? `Dedicated to ${dedication}. Change` : 'Add a dedication'}>
          <span>Send this poem</span><span className="share__who">{dedication ? `to ${dedication}` : recipient}</span><span className="share__caret" aria-hidden />
        </button>
      )}

      <div ref={row} className={`share__cards${pages.length > 1 ? ' share__cards--many' : ''}`} data-testid="share-card"
        onScroll={(e) => setCard(Math.round(e.currentTarget.scrollLeft / (316 + 12)))}>
        {/* cardSvg escapes every text it draws (the dedication included). */}
        {pages.map((_, i) => (
          <div key={i} className="share__card" dangerouslySetInnerHTML={{ __html: cardSvg(spec(i), { width: pages.length > 1 ? 316 : 340 }) }} />
        ))}
      </div>
      {pages.length > 1 && <p className="share__count">CARD {card + 1} OF {pages.length}</p>}

      <div className="share__controls">
        <div className="share__tabs">
          <Segmented pill label="Lines" value={chosen ? 'choose' : 'whole'} onChange={(v) => (v === 'whole' ? (setChosen(null), setCard(0)) : setChoosing(true))}
            options={[{ value: 'whole', label: `WHOLE POEM · ${poem.lines.length}` }, { value: 'choose', label: chosen ? `CHOSEN · ${chosen.length}` : 'CHOOSE LINES' }]} />
        </div>
        <div role="radiogroup" aria-label="Card colours" className="share__swatches">
          {COLOURWAYS.map((c) => (
            <button key={c.key} role="radio" aria-checked={c.key === colourway} aria-label={c.name} className="share__swatch" onClick={() => setColourway(c.key)}>
              <Swatch cw={c} /><span className="share__swatch-bar" />
            </button>
          ))}
        </div>
        <p className="share__cw">{cw.name.toUpperCase()}</p>
      </div>

      <nav aria-label="Share actions" className="share__dock">
        <button className="share__round" aria-pressed={en} aria-label={en ? 'Hide English' : 'Show English'} onClick={() => setShowEn(!en)}><span className="share__en">En</span></button>
        <button className="share__round" aria-label={pages.length > 1 ? `Save ${pages.length} images` : 'Save image'} disabled={busy} onClick={save}><SaveIcon /></button>
        <button className="share__send" disabled={busy} onClick={send}><SendIcon size={18} /> SEND</button>
        <div className="share__more">
          <button className="share__round" aria-label="Copy" aria-expanded={menu} onClick={() => setMenu(!menu)}><LinkIcon /></button>
          {menu && (
            <div className="share__menu" role="menu">
              <button role="menuitem" onClick={() => copy(link, 'Link copied')}><LinkIcon size={16} /> Copy link</button>
              <button role="menuitem" onClick={() => copy(plainText, 'Text copied')}><Copy size={16} /> Copy text</button>
            </div>
          )}
        </div>
      </nav>

      {choosing && (
        <Sheet label="Choose lines" onClose={() => setChoosing(false)} height={560}>
          <div className="sheet__head">
            <div><h2 className="share__choose-title">Choose lines</h2><p className="t-count">{lines.length} OF {poem.lines.length} · {pages.length} {pages.length === 1 ? 'CARD' : 'CARDS'}</p></div>
            <button className="link-btn" onClick={() => setChoosing(false)}>DONE</button>
          </div>
          <div className="share__pick">
            {poem.lines.map((l, i) => (
              <button key={i} role="checkbox" aria-checked={lines.includes(i)} className="pick-line" onClick={() => toggleLine(i)}>
                <span className={`pick-line__box${lines.includes(i) ? ' is-on' : ''}`}>{lines.includes(i) && <Check size={14} />}</span>
                <span className="pick-line__text"><span lang="ar" dir="rtl" className="pick-line__ar">{l.ar}</span>{en && <span className="pick-line__en">{l.en}</span>}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

const SaveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 4v11M7 10l5 5 5-5M5 19h14" />
  </svg>
);

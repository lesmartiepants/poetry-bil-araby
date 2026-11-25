// Area 11 · Search (11.1–11.3).
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useSearch } from '@core/hooks';
import { readJSON, writeJSON } from '@core/storage';
import { Skeleton } from '@ds/primitives';
import { Chevron, Clock, Close, Search as SearchIcon } from '@ds/icons';
import { BrandLogo, collectionArt, PoemRow, PoetRow } from '@components/index';
import { matchRange } from '@core/logic/arabic';
import { Pattern } from '@ds/Pattern';
import './search.css';

type Kind = 'all' | 'poets' | 'poems' | 'lines' | 'collections';
const KINDS: [Kind, string][] = [['all', 'ALL'], ['poets', 'POETS'], ['poems', 'POEMS'], ['lines', 'LINES'], ['collections', 'COLLECTIONS']];

const Section = ({ label, n }: { label: string; n: number }) => (
  <p className="t-eyebrow t-eyebrow--accent search-section"><span>{label}</span><span className="search-section__n">{n}</span></p>
);

/** The matched part of a line, found the way search finds it (vowel marks ignored). */
function Marked({ text, q }: { text: string; q: string }) {
  const at = matchRange(text, q);
  if (!at) return <>{text}</>;
  return <>{text.slice(0, at[0])}<mark className="hit">{text.slice(at[0], at[1])}</mark>{text.slice(at[1])}</>;
}

export function SearchScreen() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [recents, setRecents] = useState<string[]>(() => readJSON('search.recents', []));
  const [, nav] = useLocation();
  const input = useRef<HTMLInputElement>(null);
  const r = useSearch(debounced);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q), 250);
    return () => window.clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (r.data && debounced.trim().length > 1) {
      const next = [debounced.trim(), ...recents.filter((x) => x !== debounced.trim())].slice(0, 6);
      setRecents(next);
      writeJSON('search.recents', next);
    }
  }, [r.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const d = r.data;
  const [kind, setKind] = useState<Kind>('all');
  const total = d ? d.poets.length + d.poems.length + d.lines.length + d.collections.length : 0;
  const show = (k: Exclude<Kind, 'all'>) => !!d && d[k].length > 0 && (kind === 'all' || kind === k);
  const forget = (x: string) => { const next = recents.filter((y) => y !== x); setRecents(next); writeJSON('search.recents', next); };
  const arabic = (x: string) => /[\u0600-\u06FF]/.test(x);
  const close = () => (history.length > 1 ? history.back() : nav('/explore'));
  return (
    <div className="screen">
      <header className="hub-hdr"><BrandLogo /></header>
      <main className="pad stack gap-14" style={{ paddingTop: 14 }}>
        <div className="row gap-10">
          <label className="search-field">
            <SearchIcon size={18} />
            <input ref={input} autoFocus aria-label="Search poets, poems and lines" placeholder="Poems, poets, lines, collections" value={q} onChange={(e) => setQ(e.target.value)} />
            {q && <button className="search-field__clear" aria-label="Clear" onClick={() => { setQ(''); input.current?.focus(); }}><Close size={12} /></button>}
          </label>
          <button className="search-cancel" onClick={close}>CANCEL</button>
        </div>
        {!debounced.trim() && (
          <>
            {recents.length > 0 && (
              <>
                <p className="t-eyebrow">RECENT</p>
                <div>
                  {recents.map((x) => (
                    <div key={x} className="recent">
                      <button className="recent__q" onClick={() => setQ(x)}><Clock /><span lang={arabic(x) ? 'ar' : undefined} className={arabic(x) ? 'recent__ar' : ''}>{x}</span></button>
                      <button className="recent__x" aria-label={`Forget ${x}`} onClick={() => forget(x)}><Close size={14} /></button>
                    </div>
                  ))}
                </div>
              </>
            )}
            <p className="t-eyebrow">TRY</p>
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              <button className="try" onClick={() => setQ('قمر')}>a word: <span lang="ar" className="try__ar">قمر</span></button>
              <button className="try" onClick={() => setQ('Wallada')}>a poet: Wallada</button>
              <button className="try" onClick={() => input.current?.focus()}>a line you half remember</button>
            </div>
          </>
        )}
        {r.isFetching && <Skeleton lines={4} />}
        {d && !d.nearest && (
          <>
            <div role="radiogroup" aria-label="Show" className="search-kinds">
              {KINDS.map(([k, label]) => {
                const n = k === 'all' ? total : d[k].length;
                if (k !== 'all' && !n) return null;
                return <button key={k} role="radio" aria-checked={kind === k} className="chip chip--sm" onClick={() => setKind(k)}>{k === 'all' ? `ALL · ${n}` : label}</button>;
              })}
            </div>
            {show('poets') && <><Section label="POETS" n={d.poets.length} /><div className="list">{d.poets.map((p) => <PoetRow key={p.slug} poet={p} />)}</div></>}
            {show('poems') && <><Section label="POEMS" n={d.poems.length} /><div className="list">{d.poems.map((p) => <PoemRow key={p.id} poem={p} />)}</div></>}
            {show('lines') && <><Section label="LINES" n={d.lines.length} /><div className="stack gap-8">{d.lines.map((l) => (
              <Link key={`${l.poem.id}-${l.lineIndex}`} href={`/p/${l.poem.slug}`} className="line-hit">
                <span lang="ar" dir="rtl" className="line-hit__ar"><Marked text={l.line} q={debounced} /></span>
                <span className="line-hit__sub">{l.poem.poetEn} · {l.poem.titleEn}</span>
              </Link>
            ))}</div></>}
            {show('collections') && <><Section label="COLLECTIONS" n={d.collections.length} /><div className="list">{d.collections.map((c) => (
              <Link key={c.slug} href={`/collection/${c.slug}`} className="coll-hit">
                <span className="coll-hit__art panel" style={{ background: c.colour }}><Pattern {...collectionArt(c)} scale={0.4} /></span>
                <span className="coll-hit__text"><span className="coll-hit__title">{c.titleEn}</span><span className="coll-hit__sub">{c.poemIds.length} poems{c.subtitle ? ` · ${c.subtitle}` : ''}</span></span>
                <Chevron size={16} />
              </Link>
            ))}</div></>}
          </>
        )}
        {d?.nearest && (
          <div role="status">
            <div className="nothing">
              <p className="nothing__title">Nothing for “{debounced}”</p>
              <p className="nothing__sub">Closest matches:</p>
            </div>
            <div className="nearest">
              {/* The three closest, as in 11.3: two poets and a feeling when both are near. */}
              {d.nearest.poets.slice(0, d.nearest.feelings.length ? 2 : 3).map((p) => (
                <Link key={p.slug} href={`/poet/${p.slug}`} className="nearest__row">
                  <span className="nearest__main"><span className="nearest__name">{p.nameEn}</span><span className="nearest__sub">Poet · {p.years} · {p.poemCount} poems</span></span>
                  <span lang="ar" className="nearest__ar">{p.nameAr}</span><Chevron />
                </Link>
              ))}
              {d.nearest.feelings.slice(0, d.nearest.poets.length ? 1 : 3).map((f) => (
                <Link key={f.key} href={`/explore/feeling/${f.key}`} className="nearest__row">
                  <span className="nearest__main"><span className="nearest__name">{f.en}</span><span className="nearest__sub">Feeling · {f.poemCount} poems</span></span>
                  <span lang="ar" className="nearest__ar">{f.ar}</span><Chevron />
                </Link>
              ))}
            </div>
            <p className="nothing__hint">Try a poet, a feeling, or a line in Arabic or English.</p>
          </div>
        )}
      </main>
    </div>
  );
}

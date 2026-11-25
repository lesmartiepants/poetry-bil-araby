// Area 11 · Search (11.1–11.3).
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useSearch } from '@core/hooks';
import { readJSON, writeJSON } from '@core/storage';
import { Skeleton } from '@ds/primitives';
import { Chevron, Clock, Close, Search as SearchIcon } from '@ds/icons';
import { BrandLogo, CollectionCard, PoemRow, PoetRow } from '@components/index';
import './search.css';

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
            {d.poets.length > 0 && <><p className="t-eyebrow t-eyebrow--accent">POETS</p><div className="list">{d.poets.map((p) => <PoetRow key={p.slug} poet={p} />)}</div></>}
            {d.poems.length > 0 && <><p className="t-eyebrow t-eyebrow--accent">POEMS</p><div className="list">{d.poems.map((p) => <PoemRow key={p.id} poem={p} />)}</div></>}
            {d.lines.length > 0 && <><p className="t-eyebrow t-eyebrow--accent">LINES</p><div className="list">{d.lines.map((l) => (
              <Link key={`${l.poem.id}-${l.lineIndex}`} href={`/p/${l.poem.slug}`} className="list-row"><span className="list-row__main"><span lang="ar" className="ar" style={{ fontSize: 18, display: 'block', textAlign: 'right' }}>{l.line}</span><span className="list-row__sub">{l.poem.titleEn} · {l.poem.poetEn}</span></span></Link>
            ))}</div></>}
            {d.collections.length > 0 && <><p className="t-eyebrow t-eyebrow--accent">COLLECTIONS</p><div className="chips">{d.collections.map((c) => <CollectionCard key={c.slug} c={c} />)}</div></>}
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

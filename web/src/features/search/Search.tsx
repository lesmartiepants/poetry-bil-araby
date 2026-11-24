// Area 11 · Search (11.1–11.3).
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useSearch } from '@core/hooks';
import { readJSON, writeJSON } from '@core/storage';
import { Skeleton } from '@ds/primitives';
import { Search as SearchIcon } from '@ds/icons';
import { CollectionCard, PoemRow, PoetRow } from '@components/index';

export function SearchScreen() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [recents, setRecents] = useState<string[]>(() => readJSON('search.recents', []));
  const [, nav] = useLocation();
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
  return (
    <div className="screen">
      <div className="row gap-8" style={{ padding: '48px 16px 0' }}>
        <label className="search-bar"><SearchIcon /><input autoFocus aria-label="Search poets, poems and lines" placeholder="Poets, poems, a line you remember" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <button className="link-btn" onClick={() => (history.length > 1 ? history.back() : nav('/explore'))}>CANCEL</button>
      </div>
      <main className="pad stack gap-12 mt-16">
        {!debounced.trim() && (
          <>
            <p className="t-eyebrow">RECENT</p>
            <div className="chips">{recents.map((x) => <button key={x} className="chip" onClick={() => setQ(x)}>{x}</button>)}{!recents.length && <span className="t-note">Try “Layla”, “الديار” or “weep”.</span>}</div>
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
          <div className="stack gap-12" role="status">
            <h2 className="t-title" style={{ fontSize: 24 }}>Nothing for “{debounced}”</h2>
            <p className="t-eyebrow">CLOSEST MATCHES:</p>
            <div className="list">{d.nearest.poets.map((p) => <PoetRow key={p.slug} poet={p} />)}</div>
            <div className="chips">{d.nearest.feelings.map((f) => <Link key={f.key} href={`/explore/feeling/${f.key}`} className="chip">{f.en}<span lang="ar" className="ar">{f.ar}</span></Link>)}</div>
          </div>
        )}
      </main>
    </div>
  );
}

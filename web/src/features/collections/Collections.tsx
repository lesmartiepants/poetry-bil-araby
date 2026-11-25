// Area 10 · Collections (10.1–10.3).
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQueries } from '@tanstack/react-query';
import { api } from '@core/api';
import { useCollection, useCollections, useEras, useProgress, useSetProgress } from '@core/hooks';
import { Header, Skeleton, TitleRow } from '@ds/primitives';
import { Back, Bookmark, Search } from '@ds/icons';
import { Pattern } from '@ds/Pattern';
import { CollectionCard, collectionArt, PathDock } from '@components/index';
import './collections.css';

export function AllCollections() {
  const c = useCollections('collection').data;
  const prog = useProgress().data;
  const [, nav] = useLocation();
  const [only, setOnly] = useState<'all' | 'saved'>('all');
  const saved = (slug: string) => !!prog?.find((p) => p.slug === slug)?.saved;
  const savedCount = c?.filter((x) => saved(x.slug)).length ?? 0;
  const shown = c?.filter((x) => only === 'all' || saved(x.slug));
  return (
    <div className="screen">
      <Header onBack={() => nav('/explore')} right={<Link href="/search" className="icon-btn" aria-label="Search"><Search size={18} /></Link>} />
      <TitleRow en="Collections" ar="مجموعات" />
      <p className="pad colls__meta"><span>{c?.length ?? 0} COLLECTIONS</span><span>CURATED BY THE GUIDE</span></p>
      <div role="radiogroup" aria-label="Show" className="pad colls__filters">
        <button role="radio" aria-checked={only === 'all'} className="chip chip--sm" onClick={() => setOnly('all')}>ALL</button>
        <button role="radio" aria-checked={only === 'saved'} className="chip chip--sm" onClick={() => setOnly('saved')}>SAVED · {savedCount}</button>
      </div>
      <div className="pad colls__grid">
        {shown?.map((x) => <CollectionCard key={x.slug} c={x} saved={saved(x.slug)} />)}
      </div>
    </div>
  );
}

export function CollectionScreen({ slug }: { slug: string }) {
  const c = useCollection(slug);
  const [all, setAll] = useState(false);
  const progress = useProgress();
  const prog = progress.data?.find((p) => p.slug === slug);
  const saveProgress = useSetProgress();
  const eras = useEras().data;
  const [, nav] = useLocation();
  const poems = useQueries({ queries: (c.data?.poemIds ?? []).map((id) => ({ queryKey: ['poem', id], queryFn: () => api.poems.get(id) })) });
  if (c.isLoading) return <div className="screen pad" style={{ paddingTop: 120 }} aria-busy="true"><Skeleton lines={6} /></div>;
  if (!c.data) return null;
  const col = c.data;
  const of = col.poemIds.length;
  const pos = Math.min(prog?.position ?? 0, of);
  const saved = prog?.saved ?? false;
  const lines = poems.reduce((n, q) => n + (q.data?.lines.length ?? 0), 0);
  const href = (i: number) => `/p/${poems[i]?.data?.slug ?? col.poemIds[i]}?journey=${slug}&step=${i + 1}`;
  const save = () => saveProgress.mutate({ slug, position: pos, saved: !saved, completedAt: prog?.completedAt });
  const eraName = (key: string) => eras?.find((e) => e.slug === key)?.nameEn;
  // Long collections show five (or up to the next unread) and name the poets the rest reach (10.2).
  const shown = all ? of : Math.min(of, Math.max(5, pos + 1));
  const through = [...new Set(poems.slice(shown).map((q) => q.data?.poetEn).filter((x): x is string => !!x))].slice(-2);
  return (
    <div className="screen">
      <div className="coll-hero panel" style={{ background: col.colour }}>
        <Pattern {...collectionArt(col)} scrim={0.45} />
        <header className="coll-hero__bar">
          <button className="icon-btn" aria-label="Back" onClick={() => (history.length > 1 ? history.back() : nav('/explore'))}><Back /></button>
          <button className="icon-btn" disabled={progress.isPending || saveProgress.isPending} aria-pressed={saved} aria-label={saved ? 'Saved' : 'Save'} onClick={save}><Bookmark style={saved ? { fill: 'currentColor' } : undefined} /></button>
        </header>
        <div className="coll-hero__title">
          <p lang="ar" dir="rtl" className="coll-hero__ar">{col.titleAr}</p>
          <p className="coll-hero__en">{col.titleEn}</p>
        </div>
      </div>
      <main className="coll-body">
        {saveProgress.isError && <p role="alert">Couldn’t update this collection. Try again.</p>}
        <p className="coll-body__intro">{col.intro}</p>
        <p className="t-count">{of} {of === 1 ? 'POEM' : 'POEMS'}{lines ? ` · ABOUT ${Math.max(1, Math.round(lines / 4))} MIN` : ''}</p>
        <div>
          {col.poemIds.slice(0, shown).map((id, i) => {
            const p = poems[i]?.data;
            return (
              <Link key={`${id}-${i}`} href={href(i)} className="coll-row">
                <span className="coll-row__num">{String(i + 1).padStart(2, '0')}</span>
                <span className="coll-row__main">
                  <span className="coll-row__title">{p?.titleEn ?? '…'}{i < pos ? ' · read' : ''}</span>
                  <span className="coll-row__sub">{[p?.poetEn, p && eraName(p.eraKey)].filter(Boolean).join(' · ')}</span>
                </span>
                {p && <span lang="ar" className="coll-row__ar">{p.poetAr}</span>}
              </Link>
            );
          })}
          {shown < of && (
            <button className="coll-more" onClick={() => setAll(true)}>
              and {of - shown} more{through.length ? `, through ${through.join(' and ')}` : ''}
            </button>
          )}
        </div>
      </main>
      <PathDock label={col.kind === 'journey' ? 'JOURNEY' : 'COLLECTION'} pos={pos} of={of} title={col.titleEn}
        next={pos < of ? { href: href(pos), label: `${col.stepEn.toUpperCase()} ${String(pos + 1).padStart(2, '0')}` } : undefined} />
    </div>
  );
}

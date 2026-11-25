// Area 10 · Collections (10.1–10.3).
import { Link, useLocation } from 'wouter';
import { useQueries } from '@tanstack/react-query';
import { api } from '@core/api';
import { useCollection, useCollections, useEras, useProgress, useSetProgress } from '@core/hooks';
import { Header, Skeleton, TitleRow } from '@ds/primitives';
import { Back, Bookmark } from '@ds/icons';
import { Pattern } from '@ds/Pattern';
import { CollectionCard, collectionArt, PathDock } from '@components/index';
import './collections.css';

export function AllCollections() {
  const c = useCollections('collection').data;
  const [, nav] = useLocation();
  return (
    <div className="screen">
      <Header onBack={() => nav('/explore')} />
      <TitleRow en="Collections" ar="مختارات" />
      <div className="pad mt-12" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {c?.map((x) => <CollectionCard key={x.slug} c={x} />)}
      </div>
    </div>
  );
}

export function CollectionScreen({ slug }: { slug: string }) {
  const c = useCollection(slug);
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
          {col.poemIds.map((id, i) => {
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
        </div>
      </main>
      <PathDock label={col.kind === 'journey' ? 'JOURNEY' : 'COLLECTION'} pos={pos} of={of} title={col.titleEn}
        next={pos < of ? { href: href(pos), label: `${col.stepEn.toUpperCase()} ${String(pos + 1).padStart(2, '0')}` } : undefined} />
    </div>
  );
}

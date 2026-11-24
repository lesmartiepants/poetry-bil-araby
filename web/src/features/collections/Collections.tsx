// Area 10 · Collections (10.1–10.3).
import { Link, useLocation } from 'wouter';
import { useQueries } from '@tanstack/react-query';
import { api } from '@core/api';
import { useCollection, useCollections, useInvalidate, useProgress } from '@core/hooks';
import { Header, Skeleton, TitleRow } from '@ds/primitives';
import { CollectionCard, PoemRow, ProgressBar } from '@components/index';

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
  const prog = useProgress().data?.find((p) => p.slug === slug);
  const inv = useInvalidate();
  const [, nav] = useLocation();
  const poems = useQueries({ queries: (c.data?.poemIds ?? []).map((id) => ({ queryKey: ['poem', id], queryFn: () => api.poems.get(id) })) });
  if (c.isLoading) return <div className="screen pad" style={{ paddingTop: 120 }} aria-busy="true"><Skeleton lines={6} /></div>;
  if (!c.data) return null;
  const done = prog?.position ?? 0;
  const next = c.data.poemIds[Math.min(done, c.data.poemIds.length - 1)];
  const save = async () => { await api.collections.setProgress({ slug, position: done, saved: !prog?.saved }); inv(['progress']); };
  return (
    <div className="screen">
      <Header onBack={() => (history.length > 1 ? history.back() : nav('/explore'))} right={<button className="link-btn" style={{ marginRight: 12 }} onClick={save}>{prog?.saved ? 'SAVED' : 'SAVE'}</button>} />
      <div className="pad stack gap-12">
        <div className="coll-cover" style={{ background: c.data.colour }}>
          <span lang="ar" className="coll-card__ar" style={{ fontSize: 30 }}>{c.data.titleAr}</span>
          <span className="coll-card__en" style={{ fontSize: 24 }}>{c.data.titleEn}</span>
        </div>
        <p className="t-lede">{c.data.intro}</p>
        <ProgressBar done={done} of={c.data.poemIds.length} label={`${c.data.titleEn} progress`} />
        {next && <Link href={`/p/${next}`} className="btn btn--primary btn--block" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>CONTINUE</Link>}
        <div className="list">
          {poems.map((q, i) => q.data && <PoemRow key={`${q.data.id}-${i}`} poem={q.data} badge={`${c.data!.stepEn.toUpperCase()} ${i + 1}`} />)}
        </div>
      </div>
    </div>
  );
}

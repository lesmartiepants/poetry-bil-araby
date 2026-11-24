// Area 5 · Poet pages (5.1–5.4).
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAppearsIn, useFollows, useInvalidate, usePoems, usePoet, useReads } from '@core/hooks';
import { api } from '@core/api';
import { isAvailable } from '@core/sources';
import { FullAreaError, Segmented, Skeleton } from '@ds/primitives';
import { Back, Bookmark } from '@ds/icons';
import { PoetAvatar } from '@components/index';
import './poet.css';

const REGION_PATTERN: Record<string, string> = { Najd: 'khatam', Hijaz: 'khatam', Iraq: 'seljuk', Levant: 'mamluk', Andalusia: 'laceria' };

export function PoetScreen({ slug, tab: initialTab }: { slug: string; tab: 'poems' | 'about' }) {
  const poetQ = usePoet(slug);
  const poems = usePoems({ poet: slug }).data;
  const appears = useAppearsIn(slug).data;
  const follows = useFollows().data;
  const reads = useReads().data;
  const inv = useInvalidate();
  const [, nav] = useLocation();
  const [tab, setTab] = useState(initialTab);
  const [folded, setFolded] = useState(false);
  useEffect(() => {
    const on = () => setFolded(window.scrollY > 120);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  if (poetQ.isLoading) return <div className="screen pad" style={{ paddingTop: 120 }}><Skeleton lines={6} /></div>;
  if (!poetQ.data) return <div className="screen"><FullAreaError title="This poet didn’t open" body="Try again in a moment." action="Back to Explore" onAction={() => nav('/explore')} /></div>;
  const p = poetQ.data;
  const following = follows?.includes(p.slug) ?? false;
  const canFollow = isAvailable('library');
  const toggleFollow = async () => { await api.library.follow(p.slug, !following); inv(['follows']); };
  return (
    <div className="screen" data-pattern={REGION_PATTERN[p.region] ?? 'khatam'}>
      <div className={`poet-hero${folded ? ' poet-hero--folded' : ''}`}>
        <div className="row between" style={{ padding: '14px 12px 0' }}>
          <button className="icon-btn" aria-label="Back" onClick={() => (history.length > 1 ? history.back() : nav('/explore'))}><Back /></button>
          {canFollow ? <button className={`icon-btn${following ? '' : ' icon-btn--muted'}`} aria-pressed={following} aria-label={following ? 'Following' : 'Follow'} onClick={toggleFollow}><Bookmark /></button> : <span className="hdr__spacer" />}
        </div>
        <div className="poet-hero__body">
          <PoetAvatar initial={p.initial} eraKey={p.eraKey} size={folded ? 40 : 72} />
          <div className="stack">
            <h1 lang="ar" className="poet-hero__ar">{p.nameAr}</h1>
            <p className="poet-hero__en">{p.nameEn}</p>
            {!folded && <p className="t-count">{p.years.toUpperCase()} · {p.region.toUpperCase()} · {p.poemCount} POEMS</p>}
          </div>
        </div>
      </div>
      <div className="pad stack gap-12 mt-12">
        <Segmented label="Poet" value={tab} onChange={setTab} options={[{ value: 'poems', label: 'POEMS' }, { value: 'about', label: 'THE POET' }]} />
        {tab === 'poems' ? (
          <div className="list">
            {poems?.map((x, i) => (
              <Link key={x.id} href={`/p/${x.slug}`} className="list-row">
                <span className="poem-num">{i + 1}</span>
                <div className="list-row__main"><p lang="ar" className="poem-first">{x.firstLineAr}</p><p className="list-row__sub">{x.titleEn}{reads?.[x.id] ? ' · READ' : ''}</p></div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="stack gap-16">
            <p className="t-lede" style={{ fontSize: 19, lineHeight: 1.5 }}>{p.bio}</p>
            {isAvailable('collections') && appears && appears.length > 0 && (
              <div className="stack gap-8">
                <p className="t-eyebrow t-eyebrow--accent">FIND {p.nameEn.toUpperCase()} IN</p>
                {appears.map((c) => <Link key={c.slug} href={`/collection/${c.slug}`} className="group-row card"><span className="group-row__main"><span className="group-row__title">{c.titleEn}</span><span className="group-row__sub"> · {c.kind === 'journey' ? 'Journey' : 'Collection'}</span></span></Link>)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

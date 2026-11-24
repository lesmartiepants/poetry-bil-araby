// Area 5 · Poet pages (5.1–5.4).
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAppearsIn, useFollows, useInvalidate, useKeeps, usePoems, usePoet, useReads } from '@core/hooks';
import { api } from '@core/api';
import { isAvailable } from '@core/sources';
import { FullAreaError, Segmented, Skeleton } from '@ds/primitives';
import { Back, Bookmark, Chevron, Heart } from '@ds/icons';
import { Pattern, patternGround } from '@ds/Pattern';
import { collectionArt, poetArt } from '@components/index';
import './poet.css';

export function PoetScreen({ slug, tab: initialTab }: { slug: string; tab: 'poems' | 'about' }) {
  const poetQ = usePoet(slug);
  const poems = usePoems({ poet: slug }).data;
  const appears = useAppearsIn(slug).data;
  const follows = useFollows().data;
  const reads = useReads().data;
  const kept = new Set(useKeeps().data ?? []);
  const inv = useInvalidate();
  const [, nav] = useLocation();
  const [tab, setTab] = useState(initialTab);
  const [folded, setFolded] = useState(false);
  useEffect(() => {
    const on = () => setFolded(window.scrollY > 200);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  if (poetQ.isLoading) return <div className="screen pad" style={{ paddingTop: 120 }}><Skeleton lines={6} /></div>;
  if (!poetQ.data) return <div className="screen"><FullAreaError title="This poet didn’t open" body="Try again in a moment." action="Back to Explore" onAction={() => nav('/explore')} /></div>;
  const p = poetQ.data;
  const art = poetArt(p.region, p.eraKey);
  const following = follows?.includes(p.slug) ?? false;
  const canFollow = isAvailable('library');
  const toggleFollow = async () => { await api.library.follow(p.slug, !following); inv(['follows']); };
  const [lead, ...rest] = p.bio.split(/(?<=\.)\s+/);
  return (
    <div className="screen">
      <div className="poet-hero panel" style={{ background: patternGround(art.name, art.tone) }}>
        <Pattern {...art} scale={0.9} scrim={0.35} />
        <div className="poet-hero__text">
          <p className="poet-hero__meta">{[p.region, p.years, `${p.poemCount} poems`].filter(Boolean).join(' · ').toUpperCase()}</p>
          <h1 lang="ar" className="poet-hero__ar">{p.nameAr}</h1>
          <p className="poet-hero__en">{p.nameEn.toUpperCase()}</p>
        </div>
      </div>
      <header className={`poet-bar${folded ? ' poet-bar--folded panel' : ''}`} style={folded ? { background: patternGround(art.name, art.tone) } : undefined}>
        {folded && <Pattern {...art} scale={0.6} scrim={0.6} />}
        <button className="icon-btn poet-bar__btn" aria-label="Back" onClick={() => (history.length > 1 ? history.back() : nav('/explore'))}><Back /></button>
        {folded && <span lang="ar" className="poet-bar__name">{p.nameAr}</span>}
        {canFollow ? <button className="icon-btn poet-bar__btn" aria-pressed={following} aria-label={following ? 'Following' : 'Follow'} onClick={toggleFollow}><Bookmark style={following ? { fill: 'currentColor' } : undefined} /></button> : <span className="hdr__spacer" />}
      </header>
      <div className="pad stack gap-10" style={{ paddingTop: 16 }}>
        <Segmented pill label="Poet" value={tab} onChange={setTab} options={[{ value: 'poems', label: 'POEMS' }, { value: 'about', label: 'THE POET' }]} />
        {tab === 'poems' ? (
          <div className="stack gap-8">
            {poems?.map((x, i) => (
              <Link key={x.id} href={`/p/${x.slug}`} className="poet-poem">
                <span className="poet-poem__side">
                  {reads?.[x.id] ? <span className="poet-poem__read">READ</span> : null}
                  <span className="row gap-4"><span className="poet-poem__num">{i + 1}</span>{kept.has(x.id) && <Heart size={12} filled aria-label="Kept" />}</span>
                </span>
                <span className="poet-poem__main">
                  <span lang="ar" dir="rtl" className="poet-poem__ar">{x.firstLineAr}</span>
                  <span className="poet-poem__en">{x.titleEn}</span>
                </span>
              </Link>
            ))}
            {poems && <p className="poet-poems__count">{poems.length} {poems.length === 1 ? 'POEM' : 'POEMS'} · <span lang="ar">{poems.length.toLocaleString('ar-EG')} قصائد</span></p>}
          </div>
        ) : (
          <div className="stack gap-10">
            <p className="poet-bio__lead">{lead}</p>
            {rest.length > 0 && <p className="poet-bio">{rest.join(' ')}</p>}
            {isAvailable('collections') && appears && appears.length > 0 && (
              <>
                <p className="t-eyebrow" style={{ marginTop: 4 }}>FIND {p.nameEn.toUpperCase()} IN</p>
                {appears.map((c) => (
                  <Link key={c.slug} href={`/collection/${c.slug}`} className="find-in">
                    <span className="find-in__art panel" style={{ background: c.colour }}><Pattern {...collectionArt(c)} scale={0.5} /></span>
                    <span className="find-in__main">
                      <span className="find-in__kind">{c.kind === 'journey' ? 'JOURNEY' : 'COLLECTION'}{c.poemIds.length ? ` · ${c.poemIds.length} ${c.stepEn.toUpperCase()}S` : ''}</span>
                      <span className="find-in__title">{c.titleEn}</span>
                    </span>
                    <Chevron />
                  </Link>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

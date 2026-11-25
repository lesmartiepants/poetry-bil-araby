// Area 4 · Explore (4.1–4.7).
import { Link, useLocation } from 'wouter';
import { useBands, useCollections, useEras, useFeaturedPoet, useFeelings, useFollows, usePoems, usePoets } from '@core/hooks';
import { arabicInitial, arabicSortKey } from '@core/logic/arabic';
import { isAvailable } from '@core/sources';
import { Header, LoadNote, FullAreaError, Pending, SectionLabel, TitleRow } from '@ds/primitives';
import { Bookmark, Chevron, Search } from '@ds/icons';
import { BrandLogo, CollectionCard, eraArt, PoemRow, PoemTile, PoetAvatar } from '@components/index';
import { Pattern } from '@ds/Pattern';
import { Fragment, useState, type ReactNode } from 'react';
import type { PoemFilter } from '@core/api/contract';
import './explore.css';

export function ExploreHub() {
  const fq = useFeaturedPoet(), pq = usePoets(), flq = useFeelings(), bq = useBands(), eq = useEras(), cq = useCollections('collection');
  const [featured, poets, feelings, bands, eras, colls] = [fq.data, pq.data, flq.data, bq.data, eq.data, cq.data];
  const [, nav] = useLocation();
  const v3 = isAvailable('collections', 'search');
  return (
    <div className="screen">
      <header className="hub-hdr">
        <BrandLogo />
        {v3 && <button className="icon-btn hub-search" aria-label="Search" onClick={() => nav('/search')}><Search /></button>}
      </header>
      <main className="pad stack gap-12" style={{ paddingTop: 14 }}>
        <LoadNote of={[fq, pq, flq, bq, eq, cq]} message="Some of Explore didn’t load." />
        <SectionLabel>POET OF THE WEEK</SectionLabel>
        {featured ? (
          <Link href={`/poet/${featured.poet.slug}`} className="potw">
            <PoetAvatar initial={featured.poet.initial} eraKey={featured.poet.eraKey} size={64} />
            <span className="potw__main"><span className="potw__name">{featured.poet.nameEn} <span lang="ar" className="potw__ar">· {featured.poet.nameAr}</span></span><span className="potw__note">{[featured.note, `${featured.poet.poemCount} poems`].filter(Boolean).join(' · ')}</span></span>
            <Chevron />
          </Link>
        ) : <Pending of={fq} lines={2} />}
        <SectionLabel action={<Link href="/explore/poets" className="see-all">SEE ALL</Link>}>POETS</SectionLabel>
        <div className="chips" style={{ gap: 12 }}>
          {poets?.slice(0, 6).map((p) => (
            <Link key={p.slug} href={`/poet/${p.slug}`} className="poet-dot"><PoetAvatar initial={p.initial} eraKey={p.eraKey} size={56} /><span>{p.nameEn.split(' ').slice(-1)[0].replace(/^al-/i, '')}</span></Link>
          ))}
        </div>
        {v3 && colls && (
          <>
            <SectionLabel action={<Link href="/explore/collections" className="see-all">SEE ALL</Link>}>COLLECTIONS</SectionLabel>
            <div className="chips" style={{ gap: 10 }}>{colls.map((c) => <CollectionCard key={c.slug} c={c} />)}</div>
          </>
        )}
        <SectionLabel action={<Link href="/explore/feelings" className="see-all">SEE ALL</Link>}>FIND BY FEELING</SectionLabel>
        <div className="chips">{feelings?.map((f) => <Link key={f.key} href={`/explore/feeling/${f.key}`} className="chip">{f.en}<span lang="ar" className="ar">{f.ar}</span></Link>)}</div>
        <SectionLabel>BY DIFFICULTY</SectionLabel>
        <div className="chips">{bands?.map((b) => <Link key={b.key} href={`/explore/difficulty/${b.key}`} className="chip">{b.en}<span lang="ar" className="ar">{b.ar}</span></Link>)}</div>
        <SectionLabel action={<Link href="/explore/eras" className="see-all">SEE ALL</Link>}>ERAS</SectionLabel>
        <div className="chips" style={{ gap: 10 }}>
          {eras?.map((e) => (
            <Link key={e.slug} href={`/explore/era/${e.slug}`} className="era-card panel" style={{ background: e.colour }}>
              <Pattern {...eraArt(e.slug)} scale={0.7} scrim={0.72} />
              <span className="row between" style={{ alignItems: 'baseline' }}><span className="era-card__en">{e.nameEn}</span><span lang="ar" className="era-card__ar">{e.nameAr}</span></span>
              <span className="era-card__meta">{e.years} · {e.place.toUpperCase()}</span>
              <span className="era-card__line">{e.line}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

export function AllPoets() {
  const pq = usePoets();
  const poets = pq.data;
  const eras = useEras().data;
  const follows = new Set(useFollows().data ?? []);
  const [era, setEra] = useState<string | null>(null);
  const [, nav] = useLocation();
  const eraName = (key: string) => eras?.find((e) => e.slug === key)?.nameEn ?? key;
  const shown = poets
    ?.filter((p) => !era || p.eraKey === era)
    .sort((a, b) => arabicSortKey(a.nameAr).localeCompare(arabicSortKey(b.nameAr), 'ar'));
  return (
    <div className="screen">
      <Header onBack={() => nav('/explore')} />
      <TitleRow en="Poets" ar="شعراء" />
      <div className="pad stack gap-10">
        <div className="row between t-count" style={{ marginTop: 6 }}><span>{shown?.length ?? '…'} POETS</span><span>ARABIC A–Z</span></div>
        <div className="chips">
          <button className="chip chip--sm" aria-pressed={era === null} onClick={() => setEra(null)}>ALL</button>
          {eras?.map((e) => <button key={e.slug} className="chip chip--sm" aria-pressed={era === e.slug} onClick={() => setEra(e.slug)}>{e.nameEn.toUpperCase()}</button>)}
        </div>
        <div>
          {!shown && <Pending of={pq} lines={6} />}
          {shown?.map((p, i) => (
            <Fragment key={p.slug}>
              {arabicInitial(p.nameAr) !== arabicInitial(shown[i - 1]?.nameAr ?? '') && <p lang="ar" className="letter-head">{arabicInitial(p.nameAr)}</p>}
              <Link href={`/poet/${p.slug}`} className="poet-line">
                <PoetAvatar initial={p.initial} eraKey={p.eraKey} size={40} />
                <span className="poet-line__main">
                  <span className="poet-line__name">{p.nameEn}</span>
                  <span className="poet-line__sub">{eraName(p.eraKey).toUpperCase()} · {p.poemCount} POEMS</span>
                </span>
                <span lang="ar" className="poet-line__ar">{p.nameAr}</span>
                <Bookmark size={14} className={follows.has(p.slug) ? 'poet-line__mark poet-line__mark--on' : 'poet-line__mark'} aria-label={follows.has(p.slug) ? 'Following' : undefined} />
              </Link>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/** One shelf: a heading that opens the whole list, and its first poems as tiles. */
function Shelf({ href, label, count, filter }: { href: string; label: ReactNode; count: number; filter: PoemFilter }) {
  const pq = usePoems(filter);
  const poems = pq.data;
  return (
    <section className="stack gap-8">
      <Link href={href} className="shelf-head"><span className="shelf-head__label">{label}</span><span className="shelf-head__count">{count} <Chevron size={12} /></span></Link>
      <div className="chips">{poems ? poems.slice(0, 8).map((p) => <PoemTile key={p.id} poem={p} />) : <Pending of={pq} lines={1} />}</div>
    </section>
  );
}

function ShelfToggle({ on }: { on: 'feeling' | 'era' }) {
  return (
    <div className="chips">
      {on === 'feeling' ? <button className="chip chip--sm" aria-pressed>FEELING</button> : <Link href="/explore/feelings" className="chip chip--sm">FEELING</Link>}
      {on === 'era' ? <button className="chip chip--sm" aria-pressed>ERA</button> : <Link href="/explore/eras" className="chip chip--sm">ERA</Link>}
    </div>
  );
}

export function FeelingShelves() {
  const fq = useFeelings();
  const feelings = fq.data;
  const [, nav] = useLocation();
  return (
    <div className="screen">
      <Header onBack={() => nav('/explore')} />
      <TitleRow en="By feeling" ar="مشاعر" />
      <div className="pad stack gap-12">
        <p className="t-count shelf-count">{feelings?.length ?? '…'} FEELINGS · ACROSS EVERY POEM</p>
        <ShelfToggle on="feeling" />
        {!feelings && <Pending of={fq} lines={5} />}
        {feelings?.map((f) => (
          <Shelf key={f.key} href={`/explore/feeling/${f.key}`} count={f.poemCount} filter={{ feeling: f.key }}
            label={<>{f.en} <span lang="ar" className="shelf-head__ar">· {f.ar}</span></>} />
        ))}
      </div>
    </div>
  );
}

export function EraShelves() {
  const eq = useEras();
  const eras = eq.data;
  const [, nav] = useLocation();
  return (
    <div className="screen">
      <Header onBack={() => nav('/explore')} />
      <TitleRow en="By era" ar="عصور" />
      <div className="pad stack gap-12">
        <p className="t-count shelf-count">{eras?.length ?? '…'} ERAS · OLDEST FIRST</p>
        <ShelfToggle on="era" />
        {!eras && <Pending of={eq} lines={5} />}
        {eras?.map((e) => (
          <Shelf key={e.slug} href={`/explore/era/${e.slug}`} count={e.poemCount} filter={{ era: e.slug }}
            label={<>{e.nameEn} · <bdi lang="ar" className="shelf-head__ar">{e.nameAr}</bdi> <span className="shelf-head__years">· {e.years}</span></>} />
        ))}
      </div>
    </div>
  );
}

type Kind = 'feeling' | 'era' | 'difficulty';
/** One feeling (4.4), one era (4.6) and one difficulty band (4.7) share a layout. */
export function OneShelf({ kind, keyName }: { kind: Kind; keyName: string }) {
  const flq = useFeelings(), eq = useEras(), bq = useBands(), poq = usePoets();
  const [feelings, eras, bands, poets] = [flq.data, eq.data, bq.data, poq.data];
  const [, nav] = useLocation();
  const filter = kind === 'feeling' ? { feeling: keyName } : kind === 'era' ? { era: keyName } : { band: keyName };
  const pq = usePoems(filter);
  const poems = pq.data;
  const all = kind === 'feeling' ? feelings?.map((f) => ({ key: f.key, en: f.en, ar: f.ar, line: f.line, count: `${f.poemCount} POEMS · ${f.poetCount} POETS` }))
    : kind === 'era' ? eras?.map((e) => ({ key: e.slug, en: e.nameEn, ar: e.nameAr, line: e.line, count: `${e.poemCount} POEMS · ${e.years.toUpperCase()}` }))
      : bands?.map((b) => ({ key: b.key, en: b.en, ar: b.ar, line: b.line, count: `${b.poemCount.toLocaleString('en')} POEMS` }));
  const me = all?.find((x) => x.key === keyName);
  const base = `/explore/${kind}`;
  // The list of shelves loaded and this key is not one of them: a stale link, not a loading screen.
  if (all && !me) return <div className="screen"><Header onBack={() => nav('/explore')} /><FullAreaError title="Nothing by that name" body="This shelf isn’t here. Explore has the rest." action="Go to Explore" onAction={() => nav('/explore')} /></div>;
  return (
    <div className="screen">
      <Header onBack={() => (history.length > 1 ? history.back() : nav('/explore'))} />
      <main className="pad stack gap-10" style={{ paddingTop: 6 }}>
        <div className="row between" style={{ alignItems: 'baseline' }}><h1 className="t-title">{me?.en ?? '…'}</h1><span lang="ar" className="t-title-ar">{me?.ar}</span></div>
        <p className="t-lede" style={{ marginTop: -4 }}>{me?.line}</p>
        <div className="row between t-count"><span>{me?.count}</span><span>OLDEST FIRST ▾</span></div>
        <div className="chips">{all?.map((x) => <Link key={x.key} href={`${base}/${x.key}`} className="chip chip--sm" aria-current={x.key === keyName ? 'true' : undefined}>{x.en.toUpperCase()}</Link>)}</div>
        <div className="list">
          {poems?.map((p) => <PoemRow key={p.id} poem={p} initial={poets?.find((x) => x.slug === p.poetSlug)?.initial} />)}
          {!poems && <Pending of={[pq, flq, eq, bq]} lines={5} />}
          {poems && poems.length === 0 && <p className="t-note mt-12">No poems here yet.</p>}
        </div>
      </main>
    </div>
  );
}

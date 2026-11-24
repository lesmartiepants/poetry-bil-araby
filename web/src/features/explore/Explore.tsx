// Area 4 · Explore (4.1–4.7).
import { Link, useLocation } from 'wouter';
import { useBands, useCollections, useEras, useFeaturedPoet, useFeelings, usePoems, usePoets } from '@core/hooks';
import { isAvailable } from '@core/sources';
import { Header, SectionLabel, Skeleton, TitleRow } from '@ds/primitives';
import { Chevron, Search } from '@ds/icons';
import { CollectionCard, PoemRow, PoetAvatar, PoetRow } from '@components/index';
import { useState } from 'react';
import './explore.css';

export function ExploreHub() {
  const featured = useFeaturedPoet().data;
  const poets = usePoets().data;
  const feelings = useFeelings().data;
  const bands = useBands().data;
  const eras = useEras().data;
  const colls = useCollections('collection').data;
  const [, nav] = useLocation();
  const v3 = isAvailable('collections', 'search');
  return (
    <div className="screen">
      <header className="hub-hdr">
        <span className="hdr__spacer" />
        <span className="hub-logo"><span className="hub-logo__en">poetry</span><span lang="ar" className="hub-logo__ar">بالعربي</span></span>
        {v3 ? <button className="icon-btn hub-search" aria-label="Search" onClick={() => nav('/search')}><Search /></button> : <span className="hdr__spacer" />}
      </header>
      <main className="pad stack gap-12" style={{ paddingTop: 14 }}>
        <SectionLabel>POET OF THE WEEK</SectionLabel>
        {featured ? (
          <Link href={`/poet/${featured.poet.slug}`} className="potw">
            <PoetAvatar initial={featured.poet.initial} eraKey={featured.poet.eraKey} size={54} />
            <span className="potw__main"><span className="potw__name">{featured.poet.nameEn} · <span lang="ar" className="ar">{featured.poet.nameAr}</span></span><span className="potw__note">{featured.note}</span><span className="potw__note">{featured.poet.poemCount} poems</span></span>
            <Chevron />
          </Link>
        ) : <Skeleton lines={2} />}
        <SectionLabel action={<Link href="/explore/poets" className="link-btn">SEE ALL</Link>}>POETS</SectionLabel>
        <div className="chips" style={{ gap: 14 }}>
          {poets?.slice(0, 6).map((p) => (
            <Link key={p.slug} href={`/poet/${p.slug}`} className="poet-dot"><PoetAvatar initial={p.initial} eraKey={p.eraKey} size={52} /><span>{p.nameEn.split(' ').slice(-1)[0]}</span></Link>
          ))}
        </div>
        {v3 && colls && (
          <>
            <SectionLabel action={<Link href="/explore/collections" className="link-btn">SEE ALL</Link>}>COLLECTIONS</SectionLabel>
            <div className="chips" style={{ gap: 10 }}>{colls.map((c) => <CollectionCard key={c.slug} c={c} />)}</div>
          </>
        )}
        <SectionLabel action={<Link href="/explore/feelings" className="link-btn">SEE ALL</Link>}>FIND BY FEELING</SectionLabel>
        <div className="chips">{feelings?.map((f) => <Link key={f.key} href={`/explore/feeling/${f.key}`} className="chip">{f.en}<span lang="ar" className="ar">{f.ar}</span></Link>)}</div>
        <SectionLabel>BY DIFFICULTY</SectionLabel>
        <div className="chips">{bands?.map((b) => <Link key={b.key} href={`/explore/difficulty/${b.key}`} className="chip">{b.en}<span lang="ar" className="ar">{b.ar}</span></Link>)}</div>
        <SectionLabel action={<Link href="/explore/eras" className="link-btn">SEE ALL</Link>}>ERAS</SectionLabel>
        <div className="chips" style={{ gap: 10 }}>
          {eras?.map((e) => (
            <Link key={e.slug} href={`/explore/era/${e.slug}`} className="era-card" style={{ background: e.colour }}>
              <span className="row between"><span className="era-card__en">{e.nameEn}</span><span lang="ar" className="era-card__ar">{e.nameAr}</span></span>
              <span className="era-card__meta">{e.years.toUpperCase()} · {e.place.toUpperCase()}</span>
              <span className="era-card__line">{e.line}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

export function AllPoets() {
  const poets = usePoets().data;
  const eras = useEras().data;
  const [era, setEra] = useState<string | null>(null);
  const [, nav] = useLocation();
  const shown = poets?.filter((p) => !era || p.eraKey === era);
  return (
    <div className="screen">
      <Header onBack={() => nav('/explore')} />
      <TitleRow en="All poets" ar="الشعراء" />
      <div className="pad stack gap-10 mt-8">
        <span className="t-count">{shown?.length ?? '…'} POETS · A–Z</span>
        <div className="chips">
          <button className="chip chip--sm" aria-pressed={era === null} onClick={() => setEra(null)}>ALL ERAS</button>
          {eras?.map((e) => <button key={e.slug} className="chip chip--sm" aria-pressed={era === e.slug} onClick={() => setEra(e.slug)}>{e.nameEn.toUpperCase()}</button>)}
        </div>
        <div className="list">{shown?.map((p) => <PoetRow key={p.slug} poet={p} />)}</div>
      </div>
    </div>
  );
}

export function FeelingShelves() {
  const feelings = useFeelings().data;
  const [, nav] = useLocation();
  return (
    <div className="screen">
      <Header onBack={() => nav('/explore')} />
      <TitleRow en="By feeling" ar="المشاعر" />
      <div className="pad stack gap-10 mt-8">
        <div className="chips"><button className="chip chip--sm" aria-pressed>FEELING</button><Link href="/explore/eras" className="chip chip--sm">ERA</Link></div>
        {feelings?.map((f) => (
          <Link key={f.key} href={`/explore/feeling/${f.key}`} className="shelf">
            <span className="row between"><span className="shelf__en">{f.en}</span><span lang="ar" className="shelf__ar">{f.ar}</span></span>
            <span className="t-count">{f.poemCount} POEMS · {f.poetCount} POETS</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function EraShelves() {
  const eras = useEras().data;
  const [, nav] = useLocation();
  return (
    <div className="screen">
      <Header onBack={() => nav('/explore')} />
      <TitleRow en="By era" ar="العصور" />
      <div className="pad stack gap-10 mt-8">
        <div className="chips"><Link href="/explore/feelings" className="chip chip--sm">FEELING</Link><button className="chip chip--sm" aria-pressed>ERA</button></div>
        <span className="t-count">OLDEST FIRST</span>
        {eras?.map((e) => (
          <Link key={e.slug} href={`/explore/era/${e.slug}`} className="shelf" style={{ borderLeft: `3px solid ${e.colour}` }}>
            <span className="row between"><span className="shelf__en">{e.nameEn}</span><span lang="ar" className="shelf__ar">{e.nameAr}</span></span>
            <span className="t-count">{e.years.toUpperCase()} · {e.poemCount} POEMS</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

type Kind = 'feeling' | 'era' | 'difficulty';
/** One feeling (4.4), one era (4.6) and one difficulty band (4.7) share a layout. */
export function OneShelf({ kind, keyName }: { kind: Kind; keyName: string }) {
  const feelings = useFeelings().data;
  const eras = useEras().data;
  const bands = useBands().data;
  const poets = usePoets().data;
  const [, nav] = useLocation();
  const filter = kind === 'feeling' ? { feeling: keyName } : kind === 'era' ? { era: keyName } : { band: keyName };
  const poems = usePoems(filter).data;
  const all = kind === 'feeling' ? feelings?.map((f) => ({ key: f.key, en: f.en, ar: f.ar, line: f.line, count: `${f.poemCount} POEMS · ${f.poetCount} POETS` }))
    : kind === 'era' ? eras?.map((e) => ({ key: e.slug, en: e.nameEn, ar: e.nameAr, line: e.line, count: `${e.poemCount} POEMS · ${e.years.toUpperCase()}` }))
      : bands?.map((b) => ({ key: b.key, en: b.en, ar: b.ar, line: b.line, count: `${b.poemCount.toLocaleString('en')} POEMS` }));
  const me = all?.find((x) => x.key === keyName);
  const base = `/explore/${kind}`;
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
          {poems && poems.length === 0 && <p className="t-note mt-12">No poems here yet.</p>}
        </div>
      </main>
    </div>
  );
}

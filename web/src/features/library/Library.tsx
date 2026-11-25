// Area 8 · Library (8.1–8.15).
import { useState, type ComponentType } from 'react';
import { Link, useLocation } from 'wouter';
import { useQueries } from '@tanstack/react-query';
import { api } from '@core/api';
import { qk, useAccount, useCollections, useFollows, useInvalidate, useKeeps, useLists, usePoems, usePoets, useProgress, useReads } from '@core/hooks';
import { isAvailable } from '@core/sources';
import type { Poem, Poet, UserList } from '@core/types';
import { FullAreaError, Header, LoadNote, Pending, SectionLabel, Segmented, Sheet, TitleRow } from '@ds/primitives';
import { Compass, Dots, Lock, Mark, Search } from '@ds/icons';
import { BrandLogo, CollectionCard, PoemRow, PoemTile, PoetAvatar, PoetRow } from '@components/index';
import { useOverlay } from '@components/overlays';
import './library.css';

type ListIconT = ComponentType<{ list: Pick<UserList, 'name' | 'iconLetter' | 'colour' | 'isDefault'>; size?: number }>;
type ListEditorT = ComponentType<{ onCancel: () => void; onCreated: (l: UserList) => void; edit?: UserList }>;

function useKeptPoems() {
  const keeps = useKeeps().data ?? [];
  const qs = useQueries({ queries: keeps.map((id) => ({ queryKey: ['poem', id], queryFn: () => api.poems.get(id) })) });
  return { ids: keeps, poems: qs.map((q) => q.data).filter(Boolean) as Poem[], loading: qs.some((q) => q.isLoading) };
}

export function LibraryHub({ ListIcon }: { ListIcon: ListIconT }) {
  const aq = useAccount(), lq = useLists(), fq = useFollows(), pq = usePoets(), cq = useCollections(), gq = useProgress();
  const [account, lists, follows, poets, colls, prog] = [aq.data, lq.data, fq.data, pq.data, cq.data, gq.data];
  const { poems } = useKeptPoems();
  const [, nav] = useLocation();
  const open = useOverlay((s) => s.open);
  const [tab, setTab] = useState<'hub' | 'poems'>('hub');
  const signedOut = account && !account.signedIn;
  const empty = signedOut || (lists && poems.length === 0 && lists.every((l) => l.poemIds.length === 0));
  const followed = poets?.filter((p) => follows?.includes(p.slug)) ?? [];
  const saved = colls?.filter((c) => prog?.some((p) => p.slug === c.slug && p.saved)) ?? [];
  const keptPoets = new Set(poems.map((p) => p.poetSlug)).size;
  const tabs = (
    <div className="row gap-8">
      <div style={{ flex: 1 }}><Segmented pill label="Library" value={tab} onChange={setTab} options={[{ value: 'hub', label: 'HUB' }, { value: 'poems', label: 'POEMS' }]} /></div>
      {isAvailable('search') && <button className="icon-btn lib-search" aria-label="Search" onClick={() => nav('/search')}><Search /></button>}
    </div>
  );
  return (
    <div className="screen">
      <header className="hub-hdr"><BrandLogo /></header>
      <main className="pad stack gap-12" style={{ paddingTop: 14 }}>
        <TitleRow en="Your diwan" ar="ديواني" bare />
        <LoadNote of={[aq, lq, fq, pq, cq, gq]} message="Your diwan didn’t fully load." />
        <p className="t-count lib-count">{empty ? 'NOTHING KEPT YET' : `${poems.length} ${poems.length === 1 ? 'POEM' : 'POEMS'} · ${keptPoets} ${keptPoets === 1 ? 'POET' : 'POETS'}`}</p>
        {tabs}
        {empty ? (
          <div className="lib-empty">
            <Mark size={76} colour="#5C4C2A" />
            <p className="lib-empty__title">Your diwan starts with one poem.</p>
            <p className="lib-empty__body">While reading, tap the heart to keep a poem. Poems you keep, poets you follow and collections you save all gather here.</p>
            <div className="stack gap-10" style={{ alignSelf: 'stretch', marginTop: 22 }}>
              {signedOut && <button className="btn btn--primary btn--block" onClick={() => open({ type: 'signin' })}>Sign in to keep poems</button>}
              <Link href="/" className={`btn btn--block lib-empty__btn${signedOut ? '' : ' btn--primary'}`}>Read tonight’s poem</Link>
              <Link href="/explore/collections" className="btn btn--block lib-empty__btn"><Compass size={16} /> Browse collections</Link>
            </div>
          </div>
        ) : tab === 'poems' ? <YourPoems /> : (
          <>
            <SectionLabel action={<Link href="/library/lists" className="see-all">SEE ALL</Link>}>YOUR LISTS · {lists?.length ?? 0}</SectionLabel>
            <div className="chips" style={{ gap: 10 }}>
              {lists?.map((l) => (
                <Link key={l.id} href={`/library/list/${l.id}`} className={`list-tile${l.isDefault ? ' list-tile--fav' : ''}`}>
                  <ListIcon list={l} size={36} />
                  <span className="list-tile__text"><span className="list-tile__name">{l.name}</span><span className="list-tile__count">{l.poemIds.length} {l.poemIds.length === 1 ? 'POEM' : 'POEMS'}</span></span>
                </Link>
              ))}
            </div>
            {isAvailable('collections') && saved.length > 0 && (
              <>
                <SectionLabel action={<Link href="/explore/collections" className="see-all">SEE ALL</Link>}>COLLECTIONS · {saved.length} SAVED</SectionLabel>
                <div className="chips" style={{ gap: 10 }}>
                  {saved.map((c) => <CollectionCard key={c.slug} c={c} progress={prog?.find((p) => p.slug === c.slug)?.position ?? 0} />)}
                </div>
              </>
            )}
            {followed.length > 0 && (
              <>
                <SectionLabel action={<Link href="/library/poets" className="see-all">SEE ALL</Link>}>POETS YOU FOLLOW · {followed.length}</SectionLabel>
                <div className="chips" style={{ gap: 12 }}>
                  {followed.map((p) => (
                    <Link key={p.slug} href={`/poet/${p.slug}`} className="poet-dot"><PoetAvatar initial={p.initial} eraKey={p.eraKey} size={56} /><span>{p.nameEn.split(' ').slice(-1)[0].replace(/^al-/i, '')}</span></Link>
                  ))}
                </div>
              </>
            )}
            <SectionLabel action={<button className="see-all" onClick={() => setTab('poems')}>SEE ALL</button>}>RECENTLY KEPT</SectionLabel>
            <div className="chips">{poems.slice(0, 8).map((p) => <PoemTile key={p.id} poem={p} small />)}</div>
          </>
        )}
      </main>
    </div>
  );
}

function YourPoems() {
  const { poems } = useKeptPoems();
  const poets = usePoets().data;
  const [group, setGroup] = useState<'poet' | 'feeling' | 'era'>('poet');
  const [order, setOrder] = useState<'ar' | 'en'>('ar');
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const inv = useInvalidate();
  const showToast = useOverlay((s) => s.showToast);
  const keyOf = (p: Poem) => (group === 'poet' ? (order === 'ar' ? p.poetAr : p.poetEn) : group === 'feeling' ? p.feelingKeys[0] ?? '—' : p.eraKey);
  const groups = [...new Set(poems.map(keyOf))].sort((a, b) => a.localeCompare(b, order === 'ar' ? 'ar' : 'en'));
  const remove = async () => {
    const ids = sel;
    await api.keeps.unkeep(ids);
    await inv(qk.keeps, qk.lists);
    setSel([]);
    setSelecting(false);
    showToast({ text: `${ids.length} removed`, action: 'UNDO', onAction: async () => { for (const id of ids.reverse()) await api.keeps.keep(id); inv(qk.keeps, qk.lists); } }, 6000);
  };
  return (
    <div className="stack gap-10">
      <div className="row between">
        <div className="chips" style={{ marginRight: 0 }}>
          {(['poet', 'feeling', 'era'] as const).map((g) => <button key={g} className="chip chip--sm" aria-pressed={group === g} onClick={() => setGroup(g)}>BY {g.toUpperCase()}</button>)}
        </div>
      </div>
      <div className="row between">
        <button className="link-btn" onClick={() => setOrder(order === 'ar' ? 'en' : 'ar')}>{order === 'ar' ? 'ARABIC A–Z' : 'ENGLISH A–Z'}</button>
        <button className="link-btn" onClick={() => { setSelecting(!selecting); setSel([]); }}>{selecting ? 'CANCEL' : 'SELECT'}</button>
      </div>
      {groups.map((g) => (
        <div key={g} className="stack">
          <p className="t-eyebrow t-eyebrow--accent mt-8">{g}</p>
          {poems.filter((p) => keyOf(p) === g).map((p) => selecting ? (
            <button key={p.id} className="list-row" role="checkbox" aria-checked={sel.includes(p.id)} onClick={() => setSel(sel.includes(p.id) ? sel.filter((x) => x !== p.id) : [...sel, p.id])}>
              <span className={`check${sel.includes(p.id) ? ' check--on' : ''}`} />
              <span className="list-row__main"><span className="list-row__title">{p.titleEn}</span><span className="list-row__sub">{p.poetEn}</span></span>
            </button>
          ) : <PoemRow key={p.id} poem={p} initial={poets?.find((x) => x.slug === p.poetSlug)?.initial} />)}
        </div>
      ))}
      {selecting && <div className="select-bar"><span>{sel.length} selected</span><button className="btn btn--danger" disabled={!sel.length} onClick={remove}>Remove</button></div>}
    </div>
  );
}

export function AllLists({ ListIcon, ListEditor }: { ListIcon: ListIconT; ListEditor: ListEditorT }) {
  const lists = useLists().data;
  const [, nav] = useLocation();
  const inv = useInvalidate();
  const showToast = useOverlay((s) => s.showToast);
  const [editing, setEditing] = useState<UserList | null>(null);
  const [deleting, setDeleting] = useState<UserList | null>(null);
  const total = lists?.reduce((n, l) => n + l.poemIds.length, 0) ?? 0;
  const doDelete = async (l: UserList) => {
    await api.lists.remove(l.id);
    await inv(qk.lists);
    setDeleting(null);
    showToast({ text: 'List deleted', action: 'UNDO', onAction: async () => {
      const back = await api.lists.create({ name: l.name, colour: l.colour, iconLetter: l.iconLetter });
      for (const id of l.poemIds) {
        const now = (await api.lists.all()).filter((x) => x.poemIds.includes(id)).map((x) => x.id);
        await api.lists.setPoemLists(id, [...now, back.id]);
      }
      inv(qk.lists);
    } }, 6000);
  };
  return (
    <div className="screen">
      <Header onBack={() => nav('/library')} />
      <TitleRow en="Your lists" ar="قوائمك" />
      <div className="pad stack gap-8 mt-8">
        <div className="row between t-count"><span>{lists?.length ?? 0} LISTS · {total} POEMS</span><span>RECENT FIRST ▾</span></div>
        <div className="list">
          {lists?.map((l) => (
            <div key={l.id} className="list-row" style={{ padding: 0 }}>
              <Link href={`/library/list/${l.id}`} className="row gap-12" style={{ flex: 1, minHeight: 66, textDecoration: 'none' }}>
                <ListIcon list={l} />
                <span className="list-row__main"><span className="list-row__title">{l.name}</span><span className="t-count" style={{ fontSize: 9.5 }}>{l.poemIds.length} POEMS</span></span>
              </Link>
              {l.isDefault ? <span className="icon-btn icon-btn--muted" aria-label="Can’t be renamed or deleted"><Lock /></span>
                : <button className="icon-btn icon-btn--muted" aria-label={`Options for ${l.name}`} onClick={() => setEditing(l)}><Dots /></button>}
            </div>
          ))}
        </div>
        <p className="t-note">New lists are made when you keep a poem: Change on the Kept toast.</p>
      </div>
      {editing && !deleting && (
        <>
          <ListEditor edit={editing} onCancel={() => setEditing(null)} onCreated={() => { setEditing(null); inv(qk.lists); }} />
          {!editing.isDefault && <button className="btn btn--danger delete-fab" onClick={() => setDeleting(editing)}>Delete list</button>}
        </>
      )}
      {deleting && (
        <Sheet label="Delete list" onClose={() => { setDeleting(null); setEditing(null); }}>
          <div className="stack gap-12" style={{ alignItems: 'center', textAlign: 'center' }}>
            <ListIcon list={deleting} size={56} />
            <h2 className="t-title" style={{ fontSize: 26 }}>Delete “{deleting.name}”?</h2>
            <p className="t-body">The list goes; its {deleting.poemIds.length} poems stay kept, in Your poems and in any other list they’re in.</p>
          </div>
          <button className="btn btn--danger btn--block" onClick={() => { doDelete(deleting); setEditing(null); }}>DELETE LIST</button>
          <button className="btn btn--ghost btn--block" onClick={() => { setDeleting(null); setEditing(null); }}>CANCEL</button>
        </Sheet>
      )}
    </div>
  );
}

export function ListScreen({ id, ListIcon }: { id: string; ListIcon: ListIconT }) {
  const lq = useLists();
  const list = lq.data?.find((l) => l.id === id);
  const [, nav] = useLocation();
  const qs = useQueries({ queries: (list?.poemIds ?? []).map((pid) => ({ queryKey: ['poem', pid], queryFn: () => api.poems.get(pid) })) });
  if (lq.data && !list) return <div className="screen"><Header onBack={() => nav('/library')} /><FullAreaError title="This list isn’t here" body="It may have been deleted." action="Back to your diwan" onAction={() => nav('/library')} /></div>;
  if (!list) return <div className="screen pad" style={{ paddingTop: 120 }}><Pending of={lq} /></div>;
  return (
    <div className="screen">
      <Header onBack={() => nav('/library')} />
      <div className="pad row gap-12"><ListIcon list={list} size={56} /><div><h1 className="t-title">{list.name}</h1><span className="t-count">{list.poemIds.length} POEMS</span></div></div>
      <div className="pad list mt-12">{qs.map((q) => q.data && <PoemRow key={q.data.id} poem={q.data} />)}</div>
    </div>
  );
}

function FollowedPoetRow({ poet, reads }: { poet: Poet; reads: Record<string, number> }) {
  const poems = usePoems({ poet: poet.slug }).data;
  const read = poems?.filter((p) => reads[p.id]).length;
  return <PoetRow poet={poet} sub={`${poet.poemCount} poems${read !== undefined ? ` · ${read} read` : ''}`} />;
}

export function FollowedPoets() {
  const follows = useFollows().data;
  const poets = usePoets().data;
  const reads = useReads().data ?? {};
  const [, nav] = useLocation();
  return (
    <div className="screen">
      <Header onBack={() => nav('/library')} />
      <TitleRow en="Poets you follow" ar="شعراؤك" />
      <div className="pad list mt-8">
        {poets?.filter((p) => follows?.includes(p.slug)).map((p) => <FollowedPoetRow key={p.slug} poet={p} reads={reads} />)}
        <Link href="/explore/poets" className="btn mt-16" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Find more poets</Link>
      </div>
    </div>
  );
}

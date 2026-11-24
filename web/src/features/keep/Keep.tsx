// Area 6 · Keep and lists (6.1–6.8), opened as overlays from the reader.
import { useEffect, useState } from 'react';
import { api } from '@core/api';
import { qk, useAccount, useInvalidate, useLists } from '@core/hooks';
import { ARABIC_LETTERS, autoIconLetter, iconLetterChoices, iconLetterOf } from '@core/logic/iconLetter';
import type { UserList } from '@core/types';
import { Sheet } from '@ds/primitives';
import { Check, Heart } from '@ds/icons';
import { useOverlay } from '@components/overlays';
import './keep.css';

export const LIST_COLOURS = ['#4A1620', '#1B2F52', '#1E4A3E', '#141A33', '#5C4C2A', '#22406E'];

export function ListIcon({ list, size = 40 }: { list: Pick<UserList, 'name' | 'iconLetter' | 'colour' | 'isDefault'>; size?: number }) {
  return (
    <span aria-hidden className="list-icon" style={{ background: list.colour, width: size, height: size, fontSize: size / 2 }}>
      {list.isDefault ? <Heart size={size * 0.45} filled style={{ color: '#F2B8C0' }} /> : iconLetterOf(list)}
    </span>
  );
}

/** 6.1–6.3: keep is one tap; signed out asks to sign in first. */
export function KeepFlow({ poemId }: { poemId: string }) {
  const account = useAccount();
  const { open, close, showToast } = useOverlay();
  const inv = useInvalidate();
  useEffect(() => {
    if (account.isLoading) return;
    if (!account.data?.signedIn) return open({ type: 'signin', then: { type: 'keep', poemId } });
    (async () => {
      try {
        await api.keeps.keep(poemId);
        await inv(qk.keeps, qk.lists);
        close();
        showToast({
          text: 'Kept in Favorites', action: 'CHANGE',
          onAction: () => open({ type: 'keep-lists', poemId }),
        }, 5000);
      } catch {
        close();
        showToast({ text: 'Keep didn’t save. Try again.', alert: true, action: 'RETRY', onAction: () => open({ type: 'keep', poemId }) });
      }
    })();
  }, [account.isLoading, account.data?.signedIn]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="kept-stamp" aria-hidden><Heart size={64} filled /></div>;
}

/** 6.2 Sign in on save. */
export function SignInSheet({ then }: { then?: Parameters<ReturnType<typeof useOverlay.getState>['open']>[0] }) {
  const { open, close } = useOverlay();
  const inv = useInvalidate();
  const go = async (provider: 'apple' | 'google') => {
    await api.profile.signIn(provider);
    await inv(qk.account);
    if (then) open(then); else close();
  };
  return (
    <Sheet label="Sign in" onClose={close}>
      <span className="t-eyebrow t-eyebrow--accent">KEEP THIS POEM</span>
      <h2 className="t-title" style={{ fontSize: 26 }}>Sign in to keep poems</h2>
      <p className="t-body">Your diwan is kept on every device. Nothing is posted anywhere.</p>
      <button className="btn btn--primary btn--block" onClick={() => go('apple')}>Continue with Apple</button>
      <button className="btn btn--block" onClick={() => go('google')}>Continue with Google</button>
      <button className="btn btn--ghost btn--block" onClick={close}>Not now</button>
    </Sheet>
  );
}

/** 6.4 Change: keep in more lists; 6.5 new list; 6.6 the letter drawer. */
export function KeepListsSheet({ poemId }: { poemId: string }) {
  const lists = useLists().data;
  const { close, showToast } = useOverlay();
  const inv = useInvalidate();
  const [mode, setMode] = useState<'pick' | 'new'>('pick');
  const toggle = async (l: UserList) => {
    const ids = (lists ?? []).filter((x) => x.poemIds.includes(poemId)).map((x) => x.id);
    const next = ids.includes(l.id) ? ids.filter((x) => x !== l.id) : [...ids, l.id];
    await api.lists.setPoemLists(poemId, next);
    inv(qk.lists);
  };
  if (mode === 'new') return <NewListSheet onCancel={() => setMode('pick')} onCreated={async (l) => {
    const ids = (lists ?? []).filter((x) => x.poemIds.includes(poemId)).map((x) => x.id);
    await api.lists.setPoemLists(poemId, [...ids, l.id]);
    await inv(qk.lists);
    setMode('pick');
    showToast({ text: `Kept in ${l.name}` });
  }} />;
  return (
    <Sheet label="Keep in lists" onClose={close}>
      <div className="sheet__head"><span className="t-eyebrow t-eyebrow--accent">KEEP IN</span><button className="link-btn" onClick={close}>DONE</button></div>
      <div className="list">
        {lists?.map((l) => {
          const on = l.poemIds.includes(poemId);
          return (
            <button key={l.id} className="list-row" role="checkbox" aria-checked={on} onClick={() => toggle(l)}>
              <ListIcon list={l} />
              <span className="list-row__main"><span className="list-row__title">{l.name}</span><span className="list-row__sub">{l.poemIds.length} poems</span></span>
              <span className={`check${on ? ' check--on' : ''}`}>{on && <Check size={14} />}</span>
            </button>
          );
        })}
      </div>
      <button className="btn btn--block" onClick={() => setMode('new')}>+ New list</button>
    </Sheet>
  );
}

export function NewListSheet({ onCancel, onCreated, edit }: { onCancel: () => void; onCreated: (l: UserList) => void; edit?: UserList }) {
  const [name, setName] = useState(edit?.name ?? '');
  const [colour, setColour] = useState(edit?.colour ?? LIST_COLOURS[1]);
  const [letter, setLetter] = useState(edit?.iconLetter ?? '');
  const [drawer, setDrawer] = useState(false);
  const auto = autoIconLetter(name || 'ق');
  const choices = iconLetterChoices(name).filter((l) => l !== auto);
  const save = async () => {
    const l = edit ? await api.lists.update(edit.id, edit.isDefault ? { colour } : { name: name.trim(), colour, iconLetter: letter })
      : await api.lists.create({ name: name.trim(), colour, iconLetter: letter });
    onCreated(l);
  };
  if (drawer) {
    return (
      <Sheet label="Choose a letter" onClose={() => setDrawer(false)}>
        <div className="sheet__head"><span className="t-eyebrow t-eyebrow--accent">CHOOSE A LETTER</span><button className="link-btn" onClick={() => setDrawer(false)}>DONE</button></div>
        <div className="letters" role="radiogroup" aria-label="Letter">
          {ARABIC_LETTERS.map((l) => <button key={l} role="radio" aria-checked={letter === l} className="letter" onClick={() => { setLetter(l); setDrawer(false); }}>{l}</button>)}
        </div>
      </Sheet>
    );
  }
  return (
    <Sheet label={edit ? 'List options' : 'New list'} onClose={onCancel}>
      <div className="sheet__head"><span className="t-eyebrow t-eyebrow--accent">{edit ? 'LIST' : 'NEW LIST'}</span><button className="link-btn" onClick={onCancel}>CANCEL</button></div>
      <div className="row gap-12">
        <ListIcon list={{ name: name || 'ق', iconLetter: letter, colour, isDefault: !!edit?.isDefault }} size={56} />
        <input className="text-in" aria-label="List name" placeholder="Name this list" value={name} disabled={edit?.isDefault} onChange={(e) => setName(e.target.value)} autoFocus={!edit} />
      </div>
      {!edit?.isDefault && (
        <>
          <p className="t-eyebrow">ICON</p>
          <div className="row gap-8" role="radiogroup" aria-label="Icon letter">
            <button role="radio" aria-checked={letter === ''} className="letter" onClick={() => setLetter('')}>{auto}<small>AUTO</small></button>
            {choices.map((l) => <button key={l} role="radio" aria-checked={letter === l} className="letter" onClick={() => setLetter(l)}>{l}</button>)}
            <button className="letter letter--choose" onClick={() => setDrawer(true)}>CHOOSE</button>
          </div>
        </>
      )}
      <p className="t-eyebrow">COLOUR</p>
      <div className="row gap-10" role="radiogroup" aria-label="Colour">
        {LIST_COLOURS.map((c) => <button key={c} role="radio" aria-checked={colour === c} aria-label={c} className="swatch" style={{ background: c }} onClick={() => setColour(c)} />)}
      </div>
      <button className="btn btn--primary btn--block" disabled={!name.trim()} onClick={save}>{edit ? 'Done' : 'Create list'}</button>
    </Sheet>
  );
}

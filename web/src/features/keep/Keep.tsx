// Area 6 · Keep and lists (6.1–6.8), opened as overlays from the reader.
import { useEffect, useState } from 'react';
import { api } from '@core/api';
import { qk, useAccount, useFeelings, useInvalidate, useLists, usePoem } from '@core/hooks';
import { ARABIC_LETTERS, autoIconLetter, iconLetterChoices, iconLetterOf } from '@core/logic/iconLetter';
import type { UserList } from '@core/types';
import { Sheet } from '@ds/primitives';
import { Check, Heart, Mark } from '@ds/icons';
import { useOverlay } from '@components/overlays';
import './keep.css';

export const LIST_COLOURS = [
  { hex: '#0D0C10', name: 'Obsidian' }, { hex: '#4A1620', name: 'Pomegranate' }, { hex: '#1B2F52', name: 'Cobalt' },
  { hex: '#1E4A3E', name: 'Verdigris' }, { hex: '#141A33', name: 'Indigo' },
];

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
          text: <>Kept in <em>Favorites</em></>, mark: true, action: 'CHANGE',
          onAction: () => open({ type: 'keep-lists', poemId }),
          undo: async () => { await api.keeps.unkeep([poemId]); inv(qk.keeps, qk.lists); },
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
      <div className="signin__head">
        <Mark size={48} colour="var(--c-accent)" />
        <h2 className="signin__title">Keep this poem everywhere</h2>
        <p className="signin__body">Your diwan follows you to every device. Sign in once, with Apple or Google.</p>
      </div>
      <button className="signin__btn signin__btn--apple" onClick={() => go('apple')}>Continue with Apple</button>
      <button className="signin__btn" onClick={() => go('google')}>Continue with Google</button>
      <button className="signin__later" onClick={close}>NOT NOW</button>
    </Sheet>
  );
}

/** 6.4 Change: keep in more lists; 6.5 new list; 6.6 the letter drawer. */
export function KeepListsSheet({ poemId }: { poemId: string }) {
  const lists = useLists().data;
  const poem = usePoem(poemId).data;
  const feelings = useFeelings().data;
  const { close, showToast } = useOverlay();
  const inv = useInvalidate();
  const [mode, setMode] = useState<'pick' | 'new'>('pick');
  const inLists = (lists ?? []).filter((x) => x.poemIds.includes(poemId)).map((x) => x.id);
  const toggle = async (l: UserList) => {
    const next = inLists.includes(l.id) ? inLists.filter((x) => x !== l.id) : [...inLists, l.id];
    await api.lists.setPoemLists(poemId, next);
    inv(qk.lists);
  };
  // Names a reader might give this poem's list: its feeling, its poet, a use.
  const suggestions = [
    feelings?.find((f) => poem?.feelingKeys.includes(f.key))?.en, poem?.poetEn, 'To read aloud',
  ].filter((x): x is string => !!x && !lists?.some((l) => l.name === x));
  if (mode === 'new') return <NewListSheet suggestions={suggestions} addsPoem onCancel={() => setMode('pick')} onCreated={async (l) => {
    await api.lists.setPoemLists(poemId, [...inLists, l.id]);
    await inv(qk.lists);
    setMode('pick');
    showToast({ text: <>Kept in <em>{l.name}</em></>, mark: true });
  }} />;
  return (
    <Sheet label="Keep in lists" onClose={close} height={560}>
      <div className="sheet__head"><span className="t-eyebrow t-eyebrow--accent">KEEP IN</span><span lang="ar" className="keep__ar">احفظ في</span></div>
      {poem && <p className="keep__poem">{poem.titleEn} · {poem.poetEn}</p>}
      <div role="group" aria-label="Lists">
        {lists?.map((l) => {
          const on = l.poemIds.includes(poemId);
          return (
            <button key={l.id} className="keep-row" role="checkbox" aria-checked={on} onClick={() => toggle(l)}>
              <ListIcon list={l} />
              <span className="keep-row__main"><span className="keep-row__name">{l.name}</span><span className="keep-row__sub">{l.poemIds.length} {l.poemIds.length === 1 ? 'poem' : 'poems'}{l.isDefault ? ' · always here' : ''}</span></span>
              <span className={`keep-check${on ? " keep-check--on" : ""}`}>{on && <Check size={14} />}</span>
            </button>
          );
        })}
        <button className="keep-row" onClick={() => setMode('new')}>
          <span className="list-icon list-icon--new" aria-hidden>+</span>
          <span className="keep-row__main keep-row__new">New list</span>
        </button>
      </div>
      <button className="btn btn--primary btn--block" style={{ marginTop: 'auto' }} onClick={close}>
        Done · in {inLists.length} {inLists.length === 1 ? 'list' : 'lists'}
      </button>
    </Sheet>
  );
}

export function NewListSheet({ onCancel, onCreated, edit, suggestions = [], addsPoem }: {
  onCancel: () => void; onCreated: (l: UserList) => void; edit?: UserList; suggestions?: string[]; addsPoem?: boolean;
}) {
  const [name, setName] = useState(edit?.name ?? '');
  const [colour, setColour] = useState(edit?.colour ?? LIST_COLOURS[2].hex);
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
    <Sheet label={edit ? 'List options' : 'New list'} onClose={onCancel} height={addsPoem ? 660 : undefined}>
      <div className="newlist__head">
        <button className="link-btn" onClick={onCancel}>CANCEL</button>
        <span className="t-eyebrow t-eyebrow--accent">{edit ? 'LIST' : 'NEW LIST'}</span>
        <span aria-hidden style={{ width: 56 }} />
      </div>
      <label className="stack gap-8">
        <span className="t-eyebrow">NAME</span>
        <input className="name-in" aria-label="List name" placeholder="Name this list" value={name} disabled={edit?.isDefault} onChange={(e) => setName(e.target.value)} autoFocus={!edit} />
      </label>
      {!edit && suggestions.length > 0 && (
        <div className="stack gap-8">
          <span className="t-eyebrow">SUGGESTED</span>
          <div className="row gap-8" style={{ flexWrap: 'wrap' }}>{suggestions.map((x) => <button key={x} className="suggest" onClick={() => setName(x)}>{x}</button>)}</div>
        </div>
      )}
      {!edit?.isDefault && (
        <div className="stack gap-10">
          <span className="t-eyebrow">ICON</span>
          <div className="row gap-8">
            <ListIcon list={{ name: name || 'ق', iconLetter: letter, colour, isDefault: false }} size={52} />
            <span className="icon-divider" aria-hidden />
            <div className="row gap-8" role="radiogroup" aria-label="Icon letter">
              <button role="radio" aria-checked={letter === ''} className="letter" onClick={() => setLetter('')}>{auto}<small>AUTO</small></button>
              {choices.slice(0, 1).map((l) => <button key={l} role="radio" aria-checked={letter === l} className="letter" onClick={() => setLetter(l)}>{l}</button>)}
            </div>
            <button className="letter letter--choose" aria-haspopup="dialog" onClick={() => setDrawer(true)}>CHOOSE</button>
          </div>
        </div>
      )}
      <div className="stack gap-10">
        <span className="t-eyebrow">COLOUR</span>
        <div className="row" style={{ gap: 14 }} role="radiogroup" aria-label="Colour">
          {LIST_COLOURS.map((c) => <button key={c.hex} role="radio" aria-checked={colour === c.hex} aria-label={c.name} className="swatch" style={{ background: c.hex }} onClick={() => setColour(c.hex)} />)}
        </div>
      </div>
      <button className="btn btn--primary btn--block" style={{ marginTop: 'auto' }} disabled={!name.trim()} onClick={save}>
        {edit ? 'Done' : addsPoem ? 'Create and add this poem' : 'Create list'}
      </button>
    </Sheet>
  );
}

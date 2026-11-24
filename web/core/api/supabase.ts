// Per-user data through Supabase, as the signed-in user, under row-level
// security. The rules (Favorites, list deletion, own lists only, read counts)
// live in the database: see supabase/migrations/20261124000001_redesign2_v2_v3.sql.
// Browser-free: the client is injected, so a native app can reuse this file.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Api } from './contract';
import { NotFoundError } from './contract';
import type { Prefs, Progress, UserList } from '../types';
import { DEFAULT_PREFS, mergePrefs } from '../logic/prefs';
import { readJSON, writeJSON } from '../storage';

type Per = Pick<Api, 'profile' | 'keeps' | 'lists' | 'library'> & { progress: Pick<Api['collections'], 'progress' | 'setProgress'> };

const LOCAL_PREFS = 'prefs.local';
const LOCAL_PROGRESS = 'progress.local';

function check<T>(r: { data: T; error: { message: string; code?: string } | null }, what: string): NonNullable<T> {
  if (r.error) throw Object.assign(new Error(`${what}: ${r.error.message}`), { code: r.error.code });
  return r.data as NonNullable<T>;
}

export function makeSupabaseApi(sb: SupabaseClient, opts: { redirectTo?: () => string } = {}): Per {
  const uid = async () => (await sb.auth.getSession()).data.session?.user.id ?? null;
  const need = async () => {
    const id = await uid();
    if (!id) throw Object.assign(new Error('Sign in first'), { code: 'signed_out' });
    return id;
  };
  let defaults: Prefs | null = null;
  const loadDefaults = async () => {
    if (defaults) return defaults;
    const r = await sb.from('settings_defaults').select('prefs').maybeSingle();
    defaults = mergePrefs(DEFAULT_PREFS, (r.data?.prefs as Partial<Prefs>) ?? {});
    return defaults;
  };
  const poetIdOf = async (slug: string) => {
    const r = await sb.from('poets').select('id').eq('slug', slug).maybeSingle();
    if (!r.data) throw new NotFoundError('poet');
    return r.data.id as number;
  };
  const collectionIdOf = async (slug: string) => {
    const r = await sb.from('collections').select('id').eq('slug', slug).maybeSingle();
    if (!r.data) throw new NotFoundError('collection');
    return r.data.id as number;
  };

  return {
    profile: {
      async get() {
        const d = await loadDefaults();
        const id = await uid();
        if (!id) return mergePrefs(d, readJSON<Partial<Prefs>>(LOCAL_PREFS, {})); // signed out: defaults + this device
        const r = await sb.from('user_settings').select('prefs, display_name').eq('user_id', id).maybeSingle();
        const p = mergePrefs(d, (r.data?.prefs as Partial<Prefs>) ?? {});
        if (r.data?.display_name) p.displayName = r.data.display_name as string;
        return p;
      },
      async set(patch) {
        const id = await uid();
        const current = await this.get();
        const next = mergePrefs(await loadDefaults(), { ...current, ...patch });
        if (!id) {
          writeJSON(LOCAL_PREFS, next);
          return next;
        }
        const { displayName, ...prefs } = next;
        check(await sb.from('user_settings').upsert({ user_id: id, prefs, ...(displayName ? { display_name: displayName } : {}) }, { onConflict: 'user_id' }), 'settings');
        return next;
      },
      async account() {
        const u = (await sb.auth.getSession()).data.session?.user;
        if (!u) return { signedIn: false };
        const provider = u.app_metadata?.provider === 'google' ? 'google' : 'apple';
        return { signedIn: true, provider, name: (u.user_metadata?.full_name as string | undefined) ?? undefined };
      },
      async signIn(provider) {
        const r = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: opts.redirectTo?.() } });
        if (r.error) throw new Error(`sign in: ${r.error.message}`);
      },
      async signOut() {
        await sb.auth.signOut();
      },
    },
    keeps: {
      async list() {
        const id = await uid();
        if (!id) return [];
        const r = check(await sb.from('saved_poems').select('poem_id').eq('user_id', id).not('poem_id', 'is', null).order('saved_at', { ascending: false }), 'keeps');
        return r.map((x) => String(x.poem_id));
      },
      async keep(poemId) {
        const id = await need();
        const r = await sb.from('saved_poems').insert({ user_id: id, poem_id: Number(poemId) });
        if (r.error && r.error.code !== '23505') check(r, 'keep'); // already kept is fine
      },
      async unkeep(ids) {
        const id = await need();
        check(await sb.from('saved_poems').delete().eq('user_id', id).in('poem_id', ids.map(Number)), 'unkeep');
      },
    },
    lists: {
      async all() {
        const id = await uid();
        if (!id) return [];
        const [lists, kept] = await Promise.all([
          sb.from('user_lists').select('id, name, colour, icon_letter, is_default, updated_at').eq('user_id', id),
          sb.from('saved_poems').select('poem_id, list_ids').eq('user_id', id).not('poem_id', 'is', null).order('saved_at', { ascending: false }),
        ]);
        const rows = check(lists, 'lists');
        const keeps = check(kept, 'keeps');
        const out: UserList[] = rows.map((l) => ({
          id: l.id, name: l.name, colour: l.colour, iconLetter: l.icon_letter, isDefault: l.is_default,
          updatedAt: Date.parse(l.updated_at),
          poemIds: keeps.filter((k) => (k.list_ids as string[]).includes(l.id)).map((k) => String(k.poem_id)),
        }));
        return out.sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : b.updatedAt - a.updatedAt));
      },
      async create(input) {
        const id = await need();
        const r = check(await sb.from('user_lists').insert({ user_id: id, name: input.name, colour: input.colour, icon_letter: input.iconLetter }).select().single(), 'new list');
        return { id: r.id, name: r.name, colour: r.colour, iconLetter: r.icon_letter, isDefault: r.is_default, poemIds: [], updatedAt: Date.parse(r.updated_at) };
      },
      async update(listId, patch) {
        const row: Record<string, string> = {};
        if (patch.name !== undefined) row.name = patch.name;
        if (patch.colour !== undefined) row.colour = patch.colour;
        if (patch.iconLetter !== undefined) row.icon_letter = patch.iconLetter;
        const r = check(await sb.from('user_lists').update(row).eq('id', listId).select().single(), 'list');
        return { id: r.id, name: r.name, colour: r.colour, iconLetter: r.icon_letter, isDefault: r.is_default, poemIds: [], updatedAt: Date.parse(r.updated_at) };
      },
      async remove(listId) {
        check(await sb.from('user_lists').delete().eq('id', listId), 'delete list');
      },
      async setPoemLists(poemId, listIds) {
        const id = await need();
        check(await sb.from('saved_poems').update({ list_ids: listIds }).eq('user_id', id).eq('poem_id', Number(poemId)), 'lists');
      },
    },
    library: {
      async follows() {
        const id = await uid();
        if (!id) return [];
        const r = check(await sb.from('poet_follows').select('poets(slug)').eq('user_id', id).order('followed_at', { ascending: false }), 'follows');
        return r.map((x) => (x.poets as unknown as { slug: string }).slug);
      },
      async follow(slug, on) {
        const id = await need();
        const poetId = await poetIdOf(slug);
        if (on) {
          const r = await sb.from('poet_follows').insert({ user_id: id, poet_id: poetId });
          if (r.error && r.error.code !== '23505') check(r, 'follow');
        } else {
          check(await sb.from('poet_follows').delete().eq('user_id', id).eq('poet_id', poetId), 'unfollow');
        }
      },
      async reads() {
        const id = await uid();
        if (!id) return {};
        const r = check(await sb.from('poem_reads').select('poem_id, read_count').eq('user_id', id), 'reads');
        return Object.fromEntries(r.map((x) => [String(x.poem_id), x.read_count as number]));
      },
      async markRead(poemId) {
        if (!(await uid())) return; // reads are only kept for signed-in readers
        check(await sb.rpc('mark_read', { p_poem_id: Number(poemId) }), 'read');
      },
    },
    progress: {
      async progress() {
        const id = await uid();
        if (!id) return readJSON<Progress[]>(LOCAL_PROGRESS, []);
        const r = check(await sb.from('progress').select('position, saved, completed_at, collections(slug)').eq('user_id', id), 'progress');
        return r.map((x) => ({
          slug: (x.collections as unknown as { slug: string }).slug, position: x.position as number, saved: x.saved as boolean,
          completedAt: x.completed_at ? Date.parse(x.completed_at as string) : undefined,
        }));
      },
      async setProgress(p) {
        const id = await uid();
        if (!id) {
          writeJSON(LOCAL_PROGRESS, [p, ...readJSON<Progress[]>(LOCAL_PROGRESS, []).filter((x) => x.slug !== p.slug)]);
          return;
        }
        const collectionId = await collectionIdOf(p.slug);
        check(await sb.from('progress').upsert({
          user_id: id, collection_id: collectionId, position: p.position, saved: p.saved,
          completed_at: p.completedAt ? new Date(p.completedAt).toISOString() : null,
        }, { onConflict: 'user_id,collection_id' }), 'progress');
      },
    },
  };
}

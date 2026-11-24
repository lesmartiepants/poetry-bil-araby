// Live implementations, filled in slice by slice. A domain flips to 'live' in
// core/sources.ts only once its methods here are real.
import type { Api } from '../contract';
import { mockApi } from '../mock';

let base = '';
export function setApiBase(url: string) {
  base = url.replace(/\/$/, '');
}
export async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw Object.assign(new Error(`${res.status} ${path}`), { status: res.status });
  return (await res.json()) as T;
}

export const liveApi: Api = { ...mockApi };

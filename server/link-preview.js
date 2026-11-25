import { env } from 'node:process';

const apiOrigin = env.VITE_API_URL || 'https://poetry-bil-araby-2mb0.onrender.com';

export async function fetchPreviewPoem(id) {
  const url = new URL(`/api/v2/poems/${id}`, apiOrigin);
  const response = await fetch(url, { signal: AbortSignal.timeout(4500) });
  return response.ok ? response.json() : null;
}

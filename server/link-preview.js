import { env } from 'node:process';

const apiOrigin = env.VITE_API_URL || 'https://poetry-bil-araby-2mb0.onrender.com';

async function fetchPreviewData(path) {
  const url = new URL(`/api/v2/${path}`, apiOrigin);
  const response = await fetch(url, { signal: AbortSignal.timeout(4500) });
  return response.ok ? response.json() : null;
}

export function fetchPreviewPoem(id) {
  return fetchPreviewData(`poems/${id}`);
}

const collectionPath = /^\/new\/(collection|journey)\/([a-z0-9_-]+)\/?$/i;
const poetPath = /^\/new\/poet\/([a-z0-9_-]+)(\/about)?\/?$/i;
const shelfPath = /^\/new\/explore\/(era|feeling|difficulty)\/([a-z0-9_-]+)\/?$/;
const shelves = {
  era: {
    endpoint: 'eras',
    key: 'slug',
    name: (era) => era.nameEn || era.nameAr,
    title: (name) => `Explore the Era ${name}`,
  },
  feeling: {
    endpoint: 'feelings',
    key: 'key',
    name: (feeling) => feeling.en || feeling.ar,
    title: (name) => `Explore Poems About ${name}`,
  },
  difficulty: {
    endpoint: 'bands',
    key: 'key',
    name: (band) => band.en || band.ar,
    title: (name) => `Explore ${name} Poems`,
  },
};

export async function fetchNamedPreview(pathname) {
  if (pathname === '/new/journey' || pathname === '/new/journey/') {
    return { title: 'Read Tonight’s Poem' };
  }

  const collection = collectionPath.exec(pathname);
  if (collection) {
    const [, kind, slug] = collection;
    const item = await fetchPreviewData(`collections/${slug}`);
    const name = item?.titleEn || item?.titleAr;
    if (!name) return null;
    return {
      title: kind === 'journey' ? `Take the Journey ${name}` : `Read the Collection ${name}`,
      description: item.subtitle || item.intro,
    };
  }

  const poet = poetPath.exec(pathname);
  if (poet) {
    const [, slug, about] = poet;
    const item = await fetchPreviewData(`poets/${slug}`);
    const name = item?.nameEn || item?.nameAr;
    if (!name) return null;
    return {
      title: about ? `Meet the Poet ${name}` : `Read Poems by ${name}`,
      description: item.bio,
    };
  }

  const shelf = shelfPath.exec(pathname);
  if (shelf) {
    const [, kind, slug] = shelf;
    const { endpoint, key, name, title } = shelves[kind];
    const items = await fetchPreviewData(`explore/${endpoint}`);
    const item = items?.find((entry) => entry[key] === slug);
    const label = item && name(item);
    return label ? { title: title(label), description: item.line } : null;
  }

  return null;
}

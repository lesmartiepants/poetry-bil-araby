import { fetchPreviewPoem } from './server/link-preview.js';
// Chat apps read the initial HTML. People continue to the normal app shell.
export const config = {
  runtime: 'nodejs',
  matcher: [
    '/((?!api(?:/|$)|assets(?:/|$)|new/assets(?:/|$)|design-review(?:/|$)|.*\\.[^/]+$).*)',
    '/privacy.html',
    '/terms.html',
  ],
};

// Apple Messages uses the Facebook/Twitter preview agent, as observed in Nemo.
const previewAgent =
  /facebookexternalhit|facebot|twitterbot|slackbot|discordbot|whatsapp|telegrambot|linkedinbot|linkpresentation|skypeuripreview|redditbot|pinterest|embedly|applebot/i;
const poemPath = /^\/(?:new\/p|poem)\/(\d{1,10})\/?$/;
const siteName = 'Poetry بالعربي';
const siteDescription = 'Arabic poetry, read and heard.';

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (value) => value.replace(/[&<>"']/g, (char) => entities[char]);
const meta = (attribute, name, value) =>
  `<meta ${attribute}="${name}" content="${escape(String(value))}">`;

async function poemPreview(id, origin) {
  try {
    const poem = await fetchPreviewPoem(id);
    const poemTitle = poem?.titleEn || poem?.titleAr;
    if (!poemTitle) return null;
    const poet = poem.poetEn || poem.poetAr;
    const title = poet
      ? `${siteName}: Read ${poet}’s poem “${poemTitle}”`
      : `${siteName}: Read “${poemTitle}”`;
    return {
      title,
      description: [poem.poetAr, poem.firstLineAr].filter(Boolean).join(' · ') || siteDescription,
      image: new URL(`/api/og/${id}`, origin).href,
      alt: [poemTitle, poet].filter(Boolean).join(' · '),
      width: 1080,
      height: 1350,
    };
  } catch {
    return null;
  }
}

export default async function middleware(request) {
  if (request.method !== 'GET' || !previewAgent.test(request.headers.get('user-agent') ?? '')) {
    return undefined;
  }

  const url = new URL(request.url);
  // Reader state and private query parameters should stay out of preview metadata.
  const page = url.origin + url.pathname;
  const id = poemPath.exec(url.pathname)?.[1];
  const preview = (id && (await poemPreview(id, url.origin))) || {
    title: siteName,
    description: siteDescription,
    image: new URL('/link-preview.png', url.origin).href,
    alt: 'Gold mark above Poetry بالعربي',
    width: 1200,
    height: 630,
  };
  const { title, description, image, alt, width, height } = preview;
  const properties = {
    type: 'website',
    site_name: siteName,
    url: page,
    title,
    description,
    image,
    'image:type': 'image/png',
    'image:width': width,
    'image:height': height,
    'image:alt': alt,
  };
  const tags = [
    ...Object.entries(properties).map(([key, value]) => meta('property', `og:${key}`, value)),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', title),
    meta('name', 'twitter:description', description),
    meta('name', 'twitter:image', image),
    meta('name', 'twitter:image:alt', alt),
  ].join('\n');

  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title>
${tags}
</head><body><a href="${escape(page)}">${escape(title)}</a></body></html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, max-age=300',
        Vary: 'User-Agent',
      },
    }
  );
}

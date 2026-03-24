/**
 * Update Open Graph meta tags dynamically for poem deep links.
 * Helps with SEO crawlers that execute JavaScript (e.g. Google, Bing).
 * Social media crawlers (Facebook, Twitter, iMessage) need server-side rendering —
 * handled by the Vercel API route.
 */

/**
 * Update OG meta tags in the document head for a specific poem.
 * @param {Object} poem — { id, poet, poetArabic, title, titleArabic, arabic }
 */
export function updateOGMetaTags(poem) {
  if (!poem) return;

  const title = `${poem.titleArabic || poem.title || 'Arabic Poetry'} — ${poem.poetArabic || poem.poet || ''}`;
  const description = poem.arabic
    ? poem.arabic.split('\n').slice(0, 2).join(' ')
    : 'Discover classical and modern Arabic poetry';
  const url = poem.id ? `${window.location.origin}/poem/${poem.id}` : window.location.origin;
  const ogImage = poem.id
    ? `${window.location.origin}/api/og/${poem.id}`
    : `${window.location.origin}/favicon.svg`;

  setMeta('og:title', title);
  setMeta('og:description', description);
  setMeta('og:url', url);
  setMeta('og:image', ogImage);
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
  setMeta('twitter:url', url);
  setMeta('twitter:image', ogImage);
  setMeta('twitter:card', 'summary_large_image');

  // Update page title
  document.title = `${title} | بالعربي`;
}

/**
 * Reset OG meta tags to site defaults.
 */
export function resetOGMetaTags() {
  const defaultTitle = 'بالعربي | Poetry Bil-Araby — Arabic Poetry Explorer';
  const defaultDesc =
    'Discover classical and modern Arabic poetry with AI-powered insights, audio recitation, and a curated collection of 84,000+ poems.';
  const defaultUrl = window.location.origin;
  const defaultImage = `${window.location.origin}/favicon.svg`;

  setMeta('og:title', defaultTitle);
  setMeta('og:description', defaultDesc);
  setMeta('og:url', defaultUrl);
  setMeta('og:image', defaultImage);
  setMeta('twitter:title', defaultTitle);
  setMeta('twitter:description', defaultDesc);
  setMeta('twitter:url', defaultUrl);
  setMeta('twitter:image', defaultImage);
  setMeta('twitter:card', 'summary');

  document.title = 'بالعربي | Poetry Bil-Araby';
}

/** Set or create a meta tag */
function setMeta(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

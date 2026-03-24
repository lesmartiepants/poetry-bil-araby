/* global process */
/**
 * Vercel Serverless Function: Dynamic OG Image for Poem Links
 *
 * Proxies to the Express backend's OG image endpoint to generate
 * an SVG share card for social media link previews.
 *
 * Usage: /api/og/[id] → fetches poem from backend, returns SVG
 */

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id || !/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid poem ID' });
  }

  const apiUrl =
    process.env.API_URL || process.env.BACKEND_URL || 'https://poetry-bil-araby.onrender.com';

  try {
    const response = await fetch(`${apiUrl}/api/poems/${id}/og-image`);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Poem not found' });
    }

    const svg = await response.text();

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
    return res.send(svg);
  } catch (error) {
    console.error('OG image generation error:', error.message);
    return res.status(500).json({ error: 'Failed to generate OG image' });
  }
}

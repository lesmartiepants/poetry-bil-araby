import { fetchPreviewPoem } from '../../server/link-preview.js';
import { renderCardPng } from '../../server/share-card.js';

export default async function handler(req, res) {
  const { id } = req.query;
  if (typeof id !== 'string' || !/^\d{1,10}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid poem ID' });
  }

  try {
    const poem = await fetchPreviewPoem(id);
    if (!poem?.lines?.length) return res.status(404).json({ error: 'Poem not found' });

    const png = renderCardPng(
      {
        titleAr: poem.titleAr ?? '',
        titleEn: poem.titleEn ?? '',
        poetAr: poem.poetAr ?? '',
        poetEn: poem.poetEn ?? '',
        lines: poem.lines.slice(0, 2),
        showEn: true,
        colourway: 'obsidian',
      },
      { preview: true }
    );
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
    return res.send(png);
  } catch (error) {
    console.error('OG image generation error:', error.message);
    return res.status(500).json({ error: 'Failed to generate OG image' });
  }
}

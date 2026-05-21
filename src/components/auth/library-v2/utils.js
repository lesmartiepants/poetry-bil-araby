// Shared utilities for library-v2 variants.
export const formatRelative = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString();
};

export const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];

// Group saved poems into "Today / This week / Earlier" buckets for the
// Khazana time-rail.  Returns an ordered array so the UI can render labels.
export const groupByRecency = (poems) => {
  const today = [];
  const thisWeek = [];
  const earlier = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  poems.forEach((p) => {
    const t = p.saved_at ? new Date(p.saved_at).getTime() : 0;
    const ageDays = (now - t) / dayMs;
    if (ageDays < 1) today.push(p);
    else if (ageDays < 7) thisWeek.push(p);
    else earlier.push(p);
  });
  return [
    { id: 'today', label: 'Today', labelAr: 'اليوم', items: today },
    { id: 'week', label: 'This week', labelAr: 'هذا الأسبوع', items: thisWeek },
    { id: 'earlier', label: 'Earlier', labelAr: 'سابقاً', items: earlier },
  ].filter((g) => g.items.length > 0);
};

export const firstLine = (text = '') => (text.split('\n')[0] || '').trim();
export const firstTwoLines = (text = '') => text.split('\n').slice(0, 2).join(' · ').trim();

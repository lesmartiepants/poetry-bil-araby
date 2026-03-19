/**
 * Returns the subset of `poems` that match the given `category` filter.
 * Category is compared case-insensitively against both the English `poet` field
 * and the Arabic `poetArabic` field, as well as each poem's tags.
 * Returns `poems` unchanged when `category` is 'All'.
 */
export function filterPoemsByCategory(poems, category) {
  if (category === 'All') return poems;
  const searchStr = category.toLowerCase();
  return poems.filter(
    (p) =>
      (p?.poet || '').toLowerCase().includes(searchStr) ||
      (p?.poetArabic || '').toLowerCase().includes(searchStr) ||
      (Array.isArray(p?.tags) && p.tags.some((t) => String(t).toLowerCase() === searchStr))
  );
}

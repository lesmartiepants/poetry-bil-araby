/**
 * Historical eras and centuries.
 *
 * Era is a POET-level facet (`poets.era_id`) and century is a poem-level one
 * (`poems.century`, era-derived). Both are filterable via
 * `GET /api/poems/by-category?era=&century=`, but neither has a listing
 * endpoint — there is no `/api/eras`. This set is a stable 8 rows mirroring
 * ERA_CENTURY in categorization/config.py, so it lives client-side.
 *
 * TODO: if eras ever become editable data, add `GET /api/eras` and fetch this
 * instead of hardcoding it here.
 */
export const ERAS = [
  { id: 5, en: 'Pre-Islamic', ar: 'جاهلي' },
  { id: 1, en: 'Early Islam', ar: 'صدر الإسلام' },
  { id: 4, en: 'Umayyad', ar: 'أموي' },
  { id: 2, en: 'Abbasid', ar: 'عباسي' },
  { id: 7, en: 'Andalusian', ar: 'أندلسي' },
  { id: 6, en: 'Ayyubid', ar: 'أيوبي' },
  { id: 8, en: 'Mamluk', ar: 'مملوكي' },
  { id: 3, en: 'Late / Modern', ar: 'متأخر' },
];

/** Distinct centuries (CE) derived from era, ascending. */
export const CENTURIES = [6, 7, 8, 9, 11, 13, 14];

/** 1 -> "1st", 2 -> "2nd", 13 -> "13th" */
export const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

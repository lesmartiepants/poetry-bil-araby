/**
 * Adapter: shipped categorization schema -> the flat "tag" shape the ported
 * onboarding / tag components were written against (PR #517).
 *
 * #517 proposed its own tags tables (tags, tag_categories, poem_tags). That data
 * layer was superseded before it landed by the categorization schema now on main
 * (category_dimensions / category_values / category_families / poem_categories),
 * exposed read-only through `GET /api/categories` and `GET /api/poems/by-category`.
 *
 * Rather than rewrite every component's rendering logic, this module maps:
 *
 *   category_dimensions  ->  "tag category"  ({ slug, name_ar, name_en })
 *   category_values      ->  "tag"           ({ id, name_ar, name_en, category_slug })
 *
 * A tag `id` is the composite `"<dimension>:<value>"` (e.g. `"mood:joy"`), which
 * is stable, human-readable, and round-trips into by-category query params.
 *
 * Everything here degrades to empty arrays when the categorization migration has
 * not run (the backend's `hasCategorization` flag makes /api/categories return
 * `{dimensions: [], families: []}`), so callers render an empty state instead of
 * crashing or hanging.
 */

import { fetchCategories } from './database.js';

/** Separator between the dimension key and the value key in a composite tag id. */
export const TAG_ID_SEP = ':';

/** Build a composite tag id from a dimension key and a value key. */
export const makeTagId = (dimension, value) => `${dimension}${TAG_ID_SEP}${value}`;

/**
 * Split a composite tag id back into its parts.
 * @returns {{dimension: string, value: string} | null} null when malformed.
 */
export const parseTagId = (id) => {
  if (typeof id !== 'string') return null;
  const idx = id.indexOf(TAG_ID_SEP);
  if (idx <= 0 || idx === id.length - 1) return null;
  return { dimension: id.slice(0, idx), value: id.slice(idx + 1) };
};

/**
 * Fetch the taxonomy and flatten it into `{ categories, tags, dimensions }`.
 *
 * `categories` and `tags` use #517's field names so the ported components render
 * unchanged; `dimensions` is the raw API payload for callers that want it.
 *
 * @returns {Promise<{categories: Array, tags: Array, dimensions: Array, families: Array}>}
 */
export const fetchTagTaxonomy = async () => {
  const { dimensions, families } = await fetchCategories();

  const categories = dimensions.map((d) => ({
    slug: d.key,
    name_ar: d.label_ar,
    name_en: d.label_en,
    cardinality: d.cardinality,
  }));

  const tags = dimensions.flatMap((d) =>
    (d.values || []).map((v) => ({
      id: makeTagId(d.key, v.key),
      slug: v.key,
      dimension: d.key,
      category_slug: d.key,
      name_ar: v.label_ar,
      name_en: v.label_en,
      poem_count: v.poem_count,
    }))
  );

  return { categories, tags, dimensions, families };
};

/**
 * Fetch the values of a single dimension (e.g. 'mood', 'topic', 'motif') as
 * picker options.
 *
 * Returns `[]` when the dimension is absent — pre-migration, or simply a
 * dimension that hasn't been seeded. Callers decide whether to show an empty
 * state or fall back to a static list.
 *
 * @param {string} dimensionKey
 * @returns {Promise<Array<{slug: string, name_ar: string, name_en: string, poem_count: number}>>}
 */
export const fetchDimensionValues = async (dimensionKey) => {
  const { dimensions } = await fetchCategories();
  const dim = dimensions.find((d) => d.key === dimensionKey);
  if (!dim) return [];
  return (dim.values || []).map((v) => ({
    slug: v.key,
    name_ar: v.label_ar,
    name_en: v.label_en,
    poem_count: v.poem_count,
  }));
};

/**
 * Convert a set/array of composite tag ids into `by-category` query params.
 *
 * Values are grouped per dimension (the API takes one comma-separated param per
 * dimension key). The operator maps onto the API's per-dimension `{dim}Mode`:
 * 'AND' requires a poem to carry every selected value of that dimension, 'OR'
 * (the default) matches any. Note the API always ANDs *across* dimensions, so an
 * 'AND' operator spanning e.g. mood + topic behaves the same either way.
 *
 * @param {Iterable<string>} tagIds
 * @param {'AND'|'OR'} [operator]
 * @returns {Object} filter object for `fetchPoemsByCategory`
 */
export const tagIdsToFilters = (tagIds, operator = 'OR') => {
  const byDim = {};
  for (const id of tagIds || []) {
    const parsed = parseTagId(id);
    if (!parsed) continue;
    (byDim[parsed.dimension] ||= []).push(parsed.value);
  }
  const filters = {};
  for (const [dim, values] of Object.entries(byDim)) {
    filters[dim] = values.join(',');
    if (operator === 'AND' && values.length > 1) filters[`${dim}Mode`] = 'and';
  }
  return filters;
};

/**
 * Count the category labels attached to a poem returned by `by-category`
 * (its `categories` JSONB holds `{moods: [], topics: [], motifs: []}`).
 * Used for the "most tagged" client-side sort.
 *
 * @param {Object} poem
 * @returns {number}
 */
export const countPoemLabels = (poem) => {
  const c = poem?.categories;
  if (!c || typeof c !== 'object') return 0;
  return Object.values(c).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
};

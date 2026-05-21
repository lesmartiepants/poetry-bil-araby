/**
 * Tags API service — fetch, filter, and manage poem tags via the Express backend.
 */

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Fetch all tags (paginated).
 *
 * @param {Object} [options]
 * @param {number} [options.page=1]
 * @param {number} [options.limit=100]
 * @param {string} [options.search] - Optional search string
 * @param {string} [options.category] - Filter by category slug
 * @returns {Promise<{tags: Array, pagination: Object}>}
 */
export const fetchTags = async ({ page = 1, limit = 100, search, category } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  const res = await fetch(`${apiUrl}/api/tags?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch tags: ${res.status}`);
  return res.json();
};

/**
 * Fetch tags for a specific poem.
 *
 * @param {string|number} poemId
 * @returns {Promise<Array<{id, name_ar, name_en, confidence_score, source}>>}
 */
export const fetchPoemTags = async (poemId) => {
  const res = await fetch(`${apiUrl}/api/poems/${poemId}/tags`);
  if (!res.ok) throw new Error(`Failed to fetch tags for poem ${poemId}: ${res.status}`);
  return res.json();
};

/**
 * Fetch tag categories (hierarchy roots).
 *
 * @returns {Promise<Array<{slug, name_ar, name_en, children}>>}
 */
export const fetchTagCategories = async () => {
  const res = await fetch(`${apiUrl}/api/tags/categories`);
  if (!res.ok) throw new Error(`Failed to fetch tag categories: ${res.status}`);
  return res.json();
};

/**
 * Add a tag to a poem (admin/manual).
 *
 * @param {string|number} poemId
 * @param {string|number} tagId
 * @param {string} [apiKey] - X-API-Key header value
 * @returns {Promise<Object>}
 */
export const addPoemTag = async (poemId, tagId, apiKey) => {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;
  const res = await fetch(`${apiUrl}/api/poems/${poemId}/tags`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tag_id: tagId }),
  });
  if (!res.ok) throw new Error(`Failed to add tag: ${res.status}`);
  return res.json();
};

/**
 * Remove a tag from a poem (admin/manual).
 *
 * @param {string|number} poemId
 * @param {string|number} tagId
 * @param {string} [apiKey]
 * @returns {Promise<void>}
 */
export const removePoemTag = async (poemId, tagId, apiKey) => {
  const headers = {};
  if (apiKey) headers['X-API-Key'] = apiKey;
  const res = await fetch(`${apiUrl}/api/poems/${poemId}/tags/${tagId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error(`Failed to remove tag: ${res.status}`);
};

/**
 * Create a new tag (admin only).
 *
 * @param {Object} tag
 * @param {string} tag.name_ar
 * @param {string} tag.name_en
 * @param {string} [tag.category_slug]
 * @param {string} [apiKey]
 * @returns {Promise<Object>}
 */
export const createTag = async (tag, apiKey) => {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;
  const res = await fetch(`${apiUrl}/api/tags`, {
    method: 'POST',
    headers,
    body: JSON.stringify(tag),
  });
  if (!res.ok) throw new Error(`Failed to create tag: ${res.status}`);
  return res.json();
};

/**
 * Update an existing tag (admin only).
 *
 * @param {string|number} tagId
 * @param {Object} updates
 * @param {string} [apiKey]
 * @returns {Promise<Object>}
 */
export const updateTag = async (tagId, updates, apiKey) => {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;
  const res = await fetch(`${apiUrl}/api/tags/${tagId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update tag: ${res.status}`);
  return res.json();
};

/**
 * Delete a tag (admin only).
 *
 * @param {string|number} tagId
 * @param {string} [apiKey]
 * @returns {Promise<void>}
 */
export const deleteTag = async (tagId, apiKey) => {
  const headers = {};
  if (apiKey) headers['X-API-Key'] = apiKey;
  const res = await fetch(`${apiUrl}/api/tags/${tagId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error(`Failed to delete tag: ${res.status}`);
};

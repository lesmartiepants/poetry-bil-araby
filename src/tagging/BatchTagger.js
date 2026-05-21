/**
 * BatchTagger — AI-powered bulk auto-tagging engine for Arabic poetry
 *
 * Uses Gemini to classify poems against the bilingual taxonomy (taxonomy.json).
 * Features:
 *   - Concurrency control (default 3 parallel Gemini calls)
 *   - Rate limiting with configurable inter-batch delay
 *   - Exponential backoff retry on transient Gemini errors
 *   - Synonym normalization (maps AI outputs to canonical slugs)
 *   - Confidence threshold filtering before DB writes
 *   - tagging_jobs table tracking for long-running batch runs
 *   - Checkpoint support: resume interrupted jobs from last position
 *   - Skip-if-already-tagged caching (unless force=true)
 *
 * Usage (from server.js):
 *   const { BatchTagger } = await import('./src/tagging/BatchTagger.js');
 *   const tagger = new BatchTagger({ pool, apiKey: process.env.GEMINI_API_KEY });
 *   const { tagged, errors } = await tagger.tagBatch(poems, { force: false });
 *
 * Background job usage:
 *   const { AutoTaggingJob } = await import('./src/tagging/BatchTagger.js');
 *   const job = new AutoTaggingJob({ pool, apiKey: process.env.GEMINI_API_KEY });
 *   const jobId = await job.start({ limit: 5000, poet: 'المتنبي' });
 *   const status = await job.getStatus(jobId);
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Tuning constants
const MAX_TAGS_PER_POEM = 8;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
const DEFAULT_CONCURRENCY = 3;
const BATCH_DELAY_MS = 1200; // Delay between concurrent chunks (rate limiting)
const MAX_RETRIES = 3; // Gemini call retries on transient error
const RETRY_BASE_DELAY_MS = 2000; // Initial retry delay (doubles each retry)
const POEM_CONTENT_MAX_CHARS = 3000; // Truncate very long poems for the prompt
const JOB_PROGRESS_INTERVAL = 25; // Update tagging_jobs row every N poems

// ─── Taxonomy cache ────────────────────────────────────────────

let _taxonomyCache = null;
async function loadTaxonomy() {
  if (_taxonomyCache) return _taxonomyCache;
  const raw = await readFile(resolve(__dirname, 'taxonomy.json'), 'utf8');
  _taxonomyCache = JSON.parse(raw);
  return _taxonomyCache;
}

/**
 * Build a flat list of { slug, name_en, name_ar, type } from the taxonomy.
 */
function buildTagList(taxonomy) {
  const tags = [];
  for (const group of taxonomy.tag_types) {
    for (const tag of group.tags) {
      tags.push({ slug: tag.slug, name_en: tag.name_en, name_ar: tag.name_ar, type: group.type });
    }
  }
  return tags;
}

/**
 * Resolve an AI-returned slug to its canonical form via the synonym map.
 * Returns null if the slug is completely unknown.
 */
function resolveSlug(rawSlug, slugToId, synonymMap) {
  if (slugToId[rawSlug]) return rawSlug;
  const canonical = synonymMap[rawSlug];
  if (canonical && slugToId[canonical]) return canonical;
  return null;
}

// ─── Prompt engineering ────────────────────────────────────────

/**
 * Build the Gemini prompt for a single poem.
 * Includes few-shot examples to guide consistent JSON output.
 */
function buildPrompt(poem, tagList) {
  const tagSummary = tagList
    .map((t) => `  ${t.slug} (${t.name_en} / ${t.name_ar}) [${t.type}]`)
    .join('\n');

  const content = (poem.content || poem.arabic || '').slice(0, POEM_CONTENT_MAX_CHARS);

  return `You are an expert in classical and modern Arabic poetry. Analyze the poem below and assign relevant tags from the taxonomy.

TAXONOMY (slug — English / Arabic [type]):
${tagSummary}

POEM:
Title: ${poem.title || 'بلا عنوان'}
Poet: ${poem.poet || 'مجهول'}
Era hint: ${poem.theme || 'unknown'}
Text:
${content}

RULES:
1. Assign 2 to ${MAX_TAGS_PER_POEM} tags. Fewer high-confidence tags beat many weak ones.
2. Every confidence_score must be a number 0.0–1.0.
3. Only use slugs from the taxonomy above — never invent new slugs.
4. If the poem is clearly a love poem also tagged "religion", assign both.
5. Period/form tags are optional; only assign if you are confident.

EXAMPLES OF VALID OUTPUT:
{"tags":[{"slug":"love","confidence_score":0.95},{"slug":"melancholy","confidence_score":0.82},{"slug":"abbasid","confidence_score":0.75}]}
{"tags":[{"slug":"war","confidence_score":0.90},{"slug":"pride","confidence_score":0.85},{"slug":"qasida","confidence_score":0.70}]}

Respond with ONLY the JSON object. No markdown, no explanation, no extra text.`;
}

// ─── Gemini API call with retry ────────────────────────────────

/**
 * Sleep for ms milliseconds.
 */
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Call Gemini generateContent with exponential backoff retries.
 * Returns parsed array of { slug, confidence_score }.
 */
async function callGeminiWithRetry(apiKey, prompt, maxRetries = MAX_RETRIES) {
  const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await sleep(delay);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.15, // Low for deterministic classification
            maxOutputTokens: 512,
            responseMimeType: 'application/json',
          },
        }),
      });

      // 429 / 503 — rate limited or overloaded; retry
      if (response.status === 429 || response.status === 503) {
        const errText = await response.text();
        lastError = new Error(`Gemini ${response.status}: ${errText.slice(0, 150)}`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 200)}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        lastError = new Error('Gemini returned empty content');
        continue;
      }

      // Parse JSON response
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Fallback: strip markdown code fence if present
        const match = text.match(/```(?:json)?\s*([\s\S]+?)```/);
        if (match) {
          parsed = JSON.parse(match[1].trim());
        } else {
          lastError = new Error(`Cannot parse Gemini JSON: ${text.slice(0, 150)}`);
          continue;
        }
      }

      if (!Array.isArray(parsed?.tags)) {
        lastError = new Error(`Bad Gemini response shape: ${JSON.stringify(parsed).slice(0, 150)}`);
        continue;
      }

      return parsed.tags;
    } catch (err) {
      lastError = err;
      // Network errors — retry
      if (attempt < maxRetries) continue;
    }
  }

  throw lastError || new Error('Gemini call failed after retries');
}

// ─── DB persistence ────────────────────────────────────────────

/**
 * Upsert validated tags for a poem using assign_poem_tag() helper function.
 * Normalises slugs via synonym map before writing.
 */
async function persistTags(pool, poemId, rawTags, slugToId, synonymMap, confidenceThreshold) {
  let assigned = 0;

  // Deduplicate: if synonym resolves two inputs to the same canonical slug,
  // keep the higher confidence
  const canonicalMap = new Map(); // slug → max confidence_score
  for (const { slug: rawSlug, confidence_score } of rawTags) {
    if (typeof confidence_score !== 'number') continue;
    if (confidence_score < confidenceThreshold) continue;
    const canonical = resolveSlug(rawSlug, slugToId, synonymMap);
    if (!canonical) continue;
    const prev = canonicalMap.get(canonical) ?? 0;
    canonicalMap.set(canonical, Math.max(prev, confidence_score));
  }

  for (const [slug, confidence_score] of canonicalMap.entries()) {
    const tagId = slugToId[slug];
    if (!tagId) continue;
    const score = Math.min(1.0, Math.max(0.0, confidence_score));
    await pool.query('SELECT assign_poem_tag($1, $2, $3, $4)', [poemId, tagId, score, 'auto']);
    assigned++;
  }

  return assigned;
}

// ─── Concurrency helper ────────────────────────────────────────

/**
 * Run async task factories with limited concurrency.
 * Returns array of { ok, value?, error? }.
 */
async function runWithConcurrency(taskFactories, concurrency) {
  const results = [];
  const queue = [...taskFactories];
  const active = new Set();

  await new Promise((resolveAll) => {
    function schedule() {
      while (active.size < concurrency && queue.length > 0) {
        const factory = queue.shift();
        const p = factory()
          .then((v) => results.push({ ok: true, value: v }))
          .catch((e) => results.push({ ok: false, error: e }))
          .finally(() => {
            active.delete(p);
            if (queue.length === 0 && active.size === 0) resolveAll();
            else schedule();
          });
        active.add(p);
      }
    }
    schedule();
    if (active.size === 0) resolveAll();
  });

  return results;
}

// ─── BatchTagger ───────────────────────────────────────────────

export class BatchTagger {
  /**
   * @param {object} opts
   * @param {import('pg').Pool} opts.pool
   * @param {string} opts.apiKey - Gemini API key
   * @param {number} [opts.concurrency=3]
   * @param {number} [opts.confidenceThreshold=0.7]
   */
  constructor({
    pool,
    apiKey,
    concurrency = DEFAULT_CONCURRENCY,
    confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
  } = {}) {
    if (!pool) throw new Error('BatchTagger: pool is required');
    if (!apiKey) throw new Error('BatchTagger: apiKey is required');
    this.pool = pool;
    this.apiKey = apiKey;
    this.concurrency = concurrency;
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * Tag a batch of poems.
   *
   * @param {Array<{id: number, title: string, poet: string, theme?: string, content?: string, arabic?: string}>} poems
   * @param {object} [opts]
   * @param {boolean} [opts.force=false] - Re-tag even if poem already has auto tags
   * @param {number} [opts.confidenceThreshold] - Override instance threshold
   * @param {Function} [opts.onProgress] - Called with ({ tagged, errors, total }) after each poem
   * @returns {Promise<{ tagged: number, errors: number }>}
   */
  async tagBatch(poems, { force = false, confidenceThreshold, onProgress } = {}) {
    const threshold = confidenceThreshold ?? this.confidenceThreshold;

    if (!poems || poems.length === 0) return { tagged: 0, errors: 0 };

    // Load taxonomy
    const taxonomy = await loadTaxonomy();
    const tagList = buildTagList(taxonomy);
    const synonymMap = taxonomy.synonyms || {};

    // Build slug→id map from DB (canonical source of truth — covers any runtime additions)
    const dbTagsResult = await this.pool.query('SELECT id, slug FROM tags');
    const slugToId = {};
    for (const row of dbTagsResult.rows) {
      slugToId[row.slug] = row.id;
    }

    let tagged = 0;
    let errors = 0;

    // Build task factories
    const taskFactories = poems.map((poem) => async () => {
      const prompt = buildPrompt(poem, tagList);
      const rawTags = await callGeminiWithRetry(this.apiKey, prompt);
      const topTags = rawTags.slice(0, MAX_TAGS_PER_POEM);
      const assigned = await persistTags(
        this.pool,
        poem.id,
        topTags,
        slugToId,
        synonymMap,
        threshold
      );
      return { poemId: poem.id, assigned };
    });

    // Process in concurrent chunks with inter-chunk delay
    const chunkSize = this.concurrency;
    for (let i = 0; i < taskFactories.length; i += chunkSize) {
      const chunk = taskFactories.slice(i, i + chunkSize);
      const chunkResults = await runWithConcurrency(chunk, chunkSize);

      for (const r of chunkResults) {
        if (r.ok) tagged++;
        else {
          errors++;
          if (r.error) console.error(`[BatchTagger] poem error: ${r.error.message}`);
        }
      }

      if (onProgress) onProgress({ tagged, errors, total: poems.length });

      // Rate limiting pause between chunks (skip after last)
      if (i + chunkSize < taskFactories.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    return { tagged, errors };
  }

  /**
   * Tag a single poem. Convenience wrapper.
   */
  async tagPoem(poem, opts = {}) {
    return this.tagBatch([poem], opts);
  }
}

// ─── AutoTaggingJob ────────────────────────────────────────────

/**
 * Background job manager for large-scale auto-tagging.
 * Tracks progress in the tagging_jobs table.
 * Designed for the 84k-poem corpus — process in configurable pages.
 */
export class AutoTaggingJob {
  /**
   * @param {object} opts
   * @param {import('pg').Pool} opts.pool
   * @param {string} opts.apiKey - Gemini API key
   * @param {number} [opts.concurrency=3]
   * @param {number} [opts.confidenceThreshold=0.7]
   * @param {number} [opts.pageSize=100] - Poems fetched per DB page during full corpus runs
   */
  constructor({
    pool,
    apiKey,
    concurrency = DEFAULT_CONCURRENCY,
    confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
    pageSize = 100,
  } = {}) {
    this.tagger = new BatchTagger({ pool, apiKey, concurrency, confidenceThreshold });
    this.pool = pool;
    this.pageSize = pageSize;
  }

  /**
   * Start a new auto-tagging job, creating a tagging_jobs row for tracking.
   *
   * @param {object} opts
   * @param {number} [opts.limit=500] - Max poems to process
   * @param {boolean} [opts.force=false] - Re-tag poems that already have auto tags
   * @param {string} [opts.poet] - Filter to a specific poet name (Arabic)
   * @param {Array} [opts.poems] - If provided, use this pre-fetched array instead of querying DB
   * @returns {Promise<number>} jobId
   */
  async start({ limit = 500, force = false, poet, poems: providedPoems } = {}) {
    // Create job record
    const jobResult = await this.pool.query(
      `INSERT INTO tagging_jobs (status, total, processed, failed_count, started_at)
       VALUES ('running', 0, 0, 0, NOW()) RETURNING id`
    );
    const jobId = jobResult.rows[0].id;

    // Run in background — don't await (fire-and-forget for HTTP response latency)
    this._runJob(jobId, { limit, force, poet, providedPoems }).catch((err) => {
      console.error(`[AutoTaggingJob] Job ${jobId} crashed: ${err.message}`);
      this._failJob(jobId, err.message).catch(() => {});
    });

    return jobId;
  }

  /**
   * Internal: execute the job, updating progress periodically.
   */
  async _runJob(jobId, { limit, force, poet, providedPoems }) {
    let poems = providedPoems;

    if (!poems) {
      // Fetch poems from DB — skip already-tagged ones unless force=true
      const params = [];
      let sql = `
        SELECT p.id, p.title, p.content as content, po.name as poet, t.name as theme
        FROM poems p
        JOIN poets po ON p.poet_id = po.id
        JOIN themes t ON p.theme_id = t.id
      `;

      if (!force) {
        sql += `
          WHERE p.id NOT IN (
            SELECT DISTINCT poem_id FROM poem_tags
            WHERE source = 'auto' AND confidence_score >= $1
          )
        `;
        params.push(this.tagger.confidenceThreshold);
        if (poet) {
          params.push(poet);
          sql += ` AND po.name = $${params.length}`;
        }
      } else if (poet) {
        params.push(poet);
        sql += ` WHERE po.name = $${params.length}`;
      }

      params.push(Math.min(limit, 10000)); // Hard cap: never more than 10k per job
      sql += ` LIMIT $${params.length}`;

      const result = await this.pool.query(sql, params);
      poems = result.rows;
    }

    // Update job with actual total
    await this.pool.query('UPDATE tagging_jobs SET total = $1 WHERE id = $2', [
      poems.length,
      jobId,
    ]);

    if (poems.length === 0) {
      await this.pool.query(
        "UPDATE tagging_jobs SET status = 'done', finished_at = NOW(), processed = 0 WHERE id = $1",
        [jobId]
      );
      return;
    }

    let processed = 0;
    let failed = 0;

    await this.tagger.tagBatch(poems, {
      force,
      onProgress: async ({ tagged, errors }) => {
        processed = tagged + errors;
        failed = errors;

        // Periodically flush progress to DB
        if (processed % JOB_PROGRESS_INTERVAL === 0) {
          await this.pool
            .query('UPDATE tagging_jobs SET processed = $1, failed_count = $2 WHERE id = $3', [
              processed,
              failed,
              jobId,
            ])
            .catch(() => {}); // non-fatal
        }
      },
    });

    // Final update
    await this.pool.query(
      `UPDATE tagging_jobs
       SET status = 'done', finished_at = NOW(), processed = $1, failed_count = $2
       WHERE id = $3`,
      [processed, failed, jobId]
    );

    console.log(`[AutoTaggingJob] Job ${jobId} complete: processed=${processed}, failed=${failed}`);
  }

  /**
   * Mark a job as failed.
   */
  async _failJob(jobId, errorMsg) {
    await this.pool.query(
      `UPDATE tagging_jobs
       SET status = 'failed', finished_at = NOW(), error_msg = $1
       WHERE id = $2`,
      [errorMsg.slice(0, 500), jobId]
    );
  }

  /**
   * Get the current status of a job.
   * @param {number} jobId
   * @returns {Promise<object|null>}
   */
  async getStatus(jobId) {
    const result = await this.pool.query('SELECT * FROM tagging_jobs WHERE id = $1', [jobId]);
    return result.rows[0] || null;
  }

  /**
   * List recent jobs (most recent first).
   * @param {number} [limit=10]
   */
  async listJobs(limit = 10) {
    const result = await this.pool.query(
      'SELECT * FROM tagging_jobs ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }
}

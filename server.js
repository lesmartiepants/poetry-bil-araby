import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Sentry BEFORE all other imports per official guidance
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || undefined,
    sendDefaultPii: true,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    includeLocalVariables: true,
  });
}

import express from 'express';
import pg from 'pg';
import cors from 'cors';
import helmet from 'helmet';
import { query, param, body, validationResult } from 'express-validator';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3001;
const LOG_ENABLED = process.env.LOG_ENABLED !== 'false'; // on by default
const LOG_DEBUG = process.env.LOG_DEBUG === 'true';       // verbose DB debug, off by default

// ── Serving filters (tune what poems are returned by API) ──
const SERVING = {
  minQualityScore: 75,   // Only serve poems with quality_score >= this value
  maxVerseLines: 24,     // Only serve poems with <= this many verse lines (delimited by *)
};

// Structured logger — captured by Render/Vercel logs
const log = {
  info: (label, msg, data) => LOG_ENABLED && console.log(`[${label}]`, msg, data !== undefined ? data : ''),
  error: (label, msg, data) => console.error(`[${label}]`, msg, data !== undefined ? data : ''),
  debug: (label, msg, data) => LOG_DEBUG && console.log(`[${label}:debug]`, msg, data !== undefined ? data : ''),
};

// PostgreSQL connection pool
// Supports both DATABASE_URL (Supabase/Render) and individual env vars (local dev)
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false // Required for Supabase/Render
        },
        query_timeout: 5000, // 5 seconds
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000
      }
    : {
        user: process.env.PGUSER || process.env.USER,
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE || 'qafiyah',
        password: process.env.PGPASSWORD || '',
        port: process.env.PGPORT || 5432,
        query_timeout: 5000, // 5 seconds
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000
      }
);

// Check if diacritized_content column exists (graceful pre-migration fallback)
let hasDiacritizedColumn = false;
async function checkDiacritizedColumn() {
  try {
    const result = await pool.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'poems' AND column_name = 'diacritized_content' LIMIT 1"
    );
    hasDiacritizedColumn = result.rows.length > 0;
    log.info('DB', `Diacritized column: ${hasDiacritizedColumn ? 'available' : 'not found (using raw content)'}`);
  } catch {
    hasDiacritizedColumn = false;
  }
}

// Check if quality_score column exists (graceful pre-migration fallback)
let hasQualityScore = false;
async function checkQualityScoreColumn() {
  try {
    const result = await pool.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'poems' AND column_name = 'quality_score' LIMIT 1"
    );
    hasQualityScore = result.rows.length > 0;
    log.info('DB', `Quality score column: ${hasQualityScore ? 'available' : 'not found (serving all poems)'}`);
  } catch {
    hasQualityScore = false;
  }
}

// Check if translation cache columns exist (graceful pre-migration fallback)
let hasTranslationColumns = false;
async function checkTranslationColumns() {
  try {
    const result = await pool.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'poems' AND column_name = 'cached_translation' LIMIT 1"
    );
    hasTranslationColumns = result.rows.length > 0;
    log.info('DB', `Translation cache columns: ${hasTranslationColumns ? 'available' : 'not found'}`);
  } catch {
    hasTranslationColumns = false;
  }
}

// Check if poem_events table exists (graceful pre-migration fallback)
let hasPoemEventsTable = false;
async function checkPoemEventsTable() {
  try {
    const result = await pool.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'poem_events' LIMIT 1"
    );
    hasPoemEventsTable = result.rows.length > 0;
    log.info('DB', `Poem events table: ${hasPoemEventsTable ? 'available' : 'not found'}`);
  } catch {
    hasPoemEventsTable = false;
  }
}

// Helper: returns the SQL expression for poem content based on column availability
function poemContentExpr() {
  return hasDiacritizedColumn ? 'COALESCE(p.diacritized_content, p.content)' : 'p.content';
}

// Helper: returns SQL WHERE clause fragments for serving filters (empty string when quality column doesn't exist)
function servingFilters() {
  const clauses = [];
  if (hasQualityScore && SERVING.minQualityScore) {
    clauses.push(`p.quality_score >= ${SERVING.minQualityScore}`);
  }
  if (SERVING.maxVerseLines) {
    clauses.push(
      `array_length(string_to_array(${poemContentExpr()}, '*'), 1) <= ${SERVING.maxVerseLines}`
    );
  }
  return clauses.length ? 'AND ' + clauses.join(' AND ') : '';
}

// Helper: returns extra SELECT columns for translation cache (empty string when columns don't exist)
function translationSelectExpr() {
  return hasTranslationColumns
    ? ', p.cached_translation, p.cached_explanation, p.cached_author_bio'
    : '';
}

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    log.error('DB', 'Failed to connect to PostgreSQL', err.message);
  } else {
    log.info('DB', `Connected to PostgreSQL at ${res.rows[0].now}`);
    checkDiacritizedColumn();
    checkQualityScoreColumn();
    checkTranslationColumns();
    checkPoemEventsTable();
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    const allowed = [
      'http://localhost:5173',
      'http://localhost:3001',
      'https://poetry-bil-araby.vercel.app',
    ];
    // Allow Vercel preview deployments (poetry-bil-araby-*.vercel.app)
    if (allowed.includes(origin) || /^https:\/\/poetry-bil-araby[a-z0-9-]*\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error('CORS: origin not allowed'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'sentry-trace', 'baggage']
}));
app.use(express.json());
// Larger body limit only for AI proxy endpoints
app.use('/api/ai', express.json({ limit: '10mb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true, legacyHeaders: false }));

// API key authentication middleware for protected endpoints
const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!process.env.API_SECRET_KEY) {
    // If no API key is configured, skip auth (development mode)
    return next();
  }
  if (!apiKey) {
    return res.status(401).json({ error: 'Unauthorized: Missing API key' });
  }
  // Timing-safe comparison to prevent timing attacks
  const expected = Buffer.from(process.env.API_SECRET_KEY);
  const provided = Buffer.from(apiKey);
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
};

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    log.info('HTTP', `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Validation helper
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    log.info('Validation', `Invalid request: ${req.path}`, errors.array().map(e => e.msg));
    if (process.env.NODE_ENV === 'production') {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
    return res.status(400).json({ error: 'Invalid request parameters', details: errors.array().map(e => e.msg) });
  }
  next();
};

// Lightweight health check (no DB query — fast enough for Render's deploy probe)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Full health check with database connectivity
app.get('/api/health/full', async (req, res) => {
  try {
    const totalResult = await pool.query('SELECT COUNT(*) FROM poems');
    const qf = servingFilters();
    const servedResult = qf
      ? await pool.query(`SELECT COUNT(*) FROM poems p WHERE 1=1 ${qf}`)
      : totalResult;
    res.json({
      status: 'ok',
      database: 'connected',
      totalPoems: parseInt(totalResult.rows[0].count),
      servedPoems: parseInt(servedResult.rows[0].count),
      uptime: process.uptime(),
    });
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: error.message
    });
  }
});

// Get random poem
app.get('/api/poems/random', [
  query('poet').optional().trim().isLength({ max: 100 }).withMessage('Poet name too long'),
  validate
], async (req, res) => {
  try {
    const { poet } = req.query;

    let query = `
      SELECT
        p.id,
        p.title,
        ${poemContentExpr()} as arabic,
        po.name as poet,
        t.name as theme
        ${translationSelectExpr()}
      FROM poems p
      JOIN poets po ON p.poet_id = po.id
      JOIN themes t ON p.theme_id = t.id
    `;

    const params = [];
    if (poet && poet !== 'All') {
      query += ` WHERE po.name = $1 ${servingFilters()}`;
      params.push(poet);
    } else {
      const qf = servingFilters();
      if (qf) query += ` WHERE 1=1 ${qf}`;
    }

    query += ' ORDER BY RANDOM() LIMIT 1';

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No poems found' });
    }

    const poem = result.rows[0];

    log.debug('DB', 'Raw poem keys', Object.keys(poem));
    log.debug('DB', `Arabic field: exists=${('arabic' in poem)}, type=${typeof poem.arabic}`);

    // Format the response to match the frontend structure
    const formattedPoem = {
      id: poem.id,
      poet: poem.poet,
      poetArabic: poem.poet, // We don't have English names in DB
      title: poem.title,
      titleArabic: poem.title, // DB only has Arabic
      arabic: poem.arabic,
      english: '', // No English translations in DB
      tags: [poem.theme] // Using theme as tag
    };

    // Include cached translations when available
    if (poem.cached_translation) formattedPoem.cachedTranslation = poem.cached_translation;
    if (poem.cached_explanation) formattedPoem.cachedExplanation = poem.cached_explanation;
    if (poem.cached_author_bio) formattedPoem.cachedAuthorBio = poem.cached_author_bio;

    log.info('Poems', `Random poem: id=${poem.id}, poet=${poem.poet}, arabic_len=${formattedPoem.arabic?.length || 0}${poem.cached_translation ? ', has_translation' : ''}`);
    res.json(formattedPoem);
  } catch (error) {
    Sentry.captureException(error);
    log.error('Poems', `Error fetching random poem: ${error.message}`, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get poems by poet
app.get('/api/poems/by-poet/:poet', [
  param('poet').trim().isLength({ min: 1, max: 100 }).withMessage('Poet name must be 1-100 characters'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0'),
  validate
], async (req, res) => {
  try {
    const { poet } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    // Convert query params to integers for type safety
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);

    const query = `
      SELECT
        p.id,
        p.title,
        ${poemContentExpr()} as arabic,
        po.name as poet,
        t.name as theme
      FROM poems p
      JOIN poets po ON p.poet_id = po.id
      JOIN themes t ON p.theme_id = t.id
      WHERE po.name = $1 ${servingFilters()}
      ORDER BY RANDOM()
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [poet, limitNum, offsetNum]);

    const poems = result.rows.map(poem => ({
      id: poem.id,
      poet: poem.poet,
      poetArabic: poem.poet,
      title: poem.title,
      titleArabic: poem.title,
      arabic: poem.arabic,
      english: '',
      tags: [poem.theme]
    }));

    log.info('Poems', `By poet "${poet}": returned ${poems.length} poems`);
    res.json(poems);
  } catch (error) {
    log.error('Poems', `Error fetching poems by poet: ${error.message}`, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get list of available poets
app.get('/api/poets', async (req, res) => {
  try {
    const qf = servingFilters();
    const query = `
      SELECT DISTINCT po.name, COUNT(p.id) as poem_count
      FROM poets po
      JOIN poems p ON po.id = p.poet_id
      ${qf ? 'WHERE 1=1 ' + qf : ''}
      GROUP BY po.name
      HAVING COUNT(p.id) > 0
      ORDER BY poem_count DESC
      LIMIT 50
    `;

    const result = await pool.query(query);
    log.info('Poets', `Returned ${result.rows.length} poets`);
    res.json(result.rows);
  } catch (error) {
    log.error('Poets', `Error fetching poets: ${error.message}`, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search poems
app.get('/api/poems/search', [
  query('q').trim().notEmpty().withMessage('Search query required').isLength({ max: 200 }).withMessage('Search query too long'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  validate
], async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    // Convert query param to integer for type safety
    const limitNum = parseInt(limit, 10);

    const query = `
      SELECT
        p.id,
        p.title,
        ${poemContentExpr()} as arabic,
        po.name as poet,
        t.name as theme
      FROM poems p
      JOIN poets po ON p.poet_id = po.id
      JOIN themes t ON p.theme_id = t.id
      WHERE (p.title ILIKE $1 OR p.content ILIKE $1 OR po.name ILIKE $1) ${servingFilters()}
      LIMIT $2
    `;

    const result = await pool.query(query, [`%${q}%`, limitNum]);

    const poems = result.rows.map(poem => ({
      id: poem.id,
      poet: poem.poet,
      poetArabic: poem.poet,
      title: poem.title,
      titleArabic: poem.title,
      arabic: poem.arabic,
      english: '',
      tags: [poem.theme]
    }));

    log.info('Search', `Query "${q}": returned ${poems.length} results`);
    res.json(poems);
  } catch (error) {
    log.error('Search', `Error searching poems: ${error.message}`, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get poem of the day (deterministic daily selection, stable across all users)
app.get('/api/poems/daily', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.title,
        ${poemContentExpr()} as arabic,
        po.name as poet,
        t.name as theme
      FROM poems p
      JOIN poets po ON p.poet_id = po.id
      JOIN themes t ON p.theme_id = t.id
      ${servingFilters() ? 'WHERE 1=1 ' + servingFilters() : ''}
      ORDER BY md5(p.id::text || current_date::text)
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No poems found' });
    }

    const poem = result.rows[0];

    const formattedPoem = {
      id: poem.id,
      poet: poem.poet,
      poetArabic: poem.poet,
      title: poem.title,
      titleArabic: poem.title,
      arabic: poem.arabic,
      english: '',
      tags: [poem.theme]
    };

    // Cache for the rest of the day (seconds until midnight UTC)
    const now = new Date();
    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const secondsUntilMidnight = Math.floor((midnight - now) / 1000);
    res.set('Cache-Control', `public, max-age=${secondsUntilMidnight}`);

    log.info('Poems', `Daily poem: id=${poem.id}, poet=${poem.poet}`);
    res.json(formattedPoem);
  } catch (error) {
    log.error('Poems', `Error fetching daily poem: ${error.message}`, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get poem by ID (for deep links / sharing)
// IMPORTANT: This route uses :id param and must be registered AFTER all /api/poems/<literal> routes
// (random, by-poet, search, daily) to avoid shadowing them.
app.get('/api/poems/:id', [
  param('id').isInt({ min: 1 }).withMessage('Poem ID must be a positive integer'),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        p.id,
        p.title,
        ${poemContentExpr()} as arabic,
        po.name as poet,
        t.name as theme
      FROM poems p
      JOIN poets po ON p.poet_id = po.id
      JOIN themes t ON p.theme_id = t.id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Poem not found' });
    }

    const poem = result.rows[0];

    const formattedPoem = {
      id: poem.id,
      poet: poem.poet,
      poetArabic: poem.poet,
      title: poem.title,
      titleArabic: poem.title,
      arabic: poem.arabic,
      english: '',
      tags: [poem.theme]
    };

    log.info('Poems', `By ID: ${id}, poet=${poem.poet}`);
    res.json(formattedPoem);
  } catch (error) {
    log.error('Poems', `Error fetching poem by ID: ${error.message}`, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save cached translation for a poem (write-once, rate-limited)
const translationWriteLimit = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

app.post('/api/poems/:id/translation', translationWriteLimit, [
  param('id').isInt({ min: 1 }).withMessage('Invalid poem ID'),
  validate
], async (req, res) => {
  if (!hasTranslationColumns) {
    return res.status(503).json({ error: 'Translation columns not available' });
  }

  try {
    const { translation, explanation, authorBio } = req.body;

    // Content validation
    if (!translation || typeof translation !== 'string') {
      return res.status(400).json({ error: 'translation is required and must be a string' });
    }
    if (translation.length > 10_000 || (explanation?.length || 0) > 10_000 || (authorBio?.length || 0) > 5_000) {
      return res.status(400).json({ error: 'Content exceeds maximum length' });
    }

    // Strip HTML tags (XSS prevention)
    const clean = (s) => s?.replace(/<[^>]*>/g, '') || null;

    // Only write if not already translated (write-once guard)
    const result = await pool.query(
      `UPDATE poems SET cached_translation = $1, cached_explanation = $2,
       cached_author_bio = $3, translated_at = NOW()
       WHERE id = $4 AND translated_at IS NULL
       RETURNING id`,
      [clean(translation), clean(explanation), clean(authorBio), req.params.id]
    );

    if (result.rowCount === 0) {
      return res.json({ status: 'already_translated' });
    }

    log.info('Translation', `Saved translation for poem ${req.params.id}`);
    res.json({ status: 'saved' });
  } catch (error) {
    log.error('Translation', `Error saving translation: ${error.message}`, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POEM EVENTS (downvote + analytics)
// ═══════════════════════════════════════════════════════════════

const poemEventLimit = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false });

// POST /api/poems/:id/downvote — record a downvote
app.post('/api/poems/:id/downvote', poemEventLimit, [
  param('id').isInt({ min: 1 }).withMessage('Poem ID must be a positive integer'),
  body('userId').isString().notEmpty().withMessage('userId is required'),
  validate
], async (req, res) => {
  if (!hasPoemEventsTable) {
    return res.status(503).json({ error: 'Poem events table not available' });
  }
  try {
    const { userId } = req.body;
    await pool.query(
      `INSERT INTO poem_events (user_id, poem_id, event_type, metadata)
       VALUES ($1, $2, 'downvote', '{"reason":"low_quality"}')
       ON CONFLICT DO NOTHING`,
      [userId, req.params.id]
    );
    log.info('PoemEvents', `Downvote recorded: poem=${req.params.id}, user=${userId}`);
    res.json({ status: 'downvoted' });
  } catch (error) {
    log.error('PoemEvents', `Error recording downvote: ${error.message}`, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/poems/:id/downvote — remove a downvote
app.delete('/api/poems/:id/downvote', poemEventLimit, [
  param('id').isInt({ min: 1 }).withMessage('Poem ID must be a positive integer'),
  body('userId').isString().notEmpty().withMessage('userId is required'),
  validate
], async (req, res) => {
  if (!hasPoemEventsTable) {
    return res.status(503).json({ error: 'Poem events table not available' });
  }
  try {
    const { userId } = req.body;
    await pool.query(
      `DELETE FROM poem_events WHERE user_id = $1 AND poem_id = $2 AND event_type = 'downvote'`,
      [userId, req.params.id]
    );
    log.info('PoemEvents', `Downvote removed: poem=${req.params.id}, user=${userId}`);
    res.json({ status: 'removed' });
  } catch (error) {
    log.error('PoemEvents', `Error removing downvote: ${error.message}`, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/poems/:id/event — record a generic poem event
const VALID_EVENT_TYPES = ['downvote', 'save', 'serve', 'share', 'copy', 'view'];
const TOGGLE_EVENT_TYPES = ['downvote', 'save'];

app.post('/api/poems/:id/event', poemEventLimit, [
  param('id').isInt({ min: 1 }).withMessage('Poem ID must be a positive integer'),
  body('userId').isString().notEmpty().withMessage('userId is required'),
  body('eventType').isString().isIn(VALID_EVENT_TYPES).withMessage(`eventType must be one of: ${VALID_EVENT_TYPES.join(', ')}`),
  validate
], async (req, res) => {
  if (!hasPoemEventsTable) {
    return res.status(503).json({ error: 'Poem events table not available' });
  }
  try {
    const { userId, eventType, metadata } = req.body;
    const metadataJson = metadata && typeof metadata === 'object' ? JSON.stringify(metadata) : '{}';

    if (TOGGLE_EVENT_TYPES.includes(eventType)) {
      await pool.query(
        `INSERT INTO poem_events (user_id, poem_id, event_type, metadata)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [userId, req.params.id, eventType, metadataJson]
      );
    } else {
      await pool.query(
        `INSERT INTO poem_events (user_id, poem_id, event_type, metadata)
         VALUES ($1, $2, $3, $4)`,
        [userId, req.params.id, eventType, metadataJson]
      );
    }

    log.info('PoemEvents', `Event recorded: type=${eventType}, poem=${req.params.id}, user=${userId}`);
    res.json({ status: 'recorded' });
  } catch (error) {
    log.error('PoemEvents', `Error recording event: ${error.message}`, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GEMINI API PROXY (keeps API key server-side)
// ═══════════════════════════════════════════════════════════════

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// GET /api/ai/models — list available models
app.get('/api/ai/models', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI features unavailable: no API key configured' });
    }
    const response = await fetch(`${GEMINI_BASE}/models?key=${GEMINI_API_KEY}`);
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json(data);
  } catch (error) {
    log.error('AI Proxy', `Model listing failed: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/ai/:model/:action — proxy generateContent / streamGenerateContent
app.post('/api/ai/:model/:action', async (req, res) => {
  try {
    const { model, action } = req.params;

    // Validate model name to prevent SSRF (before any upstream requests)
    if (!/^gemini-[\w.-]+$/.test(model)) {
      return res.status(400).json({ error: 'Invalid model name' });
    }

    // Only allow known actions
    const allowedActions = ['generateContent', 'streamGenerateContent'];
    if (!allowedActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI features unavailable: no API key configured' });
    }

    const sseParam = action === 'streamGenerateContent' ? '&alt=sse' : '';
    const url = `${GEMINI_BASE}/models/${model}:${action}?key=${GEMINI_API_KEY}${sseParam}`;

    if (action === 'streamGenerateContent') {
      const controller = new AbortController();
      req.on('close', () => controller.abort());

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.text();
        return res.status(response.status).send(errorData);
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done || res.writableEnded) break;
          res.write(value);
        }
      } catch (err) {
        if (err.name !== 'AbortError') throw err;
      } finally {
        if (!res.writableEnded) res.end();
      }
    } else {
      // Non-streaming: forward as normal JSON
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      res.json(data);
    }
  } catch (error) {
    log.error('AI Proxy', `Proxy failed: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DESIGN REVIEW API
// ═══════════════════════════════════════════════════════════════

// Helper: check if design_items table exists (graceful fallback if migration hasn't run)
async function designTablesExist() {
  try {
    await pool.query("SELECT 1 FROM design_items LIMIT 0");
    return true;
  } catch {
    return false;
  }
}

// GET /api/design-review/ping — lightweight liveness check (SELECT 1, no table scan)
app.get('/api/design-review/ping', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (error) {
    log.error('DesignReview', `Ping error: ${error.message}`);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// GET /api/design-review/items — list all design items
app.get('/api/design-review/items', async (req, res) => {
  try {
    if (!(await designTablesExist())) return res.json([]);
    const { component, category, active } = req.query;
    let query = 'SELECT * FROM design_items WHERE 1=1';
    const params = [];
    if (component) { params.push(component); query += ` AND component = $${params.length}`; }
    if (category) { params.push(category); query += ` AND category = $${params.length}`; }
    if (active !== undefined) { params.push(active === 'true'); query += ` AND is_active = $${params.length}`; }
    query += ' ORDER BY component, category, item_key';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    log.error('DesignReview', `Error fetching design items: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/design-review/items/sync — bulk upsert from CATALOG (idempotent, batched)
app.post('/api/design-review/items/sync', requireApiKey, async (req, res) => {
  try {
    if (!(await designTablesExist())) return res.status(503).json({ error: 'Design tables not created yet' });
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items must be a non-empty array' });

    // Build a single multi-row INSERT...ON CONFLICT (all values parameterized)
    const params = [];
    const valueTuples = [];
    for (let i = 0; i < items.length; i++) {
      const p = i * 10;
      params.push(
        items[i].item_key, items[i].name, items[i].component, items[i].category,
        items[i].file_path, items[i].description || null,
        items[i].generation || 1, items[i].iteration || null,
        items[i].source_branch || null, items[i].source_pr || null
      );
      valueTuples.push('($' + (p+1) + ', $' + (p+2) + ', $' + (p+3) + ', $' + (p+4) + ', $' + (p+5) + ', $' + (p+6) + ', $' + (p+7) + ', $' + (p+8) + ', $' + (p+9) + ', $' + (p+10) + ')');
    }

    const sql = 'INSERT INTO design_items (item_key, name, component, category, file_path, description, generation, iteration, source_branch, source_pr) ' +
      'VALUES ' + valueTuples.join(', ') + ' ' +
      'ON CONFLICT (item_key) DO UPDATE SET ' +
      'name = EXCLUDED.name, component = EXCLUDED.component, category = EXCLUDED.category, ' +
      'file_path = EXCLUDED.file_path, description = EXCLUDED.description, generation = EXCLUDED.generation, ' +
      'iteration = EXCLUDED.iteration, source_branch = EXCLUDED.source_branch, source_pr = EXCLUDED.source_pr, updated_at = now()';
    await pool.query(sql, params); // lgtm[js/sql-injection] - valueTuples contain only $N placeholders, all user data is in params

    res.json({ upserted: items.length, total: items.length });
  } catch (error) {
    log.error('DesignReview', `Error syncing design items: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/design-review/sessions — list review sessions (supports ?status=, ?reviewer=, ?from=, ?to=, ?commit_sha= filters)
app.get('/api/design-review/sessions', async (req, res) => {
  try {
    if (!(await designTablesExist())) return res.json([]);
    const { status, reviewer, from, to, commit_sha } = req.query;
    let query = 'SELECT * FROM design_review_sessions';
    const params = [];
    const clauses = [];
    if (status) { params.push(status); clauses.push(`status = $${params.length}`); }
    if (reviewer) { params.push(reviewer); clauses.push(`reviewer = $${params.length}`); }
    if (from) { params.push(from); clauses.push(`created_at >= $${params.length}`); }
    if (to) { params.push(to); clauses.push(`created_at <= $${params.length}`); }
    if (commit_sha) { params.push(commit_sha); clauses.push(`commit_sha = $${params.length}`); }
    if (clauses.length) query += ' WHERE ' + clauses.join(' AND ');
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    log.error('DesignReview', `Error fetching sessions: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/design-review/sessions/:id — fetch a single session by ID
app.get('/api/design-review/sessions/:id', async (req, res) => {
  try {
    if (!(await designTablesExist())) return res.status(404).json({ error: 'Design tables not created yet' });
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM design_review_sessions WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    res.json(result.rows[0]);
  } catch (error) {
    log.error('DesignReview', `Error fetching session: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/design-review/sessions — create new review session
app.post('/api/design-review/sessions', requireApiKey, async (req, res) => {
  try {
    if (!(await designTablesExist())) return res.status(503).json({ error: 'Design tables not created yet' });
    const { reviewer, branch, commit_sha, total_designs } = req.body;

    // Calculate next round number
    const roundResult = await pool.query('SELECT COALESCE(MAX(round_number), 0) + 1 as next_round FROM design_review_sessions');
    const round_number = roundResult.rows[0].next_round;

    const result = await pool.query(`
      INSERT INTO design_review_sessions (reviewer, branch, commit_sha, round_number, total_designs)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [reviewer || 'owner', branch || null, commit_sha || null, round_number, total_designs || 0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    log.error('DesignReview', `Error creating session: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/design-review/sessions/:id — complete session, add notes
app.patch('/api/design-review/sessions/:id', requireApiKey, async (req, res) => {
  try {
    if (!(await designTablesExist())) return res.status(503).json({ error: 'Design tables not created yet' });
    const { id } = req.params;
    const { status, notes, reviewed_count, reviewer } = req.body;
    const sets = [];
    const params = [id];
    if (status !== undefined) { params.push(status); sets.push(`status = $${params.length}`); }
    if (notes !== undefined) { params.push(notes); sets.push(`notes = $${params.length}`); }
    if (reviewed_count !== undefined) { params.push(reviewed_count); sets.push(`reviewed_count = $${params.length}`); }
    if (reviewer !== undefined) { params.push(reviewer); sets.push(`reviewer = $${params.length}`); }
    if (status === 'completed') sets.push('completed_at = now()');
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const result = await pool.query(
      `UPDATE design_review_sessions SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    res.json(result.rows[0]);
  } catch (error) {
    log.error('DesignReview', `Error updating session: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/design-review/sessions/:id/verdicts — get verdicts for a session
app.get('/api/design-review/sessions/:id/verdicts', async (req, res) => {
  try {
    if (!(await designTablesExist())) return res.json([]);
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM design_verdicts WHERE session_id = $1 ORDER BY created_at',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    log.error('DesignReview', `Error fetching verdicts: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/design-review/sessions/:id/verdicts — bulk submit/update verdicts (batched)
app.post('/api/design-review/sessions/:id/verdicts', requireApiKey, async (req, res) => {
  try {
    if (!(await designTablesExist())) return res.status(503).json({ error: 'Design tables not created yet' });
    const { id } = req.params;
    const { verdicts } = req.body;
    if (!Array.isArray(verdicts)) return res.status(400).json({ error: 'verdicts must be an array' });

    // Resolve all item_keys to item records in a single query
    const keys = verdicts.filter(v => v.item_key && !v.item_id).map(v => v.item_key);
    const keyMap = Object.create(null);
    if (keys.length > 0) {
      const keyResult = await pool.query(
        'SELECT id, item_key, name, component, category, generation FROM design_items WHERE item_key = ANY($1)',
        [keys]
      );
      keyResult.rows.forEach(r => { keyMap[r.item_key] = r; });
    }

    // Build batch of resolved verdicts
    const resolved = [];
    for (const v of verdicts) {
      const item_id = v.item_id || keyMap[v.item_key]?.id;
      if (!item_id) continue;
      const lookup = keyMap[v.item_key];
      resolved.push({
        session_id: id, item_id, item_key: v.item_key, verdict: v.verdict,
        comment: v.comment || null, priority: v.priority || 0, tags: v.tags || null,
        design_name: v.design_name || lookup?.name || null,
        component: v.component || lookup?.component || null,
        category: v.category || lookup?.category || null,
        generation: v.generation ?? lookup?.generation ?? null,
        position_in_filter: v.position_in_filter ?? null,
        total_in_filter: v.total_in_filter ?? null,
        position_in_session: v.position_in_session ?? null,
        total_in_session: v.total_in_session ?? null,
        component_tags: v.component_tags || null
      });
    }

    if (resolved.length > 0) {
      // Single multi-row INSERT...ON CONFLICT (all values parameterized)
      const COLS_PER_ROW = 16;
      const params = [];
      const valueTuples = [];
      for (let i = 0; i < resolved.length; i++) {
        const p = i * COLS_PER_ROW;
        const r = resolved[i];
        params.push(
          r.session_id, r.item_id, r.item_key, r.verdict, r.comment, r.priority, r.tags,
          r.design_name, r.component, r.category, r.generation,
          r.position_in_filter, r.total_in_filter, r.position_in_session, r.total_in_session,
          r.component_tags
        );
        const placeholders = Array.from({ length: COLS_PER_ROW }, (_, j) => '$' + (p + j + 1)).join(', ');
        valueTuples.push('(' + placeholders + ')');
      }

      const sql = 'INSERT INTO design_verdicts (session_id, item_id, item_key, verdict, comment, priority, tags, ' +
        'design_name, component, category, generation, position_in_filter, total_in_filter, position_in_session, total_in_session, component_tags) ' +
        'VALUES ' + valueTuples.join(', ') + ' ' +
        'ON CONFLICT (session_id, item_id) DO UPDATE SET ' +
        'verdict = EXCLUDED.verdict, comment = EXCLUDED.comment, priority = EXCLUDED.priority, tags = EXCLUDED.tags, ' +
        'design_name = EXCLUDED.design_name, component = EXCLUDED.component, category = EXCLUDED.category, generation = EXCLUDED.generation, ' +
        'position_in_filter = EXCLUDED.position_in_filter, total_in_filter = EXCLUDED.total_in_filter, ' +
        'position_in_session = EXCLUDED.position_in_session, total_in_session = EXCLUDED.total_in_session, ' +
        'component_tags = EXCLUDED.component_tags, updated_at = now()';
      await pool.query(sql, params); // lgtm[js/sql-injection] - valueTuples contain only $N placeholders, all user data is in params
    }

    // Update session reviewed count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM design_verdicts WHERE session_id = $1',
      [id]
    );
    await pool.query(
      'UPDATE design_review_sessions SET reviewed_count = $1 WHERE id = $2',
      [parseInt(countResult.rows[0].count), id]
    );

    res.json({ saved: resolved.length, total: verdicts.length });
  } catch (error) {
    log.error('DesignReview', `Error saving verdicts: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/design-review/summary — aggregated stats
app.get('/api/design-review/summary', async (req, res) => {
  try {
    if (!(await designTablesExist())) return res.json({ total_items: 0, sessions: 0, verdicts: {} });

    const items = await pool.query('SELECT COUNT(*) FROM design_items WHERE is_active = true');
    const sessions = await pool.query('SELECT COUNT(*) FROM design_review_sessions');
    const latestSession = await pool.query(
      `SELECT id, round_number, status FROM design_review_sessions ORDER BY
        CASE WHEN status = 'completed' AND reviewed_count > 0 THEN 0
             WHEN reviewed_count > 0 THEN 1
             ELSE 2 END,
        round_number DESC LIMIT 1`
    );

    let verdictCounts = { keep: 0, discard: 0, skip: 0, revisit: 0, unreviewed: 0 };
    if (latestSession.rows.length > 0) {
      const vc = await pool.query(
        `SELECT verdict, COUNT(*) as count FROM design_verdicts WHERE session_id = $1 GROUP BY verdict`,
        [latestSession.rows[0].id]
      );
      vc.rows.forEach(r => { verdictCounts[r.verdict] = parseInt(r.count); });
      verdictCounts.unreviewed = parseInt(items.rows[0].count) - vc.rows.reduce((s, r) => s + parseInt(r.count), 0);
    } else {
      verdictCounts.unreviewed = parseInt(items.rows[0].count);
    }

    res.json({
      total_items: parseInt(items.rows[0].count),
      sessions: parseInt(sessions.rows[0].count),
      latest_session: latestSession.rows[0] || null,
      verdicts: verdictCounts
    });
  } catch (error) {
    log.error('DesignReview', `Error fetching summary: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/design-review/claude-context — structured JSON for Claude agent consumption
app.get('/api/design-review/claude-context', async (req, res) => {
  try {
    if (!(await designTablesExist())) return res.json({ items: [], sessions: [], verdicts: [] });
    const { round, component, verdict } = req.query;

    // Get session
    let sessionQuery = 'SELECT * FROM design_review_sessions';
    const sessionParams = [];
    if (round === 'latest') {
      sessionQuery += ` ORDER BY
        CASE WHEN status = 'completed' AND reviewed_count > 0 THEN 0
             WHEN reviewed_count > 0 THEN 1
             ELSE 2 END,
        round_number DESC LIMIT 1`;
    } else if (round) {
      sessionParams.push(parseInt(round));
      sessionQuery += ' WHERE round_number = $1';
    } else {
      sessionQuery += ' ORDER BY created_at DESC';
    }
    const sessions = await pool.query(sessionQuery, sessionParams);

    // Get items
    let itemQuery = 'SELECT * FROM design_items WHERE is_active = true';
    const itemParams = [];
    if (component) { itemParams.push(component); itemQuery += ` AND component = $${itemParams.length}`; }
    itemQuery += ' ORDER BY component, category, item_key';
    const items = await pool.query(itemQuery, itemParams);

    // Get verdicts for relevant sessions
    let verdicts = [];
    if (sessions.rows.length > 0) {
      const sessionIds = sessions.rows.map(s => s.id);
      let vQuery = `SELECT v.*, s.round_number FROM design_verdicts v
        JOIN design_review_sessions s ON v.session_id = s.id
        WHERE v.session_id = ANY($1)`;
      const vParams = [sessionIds];
      if (verdict) { vParams.push(verdict); vQuery += ` AND v.verdict = $${vParams.length}`; }
      vQuery += ' ORDER BY s.round_number, v.item_key';
      const vResult = await pool.query(vQuery, vParams);
      verdicts = vResult.rows;
    }

    // Build evolution map (item_key -> [{round, verdict, comment, ...metadata}])
    const evolution = {};
    verdicts.forEach(v => {
      if (!evolution[v.item_key]) evolution[v.item_key] = [];
      evolution[v.item_key].push({
        round: v.round_number,
        verdict: v.verdict,
        comment: v.comment,
        tags: v.tags,
        date: v.created_at,
        design_name: v.design_name,
        component: v.component,
        category: v.category,
        generation: v.generation,
        component_tags: v.component_tags,
        position_in_filter: v.position_in_filter,
        total_in_filter: v.total_in_filter,
        position_in_session: v.position_in_session,
        total_in_session: v.total_in_session
      });
    });

    // Fetch feedback actions (wrapped in try/catch for backwards compat)
    let feedbackActions = [];
    if (sessions.rows.length > 0) {
      try {
        const sessionIds = sessions.rows.map(s => s.id);
        const faResult = await pool.query(
          'SELECT * FROM design_feedback_actions WHERE session_id = ANY($1) ORDER BY created_at',
          [sessionIds]
        );
        feedbackActions = faResult.rows;
      } catch (e) {
        log.debug('DesignReview', `feedback_actions query skipped: ${e.message}`);
      }
    }

    res.json({
      items: items.rows,
      sessions: sessions.rows,
      verdicts,
      evolution,
      feedback_actions: feedbackActions,
      summary: {
        total_items: items.rows.length,
        reviewed: verdicts.length,
        by_verdict: verdicts.reduce((acc, v) => { acc[v.verdict] = (acc[v.verdict] || 0) + 1; return acc; }, {})
      }
    });
  } catch (error) {
    log.error('DesignReview', `Error building claude context: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/design-review/feedback-actions — bulk save feedback actions
const VALID_ACTION_TYPES = new Set([
  'css_change', 'layout_change', 'animation_change', 'component_change',
  'typography_change', 'color_change', 'responsive_fix', 'accessibility_fix',
  'new_variant', 'removal', 'no_action', 'deferred'
]);

app.post('/api/design-review/feedback-actions', requireApiKey, async (req, res) => {
  try {
    if (!(await designTablesExist())) return res.status(503).json({ error: 'Design tables not created yet' });
    const { actions } = req.body;
    if (!Array.isArray(actions) || actions.length === 0) return res.status(400).json({ error: 'actions must be a non-empty array' });

    // Validate action_type values
    for (const a of actions) {
      if (!a.action_type || !VALID_ACTION_TYPES.has(a.action_type)) {
        return res.status(400).json({ error: `Invalid action_type: ${a.action_type}` });
      }
      if (!a.session_id) {
        return res.status(400).json({ error: 'session_id is required for each action' });
      }
    }

    const COLS = 7;
    const params = [];
    const valueTuples = [];
    for (let i = 0; i < actions.length; i++) {
      const p = i * COLS;
      const a = actions[i];
      params.push(
        a.verdict_id || null, a.session_id, a.item_key || null,
        a.action_type, a.action_description || null, a.file_path || null, a.commit_sha || null
      );
      const placeholders = Array.from({ length: COLS }, (_, j) => '$' + (p + j + 1)).join(', ');
      valueTuples.push('(' + placeholders + ')');
    }

    const sql = 'INSERT INTO design_feedback_actions (verdict_id, session_id, item_key, action_type, action_description, file_path, commit_sha) ' +
      'VALUES ' + valueTuples.join(', ') + ' RETURNING id';
    const result = await pool.query(sql, params);

    res.json({ saved: result.rows.length });
  } catch (error) {
    log.error('DesignReview', `Error saving feedback actions: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/design-review/feedback-actions — query feedback actions with filters
app.get('/api/design-review/feedback-actions', async (req, res) => {
  try {
    if (!(await designTablesExist())) return res.json([]);
    const { session_id, verdict_id, item_key, action_type } = req.query;

    let sql = 'SELECT * FROM design_feedback_actions WHERE 1=1';
    const params = [];
    if (session_id) { params.push(session_id); sql += ` AND session_id = $${params.length}`; }
    if (verdict_id) { params.push(verdict_id); sql += ` AND verdict_id = $${params.length}`; }
    if (item_key) { params.push(item_key); sql += ` AND item_key = $${params.length}`; }
    if (action_type) { params.push(action_type); sql += ` AND action_type = $${params.length}`; }
    sql += ' ORDER BY created_at DESC';

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (error) {
    log.error('DesignReview', `Error fetching feedback actions: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/design-review/feedback-actions/:id — update a feedback action (e.g., mark as applied)
app.patch('/api/design-review/feedback-actions/:id', requireApiKey, async (req, res) => {
  try {
    if (!(await designTablesExist())) return res.status(503).json({ error: 'Design tables not created yet' });
    const { id } = req.params;
    const { applied, action_type, action_description, file_path, commit_sha } = req.body;

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid feedback action id' });

    if (action_type && !VALID_ACTION_TYPES.has(action_type)) {
      return res.status(400).json({ error: `Invalid action_type: ${action_type}` });
    }

    const sets = [];
    const params = [];
    if (applied !== undefined) { params.push(applied); sets.push(`applied = $${params.length}`); }
    if (action_type) { params.push(action_type); sets.push(`action_type = $${params.length}`); }
    if (action_description !== undefined) { params.push(action_description); sets.push(`action_description = $${params.length}`); }
    if (file_path !== undefined) { params.push(file_path); sets.push(`file_path = $${params.length}`); }
    if (commit_sha !== undefined) { params.push(commit_sha); sets.push(`commit_sha = $${params.length}`); }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    const sql = `UPDATE design_feedback_actions SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`;
    const result = await pool.query(sql, params);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Feedback action not found' });
    res.json(result.rows[0]);
  } catch (error) {
    log.error('DesignReview', `Error updating feedback action: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// BUG REPORTS (structured log only — no DB table needed yet)
// ═══════════════════════════════════════════════════════════════

async function createGitHubIssue(report, truncatedLogs) {
  const token = process.env.GITHUB_TOKEN_SUBMIT_BUG;
  const repo = process.env.GITHUB_REPO || 'lesmartiepants/poetry-bil-araby';
  if (!token) return null;

  const poemInfo = report.poem
    ? `**Poem:** ${report.poem.title || 'untitled'} — ${report.poem.poet || 'unknown'} (ID: ${report.poem.id || 'n/a'})`
    : 'No poem context';

  const stateInfo = report.appState
    ? `Mode: ${report.appState.mode}, Theme: ${report.appState.theme}, Font: ${report.appState.font}`
    : 'No app state';

  const logsSection = truncatedLogs.length > 0
    ? `<details><summary>Client logs (${truncatedLogs.length} entries)</summary>\n\n\`\`\`json\n${JSON.stringify(truncatedLogs.slice(-20), null, 2)}\n\`\`\`\n</details>`
    : 'No client logs attached';

  const envSection = [
    report.screenSize && `Screen: ${report.screenSize}`,
    report.language && `Language: ${report.language}`,
    report.online !== undefined && `Online: ${report.online}`,
    report.referrer && `Referrer: ${report.referrer}`,
    report.featureFlags && `Feature flags: \`${JSON.stringify(report.featureFlags)}\``,
  ].filter(Boolean).join(' | ');

  const body = [
    `## User Bug Report`,
    ``,
    report.url && `**URL:** ${report.url}`,
    `**Description:** ${report.description || '_No description provided_'}`,
    ``,
    poemInfo,
    `**App state:** ${stateInfo}`,
    `**User agent:** \`${report.userAgent}\``,
    `**Submitted:** ${report.timestamp}`,
    envSection && ``,
    envSection && `### Environment`,
    envSection && envSection,
    ``,
    logsSection,
    ``,
    `---`,
    `_Auto-created from in-app bug report button_`,
  ].filter(line => line !== false && line !== null).join('\n');

  const title = report.description
    ? `[Bug Report] ${report.description.slice(0, 80)}`
    : `[Bug Report] User-submitted from debug console`;

  try {
    const resp = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        labels: ['bug', 'user-reported'],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      log.error('BugReport', `GitHub issue creation failed: ${resp.status} ${errText}`);
      return null;
    }

    const issue = await resp.json();
    log.info('BugReport', `GitHub issue created: #${issue.number}`, { url: issue.html_url });
    return issue.number;
  } catch (e) {
    log.error('BugReport', `GitHub issue creation error: ${e.message}`);
    return null;
  }
}

app.post('/api/bug-reports', rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false }), async (req, res) => {
  try {
    const { description, logs: clientLogs, timestamp, userAgent, poem, appState, url, screenSize, language, online, referrer, featureFlags } = req.body;

    // Basic validation
    if (!timestamp || !userAgent) {
      return res.status(400).json({ error: 'Missing required fields: timestamp, userAgent' });
    }

    // Truncate logs if too large
    const truncatedLogs = Array.isArray(clientLogs)
      ? clientLogs.slice(-100)
      : [];

    const report = {
      description: typeof description === 'string' ? description.slice(0, 1000) : '',
      logsCount: truncatedLogs.length,
      timestamp,
      userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 500) : '',
      poem: poem ? { id: poem.id, poet: poem.poet, title: poem.title } : null,
      appState: appState ? {
        mode: appState.mode,
        theme: appState.theme,
        font: appState.font
      } : null,
      url: typeof url === 'string' ? url.slice(0, 2000) : null,
      screenSize: typeof screenSize === 'string' ? screenSize.slice(0, 20) : null,
      language: typeof language === 'string' ? language.slice(0, 20) : null,
      online: typeof online === 'boolean' ? online : null,
      referrer: typeof referrer === 'string' ? referrer.slice(0, 2000) : null,
      featureFlags: featureFlags && typeof featureFlags === 'object' ? featureFlags : null
    };

    log.info('BugReport', `New bug report submitted`, report);

    // Log truncated client logs at debug level
    if (truncatedLogs.length > 0) {
      log.debug('BugReport', `Client logs (${truncatedLogs.length} entries)`, truncatedLogs);
    }

    // Create GitHub issue (non-blocking — don't fail the request if this errors)
    const issueNumber = await createGitHubIssue(report, truncatedLogs);

    // Persist to PostgreSQL
    try {
      await pool.query(
        `INSERT INTO bug_reports (description, logs, timestamp, user_agent, poem_id, poem_poet, poem_title, app_mode, app_theme, app_font, github_issue_number, url, screen_size, language, online, referrer, feature_flags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          report.description,
          JSON.stringify(truncatedLogs),
          report.timestamp,
          report.userAgent,
          report.poem?.id || null,
          report.poem?.poet || null,
          report.poem?.title || null,
          report.appState?.mode || null,
          report.appState?.theme || null,
          report.appState?.font || null,
          issueNumber,
          report.url,
          report.screenSize,
          report.language,
          report.online,
          report.referrer,
          report.featureFlags ? JSON.stringify(report.featureFlags) : null,
        ]
      );
      log.info('BugReport', `Saved to database${issueNumber ? ` (GitHub #${issueNumber})` : ''}`);
    } catch (dbErr) {
      // DB insert failure is non-fatal — report was already logged
      log.error('BugReport', `DB insert failed (non-fatal): ${dbErr.message}`);
    }

    res.status(201).json({
      success: true,
      message: 'Bug report submitted',
      ...(issueNumber && { githubIssue: issueNumber }),
    });
  } catch (error) {
    log.error('BugReport', `Error processing bug report: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sentry Express error handler (must be after all routes)
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Export app for testing
export { app, pool };

// Only start server if this file is run directly (not imported)
// Use fileURLToPath for cross-platform compatibility (Windows/Unix)
const currentFile = fileURLToPath(import.meta.url);
const mainFile = resolve(process.argv[1]);
if (currentFile === mainFile) {
  const server = app.listen(PORT, () => {
    log.info('Server', `Poetry API running on http://localhost:${PORT}`);
    log.info('Server', `Health: http://localhost:${PORT}/api/health | Poems: http://localhost:${PORT}/api/poems/random`);
    log.info('Server', `Logging: enabled=${LOG_ENABLED}, debug=${LOG_DEBUG}`);
    log.info('Server', 'Serving filters', SERVING);
  });

  // Keep-alive mechanism to prevent Render free tier from sleeping (15 min idle timeout)
  // Self-ping with randomized interval (9-13 min) to prevent synchronized load
  let keepAliveTimeout = null;
  
  if (process.env.NODE_ENV === 'production') {
    // Wait 30 seconds after startup before starting keep-alive pings
    keepAliveTimeout = setTimeout(() => {
      // Randomize interval between 9-13 minutes to prevent synchronized pings
      const getRandomInterval = () => {
        const min = 9 * 60 * 1000;  // 9 minutes
        const max = 13 * 60 * 1000; // 13 minutes
        return Math.floor(Math.random() * (max - min + 1)) + min;
      };
      
      const pingHealth = () => {
        const url = process.env.RENDER_EXTERNAL_URL
          ? `${process.env.RENDER_EXTERNAL_URL}/api/health/full`
          : `http://localhost:${PORT}/api/health/full`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        fetch(url, { signal: controller.signal })
          .then(res => {
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res.json();
          })
          .then(data => {
            console.log(`✓ Keep-alive ping successful - ${data.totalPoems ?? '?'} poems in database`);

            // Schedule next ping with new random interval
            keepAliveTimeout = setTimeout(() => {
              pingHealth();
            }, getRandomInterval());
          })
          .catch(err => {
            console.error(`⚠ Keep-alive ping failed (${url}):`, err.message);

            // Retry with new random interval even on failure
            keepAliveTimeout = setTimeout(() => {
              pingHealth();
            }, getRandomInterval());
          })
          .finally(() => {
            clearTimeout(timeoutId);
          });
      };
      
      const initialInterval = getRandomInterval();
      console.log(`🔄 Starting keep-alive self-ping (every 9-13 minutes, initial: ${Math.round(initialInterval / 60000)} min)`);
      
      // Start first ping after random interval
      keepAliveTimeout = setTimeout(() => {
        pingHealth();
      }, initialInterval);
    }, 30 * 1000); // Wait 30 seconds before first ping
  }

  // Graceful shutdown
  process.on('SIGTERM', () => {
    log.info('Server', 'SIGTERM received — shutting down');

    // Clear keep-alive timeout
    if (keepAliveTimeout) {
      clearTimeout(keepAliveTimeout);
      log.info('Server', 'Keep-alive timeout cleared');
    }

    // Close server first, then database pool, then flush Sentry
    server.close(async () => {
      log.info('Server', 'HTTP server closed');
      pool.end(async () => {
        log.info('Server', 'Database pool closed');
        await Sentry.close(2000);
        process.exit(0);
      });
    });
  });
}

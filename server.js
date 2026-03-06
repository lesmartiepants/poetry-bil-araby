import express from 'express';
import pg from 'pg';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3001;
const LOG_ENABLED = process.env.LOG_ENABLED !== 'false'; // on by default
const LOG_DEBUG = process.env.LOG_DEBUG === 'true';       // verbose DB debug, off by default

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

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    log.error('DB', 'Failed to connect to PostgreSQL', err.message);
  } else {
    log.info('DB', `Connected to PostgreSQL at ${res.rows[0].now}`);
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/', rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true, legacyHeaders: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    log.info('HTTP', `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM poems');
    res.json({
      status: 'ok',
      database: 'connected',
      totalPoems: parseInt(result.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get random poem
app.get('/api/poems/random', async (req, res) => {
  try {
    const { poet } = req.query;

    let query = `
      SELECT
        p.id,
        p.title,
        p.content as arabic,
        po.name as poet,
        t.name as theme
      FROM poems p
      JOIN poets po ON p.poet_id = po.id
      JOIN themes t ON p.theme_id = t.id
    `;

    const params = [];
    if (poet && poet !== 'All') {
      query += ' WHERE po.name = $1';
      params.push(poet);
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

    log.info('Poems', `Random poem: id=${poem.id}, poet=${poem.poet}, arabic_len=${formattedPoem.arabic?.length || 0}`);
    res.json(formattedPoem);
  } catch (error) {
    log.error('Poems', `Error fetching random poem: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Get poems by poet
app.get('/api/poems/by-poet/:poet', async (req, res) => {
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
        p.content as arabic,
        po.name as poet,
        t.name as theme
      FROM poems p
      JOIN poets po ON p.poet_id = po.id
      JOIN themes t ON p.theme_id = t.id
      WHERE po.name = $1
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
    log.error('Poems', `Error fetching poems by poet: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Get list of available poets
app.get('/api/poets', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT po.name, COUNT(p.id) as poem_count
      FROM poets po
      JOIN poems p ON po.id = p.poet_id
      GROUP BY po.name
      HAVING COUNT(p.id) > 0
      ORDER BY poem_count DESC
      LIMIT 50
    `;

    const result = await pool.query(query);
    log.info('Poets', `Returned ${result.rows.length} poets`);
    res.json(result.rows);
  } catch (error) {
    log.error('Poets', `Error fetching poets: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Search poems
app.get('/api/poems/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    // Convert query param to integer for type safety
    const limitNum = parseInt(limit, 10);

    const query = `
      SELECT
        p.id,
        p.title,
        p.content as arabic,
        po.name as poet,
        t.name as theme
      FROM poems p
      JOIN poets po ON p.poet_id = po.id
      JOIN themes t ON p.theme_id = t.id
      WHERE p.title ILIKE $1 OR p.content ILIKE $1 OR po.name ILIKE $1
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
    log.error('Search', `Error searching poems: ${error.message}`);
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ ok: false, error: error.message });
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
    console.error('Error fetching design items:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/design-review/items/sync — bulk upsert from CATALOG (idempotent, batched)
app.post('/api/design-review/items/sync', async (req, res) => {
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
    console.error('Error syncing design items:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/design-review/sessions — list review sessions (supports ?status= filter)
app.get('/api/design-review/sessions', async (req, res) => {
  try {
    if (!(await designTablesExist())) return res.json([]);
    const { status } = req.query;
    let query = 'SELECT * FROM design_review_sessions';
    const params = [];
    if (status) { params.push(status); query += ` WHERE status = $1`; }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/design-review/sessions — create new review session
app.post('/api/design-review/sessions', async (req, res) => {
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
    console.error('Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/design-review/sessions/:id — complete session, add notes
app.patch('/api/design-review/sessions/:id', async (req, res) => {
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
    console.error('Error updating session:', error);
    res.status(500).json({ error: error.message });
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
    console.error('Error fetching verdicts:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/design-review/sessions/:id/verdicts — bulk submit/update verdicts (batched)
app.post('/api/design-review/sessions/:id/verdicts', async (req, res) => {
  try {
    if (!(await designTablesExist())) return res.status(503).json({ error: 'Design tables not created yet' });
    const { id } = req.params;
    const { verdicts } = req.body;
    if (!Array.isArray(verdicts)) return res.status(400).json({ error: 'verdicts must be an array' });

    // Resolve all item_keys to item_ids in a single query
    const keys = verdicts.filter(v => v.item_key && !v.item_id).map(v => v.item_key);
    const keyMap = Object.create(null);
    if (keys.length > 0) {
      const keyResult = await pool.query(
        'SELECT id, item_key FROM design_items WHERE item_key = ANY($1)',
        [keys]
      );
      keyResult.rows.forEach(r => { keyMap[r.item_key] = r.id; });
    }

    // Build batch of resolved verdicts
    const resolved = [];
    for (const v of verdicts) {
      const item_id = v.item_id || keyMap[v.item_key];
      if (!item_id) continue;
      resolved.push({ session_id: id, item_id, item_key: v.item_key, verdict: v.verdict, comment: v.comment || null, priority: v.priority || 0, tags: v.tags || null });
    }

    if (resolved.length > 0) {
      // Single multi-row INSERT...ON CONFLICT (all values parameterized)
      const params = [];
      const valueTuples = [];
      for (let i = 0; i < resolved.length; i++) {
        const p = i * 7;
        const r = resolved[i];
        params.push(r.session_id, r.item_id, r.item_key, r.verdict, r.comment, r.priority, r.tags);
        valueTuples.push('($' + (p+1) + ', $' + (p+2) + ', $' + (p+3) + ', $' + (p+4) + ', $' + (p+5) + ', $' + (p+6) + ', $' + (p+7) + ')');
      }

      const sql = 'INSERT INTO design_verdicts (session_id, item_id, item_key, verdict, comment, priority, tags) ' +
        'VALUES ' + valueTuples.join(', ') + ' ' +
        'ON CONFLICT (session_id, item_id) DO UPDATE SET ' +
        'verdict = EXCLUDED.verdict, comment = EXCLUDED.comment, priority = EXCLUDED.priority, tags = EXCLUDED.tags, updated_at = now()';
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
    console.error('Error saving verdicts:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/design-review/summary — aggregated stats
app.get('/api/design-review/summary', async (req, res) => {
  try {
    if (!(await designTablesExist())) return res.json({ total_items: 0, sessions: 0, verdicts: {} });

    const items = await pool.query('SELECT COUNT(*) FROM design_items WHERE is_active = true');
    const sessions = await pool.query('SELECT COUNT(*) FROM design_review_sessions');
    const latestSession = await pool.query(
      'SELECT id, round_number, status FROM design_review_sessions ORDER BY created_at DESC LIMIT 1'
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
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: error.message });
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
      sessionQuery += ' ORDER BY created_at DESC LIMIT 1';
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

    // Build evolution map (item_key -> [{round, verdict, comment}])
    const evolution = {};
    verdicts.forEach(v => {
      if (!evolution[v.item_key]) evolution[v.item_key] = [];
      evolution[v.item_key].push({
        round: v.round_number,
        verdict: v.verdict,
        comment: v.comment,
        tags: v.tags,
        date: v.created_at
      });
    });

    res.json({
      items: items.rows,
      sessions: sessions.rows,
      verdicts,
      evolution,
      summary: {
        total_items: items.rows.length,
        reviewed: verdicts.length,
        by_verdict: verdicts.reduce((acc, v) => { acc[v.verdict] = (acc[v.verdict] || 0) + 1; return acc; }, {})
      }
    });
  } catch (error) {
    console.error('Error building claude context:', error);
    res.status(500).json({ error: error.message });
  }
});

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
          ? `${process.env.RENDER_EXTERNAL_URL}/api/health`
          : `http://localhost:${PORT}/api/health`;
        
        fetch(url)
          .then(res => {
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res.json();
          })
          .then(data => {
            console.log(`✓ Keep-alive ping successful - ${data.totalPoems} poems in database`);
            
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

    // Close server first, then database pool
    server.close(() => {
      log.info('Server', 'HTTP server closed');
      pool.end(() => {
        log.info('Server', 'Database pool closed');
        process.exit(0);
      });
    });
  });
}

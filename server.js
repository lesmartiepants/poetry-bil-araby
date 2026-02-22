import express from 'express';
import pg from 'pg';
import cors from 'cors';
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

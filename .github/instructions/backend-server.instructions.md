---
applyTo: "server.js,**/*.server.js"
---

# Backend Server

**Stack:** Express.js + PostgreSQL (pg library) + CORS
**Port:** 3001 (configurable via `PORT` env var)

## API Endpoints

```javascript
GET /api/health                      // { status: 'ok', poemCount: 84329 }
GET /api/poems/random?poet=نزار قباني  // Random poem (optional poet filter)
GET /api/poems/by-poet/:poet        // Poems by specific poet
GET /api/poets                      // [{ name, count }, ...]
GET /api/poems/search?q=query       // Search poems
```

## Database Connection

**Env vars:** `DATABASE_URL` (production) or `PGUSER`, `PGHOST`, `PGDATABASE`, `PGPASSWORD`, `PGPORT` (local)

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  user: process.env.PGUSER || process.env.USER,
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'qafiyah',
  password: process.env.PGPASSWORD || '',
  port: parseInt(process.env.PGPORT || '5432'),
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});
```

## Best Practices

**Security:**
```javascript
// ✅ Parameterized queries (prevent SQL injection)
await pool.query('SELECT * FROM poems WHERE poet = $1', [poet]);

// ❌ Never concatenate user input
await pool.query(`SELECT * FROM poems WHERE poet = '${poet}'`);
```

**Error Handling:**
- Try-catch all database queries
- Return 200 (success), 404 (not found), 500 (server error)
- Log errors to console

**Performance:**
- Use `pg.Pool` for connection pooling (reuse connections)
- Keep-alive ping every 10min to prevent Render cold starts
- Add indexes on frequently queried columns (poet, tags)

**Testing:** Use Supertest for API tests

```javascript
import request from 'supertest';
import app from './server.js';

test('GET /api/health returns 200', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
});
```

**Deployment:** Never commit credentials, use env vars (`.env` local, Render dashboard for production)

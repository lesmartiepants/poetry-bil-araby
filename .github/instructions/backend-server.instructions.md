---
applyTo: "server.js,**/*.server.js"
---

# Backend Server Instructions

## Server Architecture

- **Express.js** REST API server
- **PostgreSQL** database connection via `pg` library
- **CORS** enabled for frontend communication
- **Port**: 3001 (default, configurable via `PORT` env var)

## API Endpoints

### Health Check
```javascript
GET /api/health
Response: { status: 'ok', poemCount: 84329, timestamp: '...' }
```

### Random Poem
```javascript
GET /api/poems/random?poet=نزار قباني
Response: { id, title, poet, verses, ... }
```

### Poems by Poet
```javascript
GET /api/poems/by-poet/:poet
Response: [{ id, title, poet, verses, ... }, ...]
```

### List Poets
```javascript
GET /api/poets
Response: [{ name: 'نزار قباني', count: 1234 }, ...]
```

### Search Poems
```javascript
GET /api/poems/search?q=query
Response: [{ id, title, poet, verses, ... }, ...]
```

## Database Connection

### Environment Variables
```javascript
// Production (Supabase/Render)
DATABASE_URL       // Full connection string

// Local development
PGUSER            // Default: $USER
PGHOST            // Default: localhost
PGDATABASE        // Default: qafiyah
PGPASSWORD        // Default: empty string
PGPORT            // Default: 5432
```

### Connection Pattern
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

## Error Handling

- Always use try-catch blocks for database queries
- Return appropriate HTTP status codes:
  - 200: Success
  - 404: Not found
  - 500: Server error
- Log errors to console for debugging
- Return user-friendly error messages

```javascript
try {
  const result = await pool.query('SELECT ...');
  res.json(result.rows);
} catch (error) {
  console.error('Database error:', error);
  res.status(500).json({ error: 'Failed to fetch poems' });
}
```

## Performance Considerations

### Keep-Alive Ping
- Prevent cold starts on Render with periodic ping
- Run every 10 minutes to keep connection alive

```javascript
setInterval(async () => {
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    console.error('Keep-alive ping failed:', error);
  }
}, 10 * 60 * 1000);
```

### Connection Pooling
- Use `pg.Pool` for connection pooling
- Don't create new connections for each request
- Reuse connections from the pool

### Query Optimization
- Use parameterized queries to prevent SQL injection
- Add indexes on frequently queried columns (poet, tags)
- Limit result sets when appropriate

## Security

### SQL Injection Prevention
```javascript
// ✅ Good - parameterized query
const result = await pool.query(
  'SELECT * FROM poems WHERE poet = $1',
  [poet]
);

// ❌ Bad - string concatenation
const result = await pool.query(
  `SELECT * FROM poems WHERE poet = '${poet}'`
);
```

### CORS Configuration
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

### Environment Variables
- Never commit database credentials
- Use `.env` file locally (gitignored)
- Set environment variables in Render dashboard for production

## Testing

### Unit Tests (Vitest)
- Test API endpoints with Supertest
- Mock database queries when appropriate
- Test error handling

```javascript
import request from 'supertest';
import app from './server.js';

test('GET /api/health returns 200', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('ok');
});
```

### Integration Tests (Playwright)
- Test full stack: frontend → backend → database
- Use test database or mock data
- Verify data flows correctly

## Deployment

### Render
- Configure in `render.yaml`
- Auto-deploys from `main` branch
- Environment variables set in Render dashboard
- Uses `DATABASE_URL` for PostgreSQL connection

### Local Development
```bash
# Start backend server
npm run dev:server

# Start frontend + backend concurrently
npm run dev:all
```

## Common Patterns

### Fetching Random Poem
```javascript
app.get('/api/poems/random', async (req, res) => {
  try {
    const { poet } = req.query;
    let query = 'SELECT * FROM poems';
    let params = [];
    
    if (poet) {
      query += ' WHERE poet = $1';
      params.push(poet);
    }
    
    query += ' ORDER BY RANDOM() LIMIT 1';
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No poems found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching random poem:', error);
    res.status(500).json({ error: 'Failed to fetch poem' });
  }
});
```

### Aggregating Data
```javascript
app.get('/api/poets', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT poet, COUNT(*) as count
      FROM poems
      GROUP BY poet
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching poets:', error);
    res.status(500).json({ error: 'Failed to fetch poets' });
  }
});
```

## Debugging

### Logging
- Log all database queries in development
- Log errors with stack traces
- Use `console.error()` for errors, `console.log()` for info

### Health Check
- Use `/api/health` endpoint to verify server is running
- Check poem count to verify database connection
- Monitor response time

### Database Connection Issues
- Verify `DATABASE_URL` or individual PG env vars
- Check PostgreSQL is running locally
- Verify SSL settings for production

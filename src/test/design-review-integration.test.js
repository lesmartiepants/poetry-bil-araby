/**
 * Design Review — Real Database Integration Tests
 *
 * These tests run against the ACTUAL Supabase database.
 * They are excluded from the normal `npm test` run (vitest.config.js).
 * Run via: npm run test:integration
 *
 * Required env vars:
 *   DATABASE_URL  — Supabase connection string (set as DATABASE_URL repo secret)
 *
 * Test data is written with reviewer='ci-integration' for easy identification.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

const CI_REVIEWER = 'ci-integration';
const CI_ITEM_KEY = 'ci-integration-test-item';

// Safety net: if DATABASE_URL is not set this suite is skipped gracefully.
// In CI this env var is always provided via the design-review-integration workflow.
describe.skipIf(!process.env.DATABASE_URL)('Design Review — Real Database Integration', () => {
  let app;
  let pool;
  let sessionId;

  beforeAll(async () => {
    // Import server.js inside beforeAll so no pool is created when DATABASE_URL is absent.
    // This avoids noisy connection errors and open handles when the suite is skipped.
    const serverModule = await import('../../server.js');
    app = serverModule.app;
    pool = serverModule.pool;

    // Pre-flight: verify DB connectivity and log available tables for debugging.
    // A single clear error here is far easier to diagnose than 9 cascading failures.
    const dbInfo = await pool.query(
      `SELECT current_database() AS db, version() AS pg_version`
    );
    console.log('[CI] Connected to DB:', dbInfo.rows[0].db, '|', dbInfo.rows[0].pg_version.split(' ').slice(0, 2).join(' '));

    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`
    );
    const tableNames = tables.rows.map(r => r.table_name);
    console.log('[CI] Available tables:', tableNames.join(', ') || '(none)');

    const designTables = ['design_items', 'design_review_sessions', 'design_verdicts', 'design_review_history'];
    const missing = designTables.filter(t => !tableNames.includes(t));
    if (missing.length > 0) {
      throw new Error(
        `Design review tables missing from DB: ${missing.join(', ')}. ` +
        `Run the migration (supabase db push) and retry.`
      );
    }
  });

  afterAll(async () => {
    if (pool && typeof pool.end === 'function') {
      await pool.end();
    }
  });

  it('GET /api/health returns ok with poem count', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status, `health check failed: ${JSON.stringify(res.body)}`).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/design-review/items/sync upserts a catalog item', async () => {
    const res = await request(app)
      .post('/api/design-review/items/sync')
      .send({
        items: [{
          item_key: CI_ITEM_KEY,
          name: 'CI Integration Test Item',
          component: 'ci',
          category: 'integration-test',
          file_path: '/ci/integration-test',
          description: 'Created by CI integration test — safe to ignore'
        }]
      });
    expect(res.status, `items/sync failed: ${JSON.stringify(res.body)}`).toBe(200);
    expect(res.body.upserted).toBe(1);
    expect(res.body.total).toBe(1);
  });

  it('GET /api/design-review/items returns the synced item', async () => {
    const res = await request(app).get('/api/design-review/items?component=ci');
    expect(res.status, `GET items failed: ${JSON.stringify(res.body)}`).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const item = res.body.find(i => i.item_key === CI_ITEM_KEY);
    expect(item, `item ${CI_ITEM_KEY} not found in ${JSON.stringify(res.body)}`).toBeDefined();
    expect(item.name).toBe('CI Integration Test Item');
  });

  it('POST /api/design-review/sessions creates a new session', async () => {
    const res = await request(app)
      .post('/api/design-review/sessions')
      .send({ reviewer: CI_REVIEWER, total_designs: 1 });
    expect(res.status, `POST sessions failed: ${JSON.stringify(res.body)}`).toBe(201);
    expect(typeof res.body.id, `session id should be number, got: ${JSON.stringify(res.body)}`).toBe('number');
    expect(res.body.status).toBe('in_progress');
    expect(res.body.reviewer).toBe(CI_REVIEWER);
    sessionId = res.body.id;
  });

  it('POST /api/design-review/sessions/:id/verdicts saves a verdict', async () => {
    expect(sessionId, 'sessionId not set — did the session creation test pass?').toBeDefined();
    const res = await request(app)
      .post(`/api/design-review/sessions/${sessionId}/verdicts`)
      .send({
        verdicts: [{
          item_key: CI_ITEM_KEY,
          verdict: 'keep',
          comment: 'CI integration test verdict — safe to ignore'
        }]
      });
    expect(res.status, `POST verdicts failed: ${JSON.stringify(res.body)}`).toBe(200);
    expect(res.body.saved).toBe(1);
    expect(res.body.total).toBe(1);
  });

  it('GET /api/design-review/sessions/:id/verdicts returns the saved verdict', async () => {
    expect(sessionId, 'sessionId not set — did the session creation test pass?').toBeDefined();
    const res = await request(app).get(`/api/design-review/sessions/${sessionId}/verdicts`);
    expect(res.status, `GET verdicts failed: ${JSON.stringify(res.body)}`).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const verdict = res.body.find(v => v.item_key === CI_ITEM_KEY);
    expect(verdict, `verdict for ${CI_ITEM_KEY} not found`).toBeDefined();
    expect(verdict.verdict).toBe('keep');
  });

  it('PATCH /api/design-review/sessions/:id marks the session completed', async () => {
    expect(sessionId, 'sessionId not set — did the session creation test pass?').toBeDefined();
    const res = await request(app)
      .patch(`/api/design-review/sessions/${sessionId}`)
      .send({ status: 'completed', reviewed_count: 1 });
    expect(res.status, `PATCH session failed: ${JSON.stringify(res.body)}`).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.reviewed_count).toBe(1);
  });

  it('GET /api/design-review/summary reflects the persisted data', async () => {
    const res = await request(app).get('/api/design-review/summary');
    expect(res.status, `GET summary failed: ${JSON.stringify(res.body)}`).toBe(200);
    expect(res.body.total_items, `total_items should be > 0, got: ${JSON.stringify(res.body)}`).toBeGreaterThan(0);
    expect(res.body.sessions, `sessions should be > 0`).toBeGreaterThan(0);
    expect(typeof res.body.verdicts.keep).toBe('number');
  });

  it('GET /api/design-review/items/:itemKey/history shows verdict history', async () => {
    expect(sessionId, 'sessionId not set — did the session creation test pass?').toBeDefined();
    const res = await request(app).get(`/api/design-review/items/${CI_ITEM_KEY}/history`);
    expect(res.status, `GET history failed: ${JSON.stringify(res.body)}`).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length, `history should not be empty for ${CI_ITEM_KEY}`).toBeGreaterThan(0);
    expect(res.body[0].action).toBe('create_verdict');
  });
});

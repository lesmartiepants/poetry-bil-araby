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

import { describe, it, expect } from 'vitest';
import request from 'supertest';

// Re-import server.js WITHOUT pg mocking — connects to real DATABASE_URL.
// We reset the module registry so the mock from other test files doesn't bleed in.
const { app } = await import('../../server.js');

const CI_REVIEWER = 'ci-integration';
const CI_ITEM_KEY = 'ci-integration-test-item';

// Safety net: if DATABASE_URL is not set this suite is skipped gracefully.
// In CI this env var is always provided via the design-review-integration workflow.
describe.skipIf(!process.env.DATABASE_URL)('Design Review — Real Database Integration', () => {
  let sessionId;

  it('GET /api/health returns ok with poem count', async () => {
    const res = await request(app).get('/api/health').expect(200);
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
      })
      .expect(200);
    expect(res.body.upserted).toBe(1);
    expect(res.body.total).toBe(1);
  });

  it('GET /api/design-review/items returns the synced item', async () => {
    const res = await request(app)
      .get('/api/design-review/items?component=ci')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    const item = res.body.find(i => i.item_key === CI_ITEM_KEY);
    expect(item).toBeDefined();
    expect(item.name).toBe('CI Integration Test Item');
  });

  it('POST /api/design-review/sessions creates a new session', async () => {
    const res = await request(app)
      .post('/api/design-review/sessions')
      .send({ reviewer: CI_REVIEWER, total_designs: 1 })
      .expect(201);
    expect(typeof res.body.id).toBe('number');
    expect(res.body.status).toBe('in_progress');
    expect(res.body.reviewer).toBe(CI_REVIEWER);
    sessionId = res.body.id;
  });

  it('POST /api/design-review/sessions/:id/verdicts saves a verdict', async () => {
    const res = await request(app)
      .post(`/api/design-review/sessions/${sessionId}/verdicts`)
      .send({
        verdicts: [{
          item_key: CI_ITEM_KEY,
          verdict: 'keep',
          comment: 'CI integration test verdict — safe to ignore'
        }]
      })
      .expect(200);
    expect(res.body.saved).toBe(1);
    expect(res.body.total).toBe(1);
  });

  it('GET /api/design-review/sessions/:id/verdicts returns the saved verdict', async () => {
    const res = await request(app)
      .get(`/api/design-review/sessions/${sessionId}/verdicts`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    const verdict = res.body.find(v => v.item_key === CI_ITEM_KEY);
    expect(verdict).toBeDefined();
    expect(verdict.verdict).toBe('keep');
  });

  it('PATCH /api/design-review/sessions/:id marks the session completed', async () => {
    const res = await request(app)
      .patch(`/api/design-review/sessions/${sessionId}`)
      .send({ status: 'completed', reviewed_count: 1 })
      .expect(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.reviewed_count).toBe(1);
  });

  it('GET /api/design-review/summary reflects the persisted data', async () => {
    const res = await request(app)
      .get('/api/design-review/summary')
      .expect(200);
    expect(res.body.total_items).toBeGreaterThan(0);
    expect(res.body.sessions).toBeGreaterThan(0);
    expect(typeof res.body.verdicts.keep).toBe('number');
    expect(res.body.verdicts.keep).toBeGreaterThan(0);
  });

  it('GET /api/design-review/items/:itemKey/history shows verdict history', async () => {
    const res = await request(app)
      .get(`/api/design-review/items/${CI_ITEM_KEY}/history`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].action).toBe('create_verdict');
  });
});

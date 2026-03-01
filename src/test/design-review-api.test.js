import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';

// Mock pg module before importing server
const mockPool = {
  query: vi.fn(),
  end: vi.fn()
};

vi.mock('pg', () => {
  return {
    default: {
      Pool: class MockPool {
        constructor() {
          return mockPool;
        }
      }
    },
    Pool: class MockPool {
      constructor() {
        return mockPool;
      }
    }
  };
});

// Import after mocking
const { app } = await import('../../server.js');

describe('Design Review API', () => {
  beforeEach(() => {
    mockPool.query.mockClear();
  });

  afterAll(() => {
    mockPool.end();
  });

  // Helper: mock designTablesExist() to return true
  // The first query in each endpoint is `SELECT 1 FROM design_items LIMIT 0`
  function mockTablesExist() {
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // designTablesExist check
  }

  function mockTablesNotExist() {
    mockPool.query.mockRejectedValueOnce(new Error('relation "design_items" does not exist'));
  }

  describe('GET /api/design-review/items', () => {
    it('should return empty array when design tables do not exist', async () => {
      mockTablesNotExist();

      const response = await request(app)
        .get('/api/design-review/items')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return design items when tables exist', async () => {
      mockTablesExist();
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, item_key: 'splash-zen-1', name: 'Zen Refined', component: 'splash', category: 'zen' },
          { id: 2, item_key: 'splash-ink-1', name: 'Ink Calligraphy', component: 'splash', category: 'ink' }
        ]
      });

      const response = await request(app)
        .get('/api/design-review/items')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].item_key).toBe('splash-zen-1');
    });

    it('should filter by component', async () => {
      mockTablesExist();
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, item_key: 'splash-zen-1', component: 'splash' }]
      });

      const response = await request(app)
        .get('/api/design-review/items?component=splash')
        .expect(200);

      expect(response.body).toHaveLength(1);
      // Verify the query was called with parameterized component filter
      const queryCall = mockPool.query.mock.calls[1];
      expect(queryCall[1]).toContain('splash');
    });

    it('should handle database errors', async () => {
      mockTablesExist();
      mockPool.query.mockRejectedValueOnce(new Error('DB error'));

      const response = await request(app)
        .get('/api/design-review/items')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/design-review/items/sync', () => {
    it('should return 503 when design tables do not exist', async () => {
      mockTablesNotExist();

      const response = await request(app)
        .post('/api/design-review/items/sync')
        .send({ items: [] })
        .expect(503);

      expect(response.body.error).toContain('Design tables not created yet');
    });

    it('should return 400 when items is not an array', async () => {
      mockTablesExist();

      const response = await request(app)
        .post('/api/design-review/items/sync')
        .send({ items: 'not-array' })
        .expect(400);

      expect(response.body.error).toBe('items must be an array');
    });

    it('should upsert design items', async () => {
      mockTablesExist();
      // Mock insert for each item
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // first item insert

      const response = await request(app)
        .post('/api/design-review/items/sync')
        .send({
          items: [
            { item_key: 'splash-zen-1', name: 'Zen Refined', component: 'splash', category: 'zen', file_path: '/splash/zen/option-1.html' }
          ]
        })
        .expect(200);

      expect(response.body.upserted).toBe(1);
      expect(response.body.total).toBe(1);
    });
  });

  describe('GET /api/design-review/sessions', () => {
    it('should return empty array when tables do not exist', async () => {
      mockTablesNotExist();

      const response = await request(app)
        .get('/api/design-review/sessions')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return sessions ordered by creation date', async () => {
      mockTablesExist();
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 2, round_number: 2, status: 'in_progress', created_at: '2026-02-22' },
          { id: 1, round_number: 1, status: 'completed', created_at: '2026-02-20' }
        ]
      });

      const response = await request(app)
        .get('/api/design-review/sessions')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].round_number).toBe(2);
    });
  });

  describe('POST /api/design-review/sessions', () => {
    it('should return 503 when tables do not exist', async () => {
      mockTablesNotExist();

      const response = await request(app)
        .post('/api/design-review/sessions')
        .send({ reviewer: 'tester', total_designs: 57 })
        .expect(503);

      expect(response.body.error).toContain('Design tables not created yet');
    });

    it('should create a new session with auto-incremented round number', async () => {
      mockTablesExist();
      // Mock round number query
      mockPool.query.mockResolvedValueOnce({ rows: [{ next_round: 3 }] });
      // Mock insert
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 3, reviewer: 'owner', round_number: 3, total_designs: 57, status: 'in_progress' }]
      });

      const response = await request(app)
        .post('/api/design-review/sessions')
        .send({ reviewer: 'owner', total_designs: 57 })
        .expect(201);

      expect(response.body.round_number).toBe(3);
      expect(response.body.status).toBe('in_progress');
    });
  });

  describe('PATCH /api/design-review/sessions/:id', () => {
    it('should return 503 when tables do not exist', async () => {
      mockTablesNotExist();

      const response = await request(app)
        .patch('/api/design-review/sessions/1')
        .send({ status: 'completed' })
        .expect(503);

      expect(response.body.error).toContain('Design tables not created yet');
    });

    it('should return 400 when no fields to update', async () => {
      mockTablesExist();

      const response = await request(app)
        .patch('/api/design-review/sessions/1')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('No fields to update');
    });

    it('should update session status', async () => {
      mockTablesExist();
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, status: 'completed', completed_at: '2026-02-22' }]
      });

      const response = await request(app)
        .patch('/api/design-review/sessions/1')
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.status).toBe('completed');
    });

    it('should return 404 when session not found', async () => {
      mockTablesExist();
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .patch('/api/design-review/sessions/999')
        .send({ status: 'completed' })
        .expect(404);

      expect(response.body.error).toBe('Session not found');
    });
  });

  describe('GET /api/design-review/sessions/:id/verdicts', () => {
    it('should return empty array when tables do not exist', async () => {
      mockTablesNotExist();

      const response = await request(app)
        .get('/api/design-review/sessions/1/verdicts')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return verdicts for a session', async () => {
      mockTablesExist();
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { session_id: 1, item_key: 'splash-zen-1', verdict: 'keep', comment: 'Great design' },
          { session_id: 1, item_key: 'splash-ink-1', verdict: 'revisit', comment: 'Needs work' }
        ]
      });

      const response = await request(app)
        .get('/api/design-review/sessions/1/verdicts')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].verdict).toBe('keep');
    });
  });

  describe('POST /api/design-review/sessions/:id/verdicts', () => {
    it('should return 503 when tables do not exist', async () => {
      mockTablesNotExist();

      const response = await request(app)
        .post('/api/design-review/sessions/1/verdicts')
        .send({ verdicts: [] })
        .expect(503);

      expect(response.body.error).toContain('Design tables not created yet');
    });

    it('should return 400 when verdicts is not an array', async () => {
      mockTablesExist();

      const response = await request(app)
        .post('/api/design-review/sessions/1/verdicts')
        .send({ verdicts: 'not-array' })
        .expect(400);

      expect(response.body.error).toBe('verdicts must be an array');
    });

    it('should save verdicts with history tracking', async () => {
      mockTablesExist();
      // Mock item lookup
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 10 }] });
      // Mock existing verdict check (no existing)
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // Mock verdict insert
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // Mock history insert
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // Mock count query
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      // Mock update reviewed_count
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/design-review/sessions/1/verdicts')
        .send({
          verdicts: [
            { item_key: 'splash-zen-1', verdict: 'keep', comment: 'Beautiful' }
          ]
        })
        .expect(200);

      expect(response.body.saved).toBe(1);
      expect(response.body.total).toBe(1);
    });
  });

  describe('GET /api/design-review/items/:itemKey/history', () => {
    it('should return empty array when tables do not exist', async () => {
      mockTablesNotExist();

      const response = await request(app)
        .get('/api/design-review/items/splash-zen-1/history')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return verdict history for an item', async () => {
      mockTablesExist();
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { item_key: 'splash-zen-1', action: 'create_verdict', round_number: 1, new_value: { verdict: 'keep' } },
          { item_key: 'splash-zen-1', action: 'update_verdict', round_number: 2, new_value: { verdict: 'revisit' } }
        ]
      });

      const response = await request(app)
        .get('/api/design-review/items/splash-zen-1/history')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].action).toBe('create_verdict');
    });
  });

  describe('GET /api/design-review/summary', () => {
    it('should return zeroed summary when tables do not exist', async () => {
      mockTablesNotExist();

      const response = await request(app)
        .get('/api/design-review/summary')
        .expect(200);

      expect(response.body).toEqual({ total_items: 0, sessions: 0, verdicts: {} });
    });

    it('should return aggregated stats', async () => {
      mockTablesExist();
      // Mock items count
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '57' }] });
      // Mock sessions count
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      // Mock latest session
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 2, round_number: 2, status: 'in_progress' }] });
      // Mock verdict counts
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { verdict: 'keep', count: '20' },
          { verdict: 'discard', count: '10' },
          { verdict: 'revisit', count: '5' }
        ]
      });

      const response = await request(app)
        .get('/api/design-review/summary')
        .expect(200);

      expect(response.body.total_items).toBe(57);
      expect(response.body.sessions).toBe(2);
      expect(response.body.verdicts.keep).toBe(20);
      expect(response.body.verdicts.discard).toBe(10);
      expect(response.body.verdicts.unreviewed).toBe(22);
    });
  });

  describe('GET /api/design-review/claude-context', () => {
    it('should return empty context when tables do not exist', async () => {
      mockTablesNotExist();

      const response = await request(app)
        .get('/api/design-review/claude-context')
        .expect(200);

      expect(response.body).toEqual({ items: [], sessions: [], verdicts: [] });
    });

    it('should return structured context for Claude agent', async () => {
      mockTablesExist();
      // Mock sessions query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, round_number: 1, status: 'completed' }]
      });
      // Mock items query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, item_key: 'splash-zen-1', component: 'splash', category: 'zen', is_active: true }]
      });
      // Mock verdicts query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ item_key: 'splash-zen-1', verdict: 'keep', comment: 'Great', round_number: 1 }]
      });

      const response = await request(app)
        .get('/api/design-review/claude-context')
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('sessions');
      expect(response.body).toHaveProperty('verdicts');
      expect(response.body).toHaveProperty('evolution');
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary.total_items).toBe(1);
    });
  });
});

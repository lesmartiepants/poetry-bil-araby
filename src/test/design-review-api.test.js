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
  const originalApiKey = process.env.API_SECRET_KEY;

  beforeEach(() => {
    mockPool.query.mockReset();
    // Clear API_SECRET_KEY so auth middleware is bypassed in these tests
    delete process.env.API_SECRET_KEY;
  });

  afterAll(() => {
    if (originalApiKey !== undefined) {
      process.env.API_SECRET_KEY = originalApiKey;
    }
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

      expect(response.body.error).toBe('items must be a non-empty array');
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

    it('should save verdicts with enriched metadata', async () => {
      mockTablesExist();
      // Mock batch item_key -> id lookup (SELECT id, item_key, name, component, category, generation)
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 10, item_key: 'splash-zen-1', name: 'Zen Refined', component: 'splash', category: 'zen', generation: 1 }]
      });
      // Mock batch verdict upsert (single INSERT...ON CONFLICT)
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // Mock count query
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      // Mock update reviewed_count
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/design-review/sessions/1/verdicts')
        .send({
          verdicts: [{
            item_key: 'splash-zen-1', verdict: 'keep', comment: 'Beautiful',
            design_name: 'Zen Refined', component: 'onboarding', category: 'zen',
            generation: 1, position_in_filter: 5, total_in_filter: 20,
            position_in_session: 12, total_in_session: 45,
            component_tags: ['splash', 'zen', 'onboarding']
          }]
        })
        .expect(200);

      expect(response.body.saved).toBe(1);
      expect(response.body.total).toBe(1);

      // Verify the INSERT SQL contains the new enriched columns and 16 parameters per row
      const insertCall = mockPool.query.mock.calls[2]; // index 0=table check, 1=keyMap lookup, 2=INSERT
      const sql = insertCall[0];
      expect(sql).toContain('design_name');
      expect(sql).toContain('component');
      expect(sql).toContain('category');
      expect(sql).toContain('generation');
      expect(sql).toContain('position_in_filter');
      expect(sql).toContain('total_in_filter');
      expect(sql).toContain('position_in_session');
      expect(sql).toContain('total_in_session');
      expect(sql).toContain('component_tags');
      // 16 parameters per row: $1 through $16
      expect(sql).toContain('$16');
      expect(sql).not.toContain('$17');

      // Verify parameter values include enriched metadata
      const params = insertCall[1];
      expect(params).toHaveLength(16);
      expect(params).toContain('Zen Refined');    // design_name
      expect(params).toContain('onboarding');      // component (from payload, not keyMap)
      expect(params).toContain(5);                 // position_in_filter
      expect(params).toContain(20);                // total_in_filter
      expect(params).toContain(12);                // position_in_session
      expect(params).toContain(45);                // total_in_session
      expect(params).toContainEqual(['splash', 'zen', 'onboarding']); // component_tags
    });

    it('should fallback to design_items metadata when verdict only has item_key', async () => {
      mockTablesExist();
      // Mock batch item_key -> id lookup returns full metadata
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 10, item_key: 'splash-zen-1', name: 'Zen Refined', component: 'splash', category: 'zen', generation: 1 }]
      });
      // Mock batch verdict upsert
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // Mock count query
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      // Mock update reviewed_count
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/design-review/sessions/1/verdicts')
        .send({
          verdicts: [
            { item_key: 'splash-zen-1', verdict: 'keep' }
          ]
        })
        .expect(200);

      expect(response.body.saved).toBe(1);

      // Verify that fallback values from keyMap are used in INSERT params
      const insertCall = mockPool.query.mock.calls[2];
      const params = insertCall[1];
      expect(params).toHaveLength(16);
      // design_name falls back to lookup.name
      expect(params[7]).toBe('Zen Refined');
      // component falls back to lookup.component
      expect(params[8]).toBe('splash');
      // category falls back to lookup.category
      expect(params[9]).toBe('zen');
      // generation falls back to lookup.generation
      expect(params[10]).toBe(1);
      // position fields are null when not provided
      expect(params[11]).toBeNull(); // position_in_filter
      expect(params[12]).toBeNull(); // total_in_filter
      expect(params[13]).toBeNull(); // position_in_session
      expect(params[14]).toBeNull(); // total_in_session
      expect(params[15]).toBeNull(); // component_tags
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

    it('should prefer completed sessions with reviews over empty ones for round=latest', async () => {
      mockTablesExist();
      // Mock sessions query — should return the completed session, not the empty one
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'session-369', round_number: 3, status: 'completed', reviewed_count: 45 }]
      });
      // Mock items query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, item_key: 'splash-zen-1', component: 'splash', category: 'zen', is_active: true }]
      });
      // Mock verdicts query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ item_key: 'splash-zen-1', verdict: 'keep', comment: 'Great', round_number: 3 }]
      });
      // Mock feedback_actions query
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/design-review/claude-context?round=latest')
        .expect(200);

      // Verify the session query uses priority ordering, not just created_at DESC
      const sessionQueryCall = mockPool.query.mock.calls[1]; // index 1 = session query (0 = table check)
      const sql = sessionQueryCall[0];
      expect(sql).toContain('CASE WHEN');
      expect(sql).toContain('reviewed_count');
      expect(sql).toContain('round_number DESC');

      expect(response.body.sessions[0].status).toBe('completed');
      expect(response.body.sessions[0].reviewed_count).toBe(45);
    });

    it('should return structured context for Claude agent with enriched evolution and feedback_actions', async () => {
      mockTablesExist();
      // Mock sessions query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, round_number: 1, status: 'completed' }]
      });
      // Mock items query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, item_key: 'splash-zen-1', component: 'splash', category: 'zen', is_active: true }]
      });
      // Mock verdicts query (with enriched fields)
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          item_key: 'splash-zen-1', verdict: 'keep', comment: 'Great', round_number: 1,
          created_at: '2026-02-20', tags: null,
          design_name: 'Zen Refined', component: 'splash', category: 'zen', generation: 1,
          component_tags: ['splash', 'zen'], position_in_filter: 3, total_in_filter: 15,
          position_in_session: 8, total_in_session: 40
        }]
      });
      // Mock feedback_actions query
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1, verdict_id: null, session_id: 1, item_key: 'splash-zen-1',
          action_type: 'css_change', action_description: 'Adjusted padding', file_path: '/splash/zen.css',
          commit_sha: null, created_at: '2026-02-21'
        }]
      });

      const response = await request(app)
        .get('/api/design-review/claude-context')
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('sessions');
      expect(response.body).toHaveProperty('verdicts');
      expect(response.body).toHaveProperty('evolution');
      expect(response.body).toHaveProperty('feedback_actions');
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary.total_items).toBe(1);

      // Verify evolution map includes enriched fields
      const evo = response.body.evolution['splash-zen-1'];
      expect(evo).toBeDefined();
      expect(evo).toHaveLength(1);
      expect(evo[0].design_name).toBe('Zen Refined');
      expect(evo[0].component).toBe('splash');
      expect(evo[0].category).toBe('zen');
      expect(evo[0].generation).toBe(1);
      expect(evo[0].component_tags).toEqual(['splash', 'zen']);
      expect(evo[0].position_in_filter).toBe(3);
      expect(evo[0].total_in_filter).toBe(15);
      expect(evo[0].position_in_session).toBe(8);
      expect(evo[0].total_in_session).toBe(40);

      // Verify feedback_actions are included
      expect(response.body.feedback_actions).toHaveLength(1);
      expect(response.body.feedback_actions[0].action_type).toBe('css_change');
    });
  });

  describe('Design Review Feedback Actions', () => {
    describe('POST /api/design-review/feedback-actions', () => {
      it('should return 503 when design tables do not exist', async () => {
        mockTablesNotExist();

        const response = await request(app)
          .post('/api/design-review/feedback-actions')
          .send({
            actions: [{ session_id: 1, action_type: 'css_change' }]
          })
          .expect(503);

        expect(response.body.error).toContain('Design tables not created yet');
      });

      it('should return 400 when actions is not an array', async () => {
        mockTablesExist();

        const response = await request(app)
          .post('/api/design-review/feedback-actions')
          .send({ actions: 'not-array' })
          .expect(400);

        expect(response.body.error).toBe('actions must be a non-empty array');
      });

      it('should return 400 when actions is an empty array', async () => {
        mockTablesExist();

        const response = await request(app)
          .post('/api/design-review/feedback-actions')
          .send({ actions: [] })
          .expect(400);

        expect(response.body.error).toBe('actions must be a non-empty array');
      });

      it('should return 400 for invalid action_type', async () => {
        mockTablesExist();

        const response = await request(app)
          .post('/api/design-review/feedback-actions')
          .send({
            actions: [{ session_id: 1, action_type: 'invalid_type' }]
          })
          .expect(400);

        expect(response.body.error).toContain('Invalid action_type');
      });

      it('should return 400 when session_id is missing', async () => {
        mockTablesExist();

        const response = await request(app)
          .post('/api/design-review/feedback-actions')
          .send({
            actions: [{ action_type: 'css_change' }]
          })
          .expect(400);

        expect(response.body.error).toContain('session_id is required');
      });

      it('should save feedback actions successfully', async () => {
        mockTablesExist();
        // Mock INSERT ... RETURNING id
        mockPool.query.mockResolvedValueOnce({
          rows: [{ id: 1 }, { id: 2 }]
        });

        const response = await request(app)
          .post('/api/design-review/feedback-actions')
          .send({
            actions: [
              {
                session_id: 1, item_key: 'splash-zen-1', action_type: 'css_change',
                action_description: 'Adjusted padding', file_path: '/splash/zen.css'
              },
              {
                session_id: 1, item_key: 'splash-ink-1', action_type: 'typography_change',
                action_description: 'Changed font size'
              }
            ]
          })
          .expect(200);

        expect(response.body.saved).toBe(2);

        // Verify the INSERT SQL has 7 columns per row
        const insertCall = mockPool.query.mock.calls[1]; // index 0=table check, 1=INSERT
        const sql = insertCall[0];
        expect(sql).toContain('design_feedback_actions');
        expect(sql).toContain('verdict_id');
        expect(sql).toContain('session_id');
        expect(sql).toContain('item_key');
        expect(sql).toContain('action_type');
        expect(sql).toContain('action_description');
        expect(sql).toContain('file_path');
        expect(sql).toContain('commit_sha');
        expect(sql).toContain('RETURNING id');

        // 2 rows x 7 cols = 14 params
        const params = insertCall[1];
        expect(params).toHaveLength(14);
      });
    });

    describe('GET /api/design-review/feedback-actions', () => {
      it('should return empty array when design tables do not exist', async () => {
        mockTablesNotExist();

        const response = await request(app)
          .get('/api/design-review/feedback-actions')
          .expect(200);

        expect(response.body).toEqual([]);
      });

      it('should return all feedback actions', async () => {
        mockTablesExist();
        mockPool.query.mockResolvedValueOnce({
          rows: [
            { id: 1, session_id: 1, item_key: 'splash-zen-1', action_type: 'css_change', created_at: '2026-02-21' },
            { id: 2, session_id: 1, item_key: 'splash-ink-1', action_type: 'typography_change', created_at: '2026-02-21' }
          ]
        });

        const response = await request(app)
          .get('/api/design-review/feedback-actions')
          .expect(200);

        expect(response.body).toHaveLength(2);
        expect(response.body[0].action_type).toBe('css_change');
      });

      it('should filter by session_id', async () => {
        mockTablesExist();
        mockPool.query.mockResolvedValueOnce({
          rows: [{ id: 1, session_id: 5, item_key: 'splash-zen-1', action_type: 'css_change' }]
        });

        const response = await request(app)
          .get('/api/design-review/feedback-actions?session_id=5')
          .expect(200);

        expect(response.body).toHaveLength(1);
        // Verify the query was called with session_id parameter
        const queryCall = mockPool.query.mock.calls[1]; // index 0=table check, 1=SELECT
        expect(queryCall[0]).toContain('session_id = $1');
        expect(queryCall[1]).toContain('5');
      });

      it('should filter by multiple criteria', async () => {
        mockTablesExist();
        mockPool.query.mockResolvedValueOnce({
          rows: [{ id: 1, session_id: 5, item_key: 'splash-zen-1', action_type: 'css_change' }]
        });

        const response = await request(app)
          .get('/api/design-review/feedback-actions?session_id=5&action_type=css_change')
          .expect(200);

        expect(response.body).toHaveLength(1);
        const queryCall = mockPool.query.mock.calls[1];
        expect(queryCall[0]).toContain('session_id = $1');
        expect(queryCall[0]).toContain('action_type = $2');
        expect(queryCall[1]).toEqual(['5', 'css_change']);
      });
    });
  });
});

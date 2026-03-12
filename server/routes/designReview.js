import { Router } from 'express';
import * as Sentry from '@sentry/node';

export default function designReviewRoutes(pool, requireApiKey, log) {
  const router = Router();

  // Helper: check if design_items table exists (graceful fallback if migration hasn't run)
  async function designTablesExist() {
    try {
      await pool.query("SELECT 1 FROM design_items LIMIT 0");
      return true;
    } catch {
      return false;
    }
  }

  // GET /ping — lightweight liveness check (SELECT 1, no table scan)
  router.get('/ping', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ ok: true });
    } catch (error) {
      Sentry.captureException(error);
      log.error('DesignReview', `Ping error: ${error.message}`);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });

  // GET /items — list all design items
  router.get('/items', async (req, res) => {
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
      Sentry.captureException(error);
      log.error('DesignReview', `Error fetching design items: ${error.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /items/sync — bulk upsert from CATALOG (idempotent, batched)
  router.post('/items/sync', requireApiKey, async (req, res) => {
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
      Sentry.captureException(error);
      log.error('DesignReview', `Error syncing design items: ${error.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /sessions — list review sessions (supports ?status=, ?reviewer=, ?from=, ?to=, ?commit_sha= filters)
  router.get('/sessions', async (req, res) => {
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
      Sentry.captureException(error);
      log.error('DesignReview', `Error fetching sessions: ${error.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /sessions/:id — fetch a single session by ID
  router.get('/sessions/:id', async (req, res) => {
    try {
      if (!(await designTablesExist())) return res.status(404).json({ error: 'Design tables not created yet' });
      const { id } = req.params;
      const result = await pool.query('SELECT * FROM design_review_sessions WHERE id = $1', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
      res.json(result.rows[0]);
    } catch (error) {
      Sentry.captureException(error);
      log.error('DesignReview', `Error fetching session: ${error.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /sessions — create new review session
  router.post('/sessions', requireApiKey, async (req, res) => {
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
      Sentry.captureException(error);
      log.error('DesignReview', `Error creating session: ${error.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /sessions/:id — complete session, add notes
  router.patch('/sessions/:id', requireApiKey, async (req, res) => {
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
      Sentry.captureException(error);
      log.error('DesignReview', `Error updating session: ${error.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /sessions/:id/verdicts — get verdicts for a session
  router.get('/sessions/:id/verdicts', async (req, res) => {
    try {
      if (!(await designTablesExist())) return res.json([]);
      const { id } = req.params;
      const result = await pool.query(
        'SELECT * FROM design_verdicts WHERE session_id = $1 ORDER BY created_at',
        [id]
      );
      res.json(result.rows);
    } catch (error) {
      Sentry.captureException(error);
      log.error('DesignReview', `Error fetching verdicts: ${error.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /sessions/:id/verdicts — bulk submit/update verdicts (batched)
  router.post('/sessions/:id/verdicts', requireApiKey, async (req, res) => {
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
      Sentry.captureException(error);
      log.error('DesignReview', `Error saving verdicts: ${error.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /summary — aggregated stats
  router.get('/summary', async (req, res) => {
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
      Sentry.captureException(error);
      log.error('DesignReview', `Error fetching summary: ${error.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /claude-context — structured JSON for Claude agent consumption
  router.get('/claude-context', async (req, res) => {
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
      Sentry.captureException(error);
      log.error('DesignReview', `Error building claude context: ${error.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Valid action types for feedback actions
  const VALID_ACTION_TYPES = new Set([
    'css_change', 'layout_change', 'animation_change', 'component_change',
    'typography_change', 'color_change', 'responsive_fix', 'accessibility_fix',
    'new_variant', 'removal', 'no_action', 'deferred'
  ]);

  // POST /feedback-actions — bulk save feedback actions
  router.post('/feedback-actions', requireApiKey, async (req, res) => {
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
      Sentry.captureException(error);
      log.error('DesignReview', `Error saving feedback actions: ${error.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /feedback-actions — query feedback actions with filters
  router.get('/feedback-actions', async (req, res) => {
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
      Sentry.captureException(error);
      log.error('DesignReview', `Error fetching feedback actions: ${error.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /feedback-actions/:id — update a feedback action (e.g., mark as applied)
  router.patch('/feedback-actions/:id', requireApiKey, async (req, res) => {
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
      Sentry.captureException(error);
      log.error('DesignReview', `Error updating feedback action: ${error.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

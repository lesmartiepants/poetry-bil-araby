-- Design Review System Tables
-- Created as part of feat(design-review): consolidate all designs into unified review system

-- Design items catalog
CREATE TABLE IF NOT EXISTS design_items (
  id SERIAL PRIMARY KEY,
  item_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  component TEXT NOT NULL,
  category TEXT NOT NULL,
  file_path TEXT,
  description TEXT,
  generation INTEGER DEFAULT 1,
  iteration TEXT,
  source_branch TEXT,
  source_pr TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Review sessions (one per review round)
CREATE TABLE IF NOT EXISTS design_review_sessions (
  id SERIAL PRIMARY KEY,
  reviewer TEXT DEFAULT 'owner',
  branch TEXT,
  commit_sha TEXT,
  round_number INTEGER NOT NULL,
  total_designs INTEGER DEFAULT 0,
  reviewed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Individual design verdicts per session
CREATE TABLE IF NOT EXISTS design_verdicts (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES design_review_sessions(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES design_items(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('keep', 'discard', 'skip', 'revisit')),
  comment TEXT,
  priority INTEGER DEFAULT 0,
  tags TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, item_id)
);

-- Verdict history for audit trail
CREATE TABLE IF NOT EXISTS design_review_history (
  id SERIAL PRIMARY KEY,
  item_key TEXT NOT NULL,
  session_id INTEGER NOT NULL REFERENCES design_review_sessions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  commit_sha TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_design_items_component ON design_items(component);
CREATE INDEX IF NOT EXISTS idx_design_items_category ON design_items(category);
CREATE INDEX IF NOT EXISTS idx_design_items_active ON design_items(is_active);
CREATE INDEX IF NOT EXISTS idx_design_verdicts_session ON design_verdicts(session_id);
CREATE INDEX IF NOT EXISTS idx_design_verdicts_item ON design_verdicts(item_id);
CREATE INDEX IF NOT EXISTS idx_design_history_item_key ON design_review_history(item_key);
CREATE INDEX IF NOT EXISTS idx_design_history_session ON design_review_history(session_id);

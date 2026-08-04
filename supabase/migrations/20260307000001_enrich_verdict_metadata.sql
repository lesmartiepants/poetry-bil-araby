-- Enrich Verdict Metadata
-- Migration: 20260307_enrich_verdict_metadata
-- Adds contextual metadata columns to design_verdicts and creates design_feedback_actions table

-- ============================================
-- 1. New columns on design_verdicts
-- ============================================
ALTER TABLE design_verdicts ADD COLUMN IF NOT EXISTS design_name TEXT;
ALTER TABLE design_verdicts ADD COLUMN IF NOT EXISTS component TEXT;
ALTER TABLE design_verdicts ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE design_verdicts ADD COLUMN IF NOT EXISTS generation INTEGER;
ALTER TABLE design_verdicts ADD COLUMN IF NOT EXISTS position_in_filter INTEGER;
ALTER TABLE design_verdicts ADD COLUMN IF NOT EXISTS total_in_filter INTEGER;
ALTER TABLE design_verdicts ADD COLUMN IF NOT EXISTS position_in_session INTEGER;
ALTER TABLE design_verdicts ADD COLUMN IF NOT EXISTS total_in_session INTEGER;
ALTER TABLE design_verdicts ADD COLUMN IF NOT EXISTS component_tags TEXT[];

-- Indexes on new columns
CREATE INDEX IF NOT EXISTS idx_design_verdicts_component ON design_verdicts(component);
CREATE INDEX IF NOT EXISTS idx_design_verdicts_category ON design_verdicts(category);
CREATE INDEX IF NOT EXISTS idx_design_verdicts_component_tags ON design_verdicts USING GIN (component_tags);

-- ============================================
-- 2. New table: design_feedback_actions
-- ============================================
CREATE TABLE IF NOT EXISTS design_feedback_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  verdict_id UUID REFERENCES design_verdicts(id) ON DELETE SET NULL,
  session_id UUID NOT NULL REFERENCES design_review_sessions(id) ON DELETE CASCADE,
  item_key TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'css_change', 'layout_change', 'animation_change', 'component_change',
    'typography_change', 'color_change', 'responsive_fix', 'accessibility_fix',
    'new_variant', 'removal', 'no_action', 'deferred'
  )),
  action_description TEXT,
  file_path TEXT,
  commit_sha TEXT,
  applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes on design_feedback_actions
CREATE INDEX IF NOT EXISTS idx_feedback_actions_verdict ON design_feedback_actions(verdict_id);
CREATE INDEX IF NOT EXISTS idx_feedback_actions_session ON design_feedback_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_actions_item_key ON design_feedback_actions(item_key);

-- Enable RLS (no public policies)
ALTER TABLE design_feedback_actions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. Backfill existing verdicts from design_items
-- ============================================
UPDATE design_verdicts v
SET
  design_name = di.name,
  component = di.component,
  category = di.category,
  generation = di.generation
FROM design_items di
WHERE v.item_id = di.id
  AND v.design_name IS NULL;

-- Design Review System Tables
-- Migration: 20260220_create_design_review_tables
-- Creates 3 tables for the design review workflow

-- Registry of all tracked design mockups
CREATE TABLE IF NOT EXISTS design_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  component TEXT NOT NULL,
  category TEXT NOT NULL,
  file_path TEXT NOT NULL,
  description TEXT,
  generation INTEGER DEFAULT 1,
  iteration INTEGER,
  source_branch TEXT,
  source_pr TEXT,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Review sessions (one per review round)
CREATE TABLE IF NOT EXISTS design_review_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer TEXT NOT NULL DEFAULT 'owner',
  branch TEXT,
  commit_sha TEXT,
  round_number INTEGER NOT NULL DEFAULT 1,
  total_designs INTEGER DEFAULT 0,
  reviewed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Verdicts per item per session
CREATE TABLE IF NOT EXISTS design_verdicts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES design_review_sessions(id) ON DELETE CASCADE,
  item_id UUID REFERENCES design_items(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('keep', 'discard', 'skip', 'revisit')),
  comment TEXT,
  priority INTEGER DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, item_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_design_items_component ON design_items(component);
CREATE INDEX IF NOT EXISTS idx_design_items_active ON design_items(is_active);
CREATE INDEX IF NOT EXISTS idx_design_verdicts_session ON design_verdicts(session_id);
CREATE INDEX IF NOT EXISTS idx_design_verdicts_item ON design_verdicts(item_id);
CREATE INDEX IF NOT EXISTS idx_design_verdicts_item_key ON design_verdicts(item_key);

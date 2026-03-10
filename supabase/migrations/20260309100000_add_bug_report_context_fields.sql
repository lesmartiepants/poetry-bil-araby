-- Add debugging context fields to bug_reports for richer issue reports
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS screen_size TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS online BOOLEAN;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS feature_flags JSONB;

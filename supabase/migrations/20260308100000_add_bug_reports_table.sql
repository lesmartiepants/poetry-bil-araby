-- Bug reports table for user-submitted feedback from the debug console
CREATE TABLE IF NOT EXISTS bug_reports (
  id SERIAL PRIMARY KEY,
  description TEXT,
  logs JSONB DEFAULT '[]',
  timestamp TIMESTAMPTZ NOT NULL,
  user_agent TEXT,
  poem_id INTEGER,
  poem_poet TEXT,
  poem_title TEXT,
  app_mode TEXT,           -- 'database' or 'ai'
  app_theme TEXT,          -- 'dark' or 'light'
  app_font TEXT,
  github_issue_number INTEGER,  -- linked GitHub issue (null if creation failed/skipped)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying recent reports
CREATE INDEX idx_bug_reports_created_at ON bug_reports (created_at DESC);

-- Grant access via PostgREST (matches existing pattern)
GRANT SELECT, INSERT ON bug_reports TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE bug_reports_id_seq TO anon, authenticated;

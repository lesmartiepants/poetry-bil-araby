-- poem_events: unified event log for all poem interactions
CREATE TABLE IF NOT EXISTS poem_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  poem_id INTEGER NOT NULL,
  event_type VARCHAR(20) NOT NULL CHECK (
    event_type IN ('downvote', 'save', 'serve', 'share', 'copy', 'view')
  ),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint only for toggle events (downvote, save)
CREATE UNIQUE INDEX idx_poem_events_unique_toggle
  ON poem_events (user_id, poem_id, event_type)
  WHERE event_type IN ('downvote', 'save');

CREATE INDEX idx_poem_events_poem_id ON poem_events(poem_id);
CREATE INDEX idx_poem_events_user_id ON poem_events(user_id);
CREATE INDEX idx_poem_events_type ON poem_events(event_type);
CREATE INDEX idx_poem_events_poem_type ON poem_events(poem_id, event_type);

ALTER TABLE poem_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
  ON poem_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events"
  ON poem_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own events"
  ON poem_events FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON poem_events TO authenticated;

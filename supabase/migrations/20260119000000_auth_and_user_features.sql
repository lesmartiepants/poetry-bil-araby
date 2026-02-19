-- User settings table
-- Stores user preferences like theme, font, voice settings, etc.
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme VARCHAR(10) DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  font_id VARCHAR(50) DEFAULT 'Amiri',
  voice_preference VARCHAR(50),
  transliteration_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Saved poems table (user favorites/hearts)
-- Stores poems that users have saved to their collection
CREATE TABLE IF NOT EXISTS saved_poems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  poem_id INTEGER,  -- References poems table (if using database mode)
  poem_text TEXT,   -- Store full poem text for AI-generated poems
  poet VARCHAR(255),
  title VARCHAR(255),
  english TEXT,
  category VARCHAR(100),
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, poem_id, poem_text)  -- Prevent duplicate saves
);

-- Discussions table (future feature)
-- Stores user discussions about specific poems
CREATE TABLE IF NOT EXISTS discussions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  poem_id INTEGER,
  poem_text TEXT,
  comment TEXT NOT NULL,
  parent_id UUID REFERENCES discussions(id) ON DELETE CASCADE,  -- For threaded discussions
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discussion likes table (future feature)
CREATE TABLE IF NOT EXISTS discussion_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, discussion_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_saved_poems_user_id ON saved_poems(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_poems_poem_id ON saved_poems(poem_id);
CREATE INDEX IF NOT EXISTS idx_saved_poems_saved_at ON saved_poems(saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_user_id ON discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_discussions_poem_id ON discussions(poem_id);
CREATE INDEX IF NOT EXISTS idx_discussions_created_at ON discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussion_likes_discussion_id ON discussion_likes(discussion_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_poems ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
-- Users can only read and modify their own settings
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for saved_poems
-- Users can only manage their own saved poems
CREATE POLICY "Users can view own saved poems" ON saved_poems
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save poems" ON saved_poems
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved poems" ON saved_poems
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for discussions
-- Users can view all discussions but only modify their own
CREATE POLICY "Anyone can view discussions" ON discussions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create discussions" ON discussions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own discussions" ON discussions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own discussions" ON discussions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for discussion_likes
CREATE POLICY "Anyone can view discussion likes" ON discussion_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like discussions" ON discussion_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" ON discussion_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discussions_updated_at
  BEFORE UPDATE ON discussions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

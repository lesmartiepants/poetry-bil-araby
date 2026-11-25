-- V7 recitation: one generated audio file per poem and voice, made once by the server (Gemini TTS).
-- Additive and idempotent. No policies and no grants: only the server (owner role) reads it, never the Data API.
CREATE TABLE IF NOT EXISTS public.poem_audio (
  poem_id integer NOT NULL REFERENCES public.poems(id) ON DELETE CASCADE,
  voice text NOT NULL,
  audio bytea NOT NULL,            -- a 24 kHz mono WAV
  line_starts jsonb NOT NULL,      -- seconds at which each verse line begins
  duration numeric NOT NULL,       -- seconds
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poem_id, voice)
);
ALTER TABLE public.poem_audio ENABLE ROW LEVEL SECURITY;

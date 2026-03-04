-- Migration: Rename verdicts from keep/discard/revisit to love/like/skip
-- Date: 2026-03-03

-- Migrate existing verdict values
UPDATE design_verdicts SET verdict = 'love' WHERE verdict = 'keep';
UPDATE design_verdicts SET verdict = 'like' WHERE verdict = 'discard';
UPDATE design_verdicts SET verdict = 'skip' WHERE verdict = 'revisit';

-- Replace CHECK constraint
ALTER TABLE design_verdicts DROP CONSTRAINT IF EXISTS design_verdicts_verdict_check;
ALTER TABLE design_verdicts ADD CONSTRAINT design_verdicts_verdict_check
  CHECK (verdict IN ('love', 'like', 'skip'));

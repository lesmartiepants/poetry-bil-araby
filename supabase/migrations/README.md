# Database Migrations

This directory contains database migration files.

## Migrations
- `20260114000000_import_poetry.sql` (118MB) - Initial poetry database import (not in repo due to size)
- `20260222000000_design_review_tables.sql` - Design review system tables (4 tables + indexes)
- `20260722000000_add_poem_categorization.sql` - Reader-facing categorization layer: `category_dimensions`/`category_values`/`poem_categories` (multi-label mood/topic/motif vocab + join) and scalar facet columns on `poems`. Seeded from `poetry_quality_and_curation/categorization/config.py`; populated by that module's Claude classifier.

## Setup Instructions
1. Obtain the poetry import migration file from the project maintainer
2. Place it in this directory
3. Run `supabase db reset` to apply all migrations locally

## Design Review Tables
The `20260222000000_design_review_tables.sql` migration creates:
- `design_items` — Catalog of design mockups
- `design_review_sessions` — Review rounds
- `design_verdicts` — Individual verdicts per design per session
- `design_review_history` — Audit trail of verdict changes

## Alternative Approach
For production, consider using Supabase's native import tools:
- Use `supabase db push` for schema-only migrations
- Import data via Supabase Dashboard or API for large datasets


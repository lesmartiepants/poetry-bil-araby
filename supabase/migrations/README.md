# Large SQL Migration Files

This directory contains database migration files that may exceed GitHub's file size limits.

## Current Migration
- `20260114000000_import_poetry.sql` (118MB) - Initial poetry database import

## Setup Instructions
1. Obtain the migration file from the project maintainer
2. Place it in this directory
3. Run `supabase db reset` to apply migrations locally

## Alternative Approach
For production, consider using Supabase's native import tools:
- Use `supabase db push` for schema-only migrations
- Import data via Supabase Dashboard or API for large datasets


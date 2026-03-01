# Design Review - Poetry Bil-Araby

Consolidated design explorations for the Poetry Bil-Araby app, bringing together work from multiple PRs into a single review space.

## Accessing the Review UI

### Vercel Preview (Recommended)
Every PR automatically deploys a Vercel preview. Append `/design-review/` to the preview URL:

```
https://<your-app-name>-<pr-slug>.vercel.app/design-review/
```

### Local Development
```bash
npm run dev:all   # starts both frontend (5173) and API server (3001)
# then open: http://localhost:5173/design-review/
```

## What Works Without a DB Migration

The review UI works **immediately** after deploy with no database setup required:

- Browse all ~90 mockups across 5 component categories
- Preview designs in the iframe panel
- Record verdicts (Keep / Discard / Revisit / Skip)
- **Verdicts persist in `localStorage`** — they survive page refreshes

The sync indicator will show **offline** if the Render API is unreachable; this is expected without the migration and does not break the UI.

## Enabling Full API Persistence (Optional)

API-backed session history requires the database migration to be applied once against your Supabase project:

```bash
# Option A: psql
psql $DATABASE_URL -f supabase/migrations/20260222000000_design_review_tables.sql

# Option B: Supabase Dashboard
# Open the SQL editor and paste the contents of the migration file above
```

After the migration the Render API (`https://poetry-bil-araby-api.onrender.com`) picks up the new tables automatically. The review UI will then show **"✓ Saved to database"** after each verdict and support cross-session history.

### API Endpoints (all under `/api/design-review/`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/items` | GET | List all design items |
| `/items/sync` | POST | Bulk upsert from CATALOG (idempotent) |
| `/sessions` | GET | List review sessions |
| `/sessions` | POST | Create new session |
| `/sessions/:id` | PATCH | Complete session / add notes |
| `/sessions/:id/verdicts` | GET | Verdicts for a session |
| `/sessions/:id/verdicts` | POST | Submit / update verdicts |
| `/items/:key/history` | GET | Full verdict history for one design |
| `/summary` | GET | Aggregated stats |
| `/claude-context` | GET | Structured JSON for the design-review-agent |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | Previous / Next design |
| `K` | Keep |
| `D` | Discard |
| `R` | Revisit |
| `S` | Skip |
| `I` | Toggle info panel |
| `F` | Fullscreen preview |

## What's Here

### Splash Screens (from PR #11)
5 design themes with 11 total options:
- **Particle Field** (3 options) - Interactive particles with fluid motion
- **Zen Minimalism** (2 options) - Pure simplicity and calligraphic elegance
- **Ink Calligraphy** (1 option) - Traditional ink brush letterforms
- **Ancient Manuscript** (3 options) - Aged parchment with classical ornaments
- **Light & Shadow** (2 options) - Dramatic interplay of light and depth

### Main App Desktop Views (from PR #51)
7 distinct design directions:
- **Celestial Lens** (L) - Cosmic orbits, lens-style focus
- **Calligraphic Minimal** (M) - Parchment and ink strokes
- **Bento Atlas** (N) - Modular bento grid layout
- **Desert Horizon** (O) - Warm gradients and airy cards
- **Ink Mono** (P) - Monochrome editorial style
- **Mosaic Tiles** (T) - Geometric tile navigation
- **Scroll Story** (U) - Chapter timeline with sticky nav

### Vertical Controls (from PR #50)
5 control bar styles:
- **Minimalist** (1) - Jony Ive / Apple aesthetic
- **Notion/Linear** (3) - Clean functional compact bar
- **Brutalist Terminal** (4) - Retro CRT sidebar
- **Neumorphic** (6) - Soft UI with tactile states
- **Scandinavian** (9) - Nordic minimal circles

## Purpose

This consolidation enables:
1. **Side-by-side comparison** across all design explorations
2. **Pick and choose** the best designs and features from each
3. **E2E flow design** - combining splash + walkthrough + main app
4. **Mobile view creation** for desktop-first designs
5. **Feature integration** - controls into main app layouts

## Documentation

- `DESIGN_CATALOG.md` - Complete catalog with all options, feedback, and next steps
- `feedback/` - Round 1 feedback data and review artifacts
- `walkthrough/README.md` - Planned walkthrough design specs

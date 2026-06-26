<p align="center">
  <img src="./.github/assets/header-banner.png" alt="Poetry Bil-Araby — بالعربي" width="100%" />
</p>

<p align="center">
  <strong>Classical Arabic poetry, made discoverable, accessible, and pleasurable to read.</strong>
</p>

<p align="center">
  <a href="https://poetry-bil-araby.vercel.app"><img src="https://img.shields.io/badge/Live_Demo-poetry--bil--araby.vercel.app-c5a059?style=flat-square&labelColor=0c0c0e" alt="Live Demo" /></a>
  <a href="https://github.com/lesmartiepants/poetry-bil-araby/actions/workflows/ci.yml"><img src="https://github.com/lesmartiepants/poetry-bil-araby/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/React-18-2e5090?style=flat-square&labelColor=0c0c0e" alt="React 18" />
  <img src="https://img.shields.io/badge/Vite-6-2e5090?style=flat-square&labelColor=0c0c0e" alt="Vite 6" />
  <img src="https://img.shields.io/badge/PWA-installable-2e5090?style=flat-square&labelColor=0c0c0e" alt="PWA" />
  <img src="https://img.shields.io/badge/tested_with-Vitest_%2B_Playwright-4a7cc9?style=flat-square&labelColor=0c0c0e" alt="Tested with Vitest and Playwright" />
</p>

---

## Philosophy

Arabic poetry is one of the deepest literary traditions in the world, and one of the
hardest to approach. The text is often printed without diacritics, the meter is invisible
to a new reader, and translations tend to flatten living verse into footnotes. Poetry
Bil-Araby exists to remove those barriers without diminishing the work.

Three principles guide every feature:

- **Discoverable.** A vast, curated library and a single tap surface poems you would never
  have found on your own — by poet, by theme, or at random.
- **Accessible.** Full diacritics for correct pronunciation and meter, faithful bilingual
  translation, Latin transliteration, and spoken recitation meet readers wherever they are.
  Translations follow a strict rule borrowed from the app's own prompt: *every word choice
  must sound like it belongs in a living poem* — no archaic English, no invented imagery.
- **Pleasurable.** A lapis-and-gold visual language drawn from Islamic illumination, generative
  geometric backgrounds, kinetic onboarding, and fluid motion make reading feel like an
  occasion rather than a lookup.

## The Library

The poem corpus holds **84,000+ classical Arabic poems** sourced from the open
[Qafiyah](https://github.com/WTFoss/qafiyah) dataset and stored in PostgreSQL. To protect
the reading experience, the API only serves poems above a quality threshold
(`quality_score >= 75`, see `server.js`), so what reaches the reader is a curated slice of
the full archive rather than raw bulk text.

Each poem carries its Arabic title, the poet's name (Arabic and English), theme, and the
verse body. Readers can pull a random poem, filter by poet, or browse a prefetched carousel
of more work by the same author.

## Harakat — Diacritization

Tashkeel (the short-vowel marks, *harakat*) is the single most important accessibility layer
in the app. A misplaced mark changes a word's meaning and breaks the poem's meter, so
diacritization is treated as a first-class data pipeline rather than an afterthought.

Raw text such as `بذات المكارم ذاك الألم` becomes `بِذَاتِ الْمَكَارِمِ ذَاكَ الْأَلَمِ`.

The pipeline (`scripts/tashkeel-pipeline.py`) runs in stages:

1. **Export** poems from the database to local Parquet.
2. **Diacritize** with [Mishkal](https://github.com/linuxscout/mishkal), a rule-based engine.
3. **Post-process** with eight correction rules learned from manual Arabic review — fixing
   systematic engine errors such as incorrect line-ending vowels, over-diacritized
   punctuation, and broken hamza patterns.
4. **Audit** coverage, mark density, and regression against known-good samples.
5. **Report** with an HTML before/after view for human verification.
6. **Upload** back to the database with byte-exact verification.

The API serves `COALESCE(diacritized_content, content)`, so any poem can safely fall back to
raw text if its diacritized version is ever rolled back.

```bash
pip install -r scripts/requirements-diacritize.txt

# Full pipeline: export, diacritize, post-process, audit, report, verified upload
python scripts/tashkeel-pipeline.py run-all --force --verify --open

# Or run a single stage
python scripts/tashkeel-pipeline.py diacritize
python scripts/tashkeel-pipeline.py audit

# Incremental: only process newly added poems
python scripts/tashkeel-pipeline.py run-all --only-missing --verify
```

## Islamic Art and Geometry

The interface is built on a deliberate contemporary-meets-classical visual language. The
palette is lapis lazuli and gold — `#1e3a6e`, `#2e5090`, `#4a7cc9` against a near-black
canvas, with a warm gold foil (`#c5a059`) reserved for titles and the wordmark, echoing the
illuminated manuscripts the poems come from.

The animated backgrounds are not stock textures: `SquoctogonBackground.jsx` generates true
Islamic geometric tessellations — eightfold girih stars and octagon-and-square grids — as
live SVG, the same construction reused in this README's header banner. A kinetic splash
sequence introduces the wordmark before the first poem appears, and motion throughout is
handled with Framer Motion for a calm, considered feel.

## Features

**Reading**
- Full diacritics (harakat) for accurate pronunciation and meter
- Faithful English translation (cached, or generated on demand)
- Latin transliteration toggle
- AI audio recitation with word-by-word highlighting synced to the voice
- Eight Arabic typefaces (Amiri, Alexandria, El Messiri, Lalezar, Rakkas, Fustat, Kufam, Katibeh)
- Dark and light themes
- AI literary insight that reads a poem as a story, not an academic gloss

**Discovery**
- A single tap surfaces a new poem from the curated library
- Poet filtering and a prefetched carousel of related work by the same author
- Deep-linkable poems and shareable cards with Open Graph previews

**Personalization**
- Optional Google and Apple sign-in (Supabase)
- Save poems to a personal library with pinning, sorting, and in-library search
- Persistent settings (theme, font) that follow you across sessions
- Flag low-quality poems to improve the corpus
- Keyboard shortcuts everywhere — press `?` for the full list

**Platform**
- Installable PWA with offline support
- IndexedDB caching and smart prefetching for instant navigation
- Error tracking (Sentry) and product analytics (Vercel)

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / pause recitation |
| `→` | Next poem |
| `E` | Seek insight (AI analysis) |
| `T` | Toggle English translation |
| `R` | Toggle transliteration |
| `?` | Show all shortcuts |
| `Esc` | Close overlay |

## Tech Stack

**Frontend** — React 18, Vite 6, Tailwind CSS 3, Zustand (state), wouter (routing),
Framer Motion (animation), Tone.js (audio), Radix UI and Vaul (accessible primitives),
Embla (carousel), Sonner (toasts), Lucide (icons).

**Backend** — Express 5 with Helmet, CORS, rate limiting, and input validation; PostgreSQL
via `pg`.

**Data and services** — Supabase (auth, user data, Postgres hosting), Google Gemini (text
insight and TTS recitation), Mishkal (diacritization). Quality is enforced with Vitest
(unit) and Playwright (end-to-end), wired into GitHub Actions CI.

## Architecture

The app is a single-page React app backed by a small poem-serving API:

- A lightweight Express API (`server.js`) serves the poem library from PostgreSQL,
  exposing random, by-poet, poets, and translation-cache endpoints.
- The frontend reads from that API. UI and domain state live in Zustand stores
  (`src/stores/`), side-effectful flows (fetch, play, analyze) are isolated as store
  actions, and cross-cutting concerns (auth, audio highlighting, shortcuts, query params)
  are React hooks (`src/hooks/`).
- Google Gemini powers on-demand literary insight, English translation, and audio
  recitation, using the system prompts in `src/prompts.js`. Translations and insights are
  cached back to the database so repeat reads are instant.

## Getting Started

### Prerequisites

- Node.js 18 or newer
- PostgreSQL 15+ for the poem library (17 recommended for the auth features)
- For insight, translation, and recitation: a Gemini API key ([Google AI Studio](https://aistudio.google.com/app/apikey))
- For authentication (optional): a Supabase project

### Install

```bash
npm install
```

### Configure

Create a `.env` file in the project root with the variables your setup needs:

```bash
# Frontend — backend (poem library) API
VITE_API_URL=http://localhost:3001

# Frontend — insight, translation, and recitation
VITE_GEMINI_API_KEY=your-gemini-api-key

# Frontend — optional, enables auth and saved poems
VITE_SUPABASE_URL=https://your-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-jwt-anon-key   # must start with "eyJ"

# Backend (server.js) — poem library database
DATABASE_URL=postgresql://user:pass@host:6543/postgres   # Supabase pooler host
```

For a local database instead of Supabase, install PostgreSQL 15+ and run `createdb qafiyah`;
the backend defaults to `localhost:5432/qafiyah` when `DATABASE_URL` is unset.

### Run

```bash
npm run dev:all      # frontend + backend together (recommended)
npm run dev          # frontend only on http://localhost:5173
npm run dev:server   # backend API only on http://localhost:3001
```

## Configuration

| Variable | Scope | Purpose |
|---|---|---|
| `VITE_GEMINI_API_KEY` | Frontend | Gemini key for insight, translation, and recitation |
| `VITE_API_URL` | Frontend | Backend API base URL |
| `VITE_SUPABASE_URL` | Frontend | Supabase project URL (optional) |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase anon key, JWT format (optional) |
| `DATABASE_URL` | Backend | PostgreSQL connection (Supabase pooler in production) |
| `PORT` | Backend | API port (default 3001) |
| `API_SECRET_KEY` | Backend | Protects write endpoints via `X-API-Key` (optional) |

Never commit secrets. The `DATABASE_URL` must use the Supabase **connection pooler** host
(`aws-N-region.pooler.supabase.com:6543`), not the direct host. Supabase anon keys must be in
JWT format (they start with `eyJ`).

## Testing

```bash
npm run test:run        # unit tests (Vitest)
npm run test:coverage   # unit tests with coverage
npm run test:e2e        # end-to-end tests (Playwright)
npm run test:e2e:full   # full device matrix (local)
```

Unit tests cover components, utilities, and database integration with Vitest and React
Testing Library. End-to-end suites in `e2e/` exercise core flows, audio and TTS highlighting,
the carousel, translation caching, PWA behavior, and UI/UX quality. The GitHub Actions
pipeline builds, runs unit tests, then runs the E2E suite against a PostgreSQL service.

## Deployment

| Variable | Vercel | Render | GitHub Actions |
|---|---|---|---|
| `VITE_GEMINI_API_KEY` | Yes | — | — |
| `VITE_API_URL` | Yes | — | Yes |
| `VITE_SUPABASE_URL` | Yes | — | — |
| `VITE_SUPABASE_ANON_KEY` | Yes | — | — |
| `DATABASE_URL` | — | Yes | Yes |

**Frontend (Vercel)** — framework preset Vite, build `npm run build`, output `dist`.
Auto-deploys on push to `main` with preview URLs for pull requests.

**Backend (Render)** — runtime Node, build `npm install`, start `node server.js`. The
`DATABASE_URL` must point at the Supabase pooler host; the direct host is not reachable from
external services.

## Project Structure

```
poetry-bil-araby/
├── src/
│   ├── app.jsx              # Main application shell
│   ├── components/          # UI: splash, poem card, carousel, auth, backgrounds
│   ├── stores/              # Zustand state and side-effect actions
│   ├── hooks/               # Auth, TTS highlighting, shortcuts, query params
│   ├── services/            # Gemini, database client, cache, prefetch
│   ├── constants/           # Design tokens, theme, fonts, patterns
│   ├── utils/               # Transliteration, OG tags, audio helpers
│   └── prompts.js           # AI system prompts
├── server.js                # Express API serving the poem library
├── scripts/                 # Diacritization pipeline (Python) and tooling
├── supabase/migrations/     # Auth and user-feature schema
├── e2e/                     # Playwright end-to-end suites
└── .github/                 # CI workflows and README assets
```

## Roadmap

Planned and in-progress work, in rough priority order:

- Full-text search across the entire library
- Curated collections and reading playlists
- An expanded poet and theme catalog
- Pagination for browsing large result sets
- Native social-platform sharing

## Acknowledgements

- **[Qafiyah](https://github.com/WTFoss/qafiyah)** — the open Arabic poetry dataset behind the library.
- **[Mishkal](https://github.com/linuxscout/mishkal)** — the rule-based diacritization engine.
- The type designers behind Reem Kufi, Forum, Amiri, and the other open fonts that give the
  app its voice.

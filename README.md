# Poetry Bil-Araby | بالعربي

Poetry Bil-Araby is a React application for exploring Arabic poetry. It provides two modes of operation: a database-backed mode that draws on a corpus of 84,329 restored Arabic poems stored in PostgreSQL, and an AI mode that generates poetry insights using the Gemini API. The application is intended for readers, students, and enthusiasts of Arabic literature who want an accessible, well-designed interface for discovering and appreciating Arabic poetry.

## Features

- Browse classic and modern Arabic poetry (84,329 poems in database mode)
- Toggle between Database mode (PostgreSQL) and AI mode (Gemini API)
- User authentication with Google and Apple SSO via Supabase (optional)
- Save favorite poems to a personal collection
- Persistent user settings (theme, font preferences)
- AI-powered audio recitation with emotional context (AI mode)
- Deep analysis and interpretation using Gemini AI (AI mode)
- Dark and light mode toggle
- Arabic-first typography using Amiri and Tajawal fonts
- Filter poems by poet and category
- Copy poem text to clipboard
- Comprehensive test coverage: 136 unit tests and 193 E2E test executions
- Optimized CI/CD pipeline running in approximately 3 minutes
- Robust error handling with user-facing error messages

## Setup

### Prerequisites

- Node.js v18 or higher
- For AI mode: a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- For database mode: PostgreSQL 15 or higher (PostgreSQL 17 is required if using Supabase auth migrations)
- For authentication (optional): a Supabase account and project at [supabase.com](https://supabase.com)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables by creating a `.env.local` file in the project root.

   **AI mode (Gemini API):**
   ```bash
   VITE_GEMINI_API_KEY=your-api-key-here
   ```

   **Database mode (PostgreSQL backend):**
   ```bash
   # Backend (server.js) — all values shown are the defaults
   PGUSER=your_username
   PGHOST=localhost
   PGDATABASE=qafiyah
   PGPASSWORD=your_password
   PGPORT=5432
   PORT=3001
   LOG_ENABLED=true
   LOG_DEBUG=false

   # Frontend
   VITE_API_URL=http://localhost:3001
   ```

   Create the local database before starting:
   ```bash
   createdb qafiyah
   ```

   Then restore the poem data (contact the project maintainer for the dump file):
   ```bash
   pg_restore -d qafiyah poetry-database/qafiyah_public_20250610_1424.dump
   ```

   See [poetry-database/README.md](poetry-database/README.md) for more details.

   **Authentication (optional — Supabase):**
   ```bash
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   After adding these variables, apply the database migrations:
   ```bash
   npm install -g supabase
   supabase link --project-ref your-project-ref
   supabase db push
   ```

   Configure OAuth providers in the Supabase Dashboard under Authentication → Providers (Google and/or Apple).

   See [supabase/migrations/README.md](supabase/migrations/README.md) for migration details.

3. Start the development server:

   **Frontend only (AI mode):**
   ```bash
   npm run dev
   ```

   **Frontend and backend together (database mode):**
   ```bash
   npm run dev:all
   ```

   Or in separate terminals:
   ```bash
   # Terminal 1
   npm run dev:server

   # Terminal 2
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`.

### GitHub Secrets (CI/CD)

The following secrets must be configured in the repository's GitHub Actions settings (Settings → Secrets and variables → Actions) for the CI pipeline and deployments to work:

| Secret | Description |
|--------|-------------|
| `VITE_GEMINI_API_KEY` | Gemini API key for AI mode |
| `VITE_API_URL` | Backend API URL (e.g., your Render service URL) |
| `VITE_SUPABASE_URL` | Supabase project URL (optional, for auth) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key in JWT format (optional, for auth) |

Never commit API keys or credentials to the repository. Use `.env.local` for local development (it is gitignored).

## Usage

### Mode Switching

- **Database mode** (Library icon): Fetches poems from the local PostgreSQL database (84,329 poems available)
- **AI mode** (Sparkles icon): Generates poems and insights using the Gemini API
- Switch modes using the control bar button or the overflow menu on mobile

### Core Features

- **Discover**: Click the discover button to fetch a new poem
- **Navigate**: Use arrow buttons to browse through poems
- **Play**: Click the play button to hear AI-generated recitation (AI mode only)
- **Analyze**: Click "Seek Insight" to get a deep analysis (AI mode only)
- **Copy**: Click the copy icon to save poem text to the clipboard
- **Filter**: Select specific poets from the category dropdown
- **Theme**: Toggle between dark and light modes

### Authentication Features (Optional)

When Supabase is configured, the app provides:

- Sign in with Google or Apple
- Save poems to your personal collection using the heart button
- View saved poems from the account menu
- Customize theme and font preferences with live preview
- Persistent settings across sessions

Authentication features only appear when Supabase environment variables are configured. The app is fully functional without authentication.

### Database Mode Benefits

- Access to 84,329 restored Arabic poems
- Instant response (no external API latency)
- Works offline after initial database setup
- Filter by poet (50+ poets available)
- Proper Arabic line break formatting preserved from source texts

## Testing

```bash
# Unit tests
npm test                  # Watch mode
npm run test:run          # Single run (CI)
npm run test:coverage     # Coverage report

# E2E tests
npm run test:e2e          # All E2E tests (CI: Chrome only)
npm run test:e2e:ui       # UI/UX tests only
npm run test:e2e:headed   # Visible browser
npm run test:e2e:debug    # Debug mode (Playwright Inspector)
npm run test:e2e:report   # View HTML report
npm run test:e2e:full     # Full device matrix (local only)
```

### Test Coverage

**Unit tests (Vitest):** 136 tests
- Components: 74 tests covering UI components, buttons, and navigation
- Database components: 23 tests covering DatabaseToggle and ErrorBanner
- Utilities: 18 tests covering helper functions and data processing
- Integration: 21 tests covering API calls and state management

**E2E tests (Playwright):** 45 scenarios across 6 device configurations (193 test executions)
- Desktop: Chrome, Firefox, Safari
- Mobile: Pixel 5, iPhone 12
- Tablet: iPad Pro
- Database integration: 13 scenarios covering mode toggle, error handling, and fetching

CI runs 2 configurations (Desktop Chrome and Mobile Chrome). The full 6-browser matrix is available locally via `npm run test:e2e:full`.

See [e2e/README.md](e2e/README.md) for the full E2E testing guide, including debugging tips, selector patterns, and writing new tests.

## Design Review

The `design-review/` directory contains a consolidated UI review environment for evaluating mockups across component categories (splash screens, main app layouts, control bar variants). It works immediately after deployment without a database migration — verdicts are stored in `localStorage`.

To access the review interface locally:
```bash
npm run dev:all
# Then open: http://localhost:5173/design-review/
```

For optional API-backed persistence of review sessions, apply the design review migration against your Supabase project:
```bash
psql $DATABASE_URL -f supabase/migrations/20260222000000_design_review_tables.sql
```

See [design-review/README.md](design-review/README.md) for the full interface guide, keyboard shortcuts, and API endpoint reference.

For React and Next.js performance best practices applied during development, see the Vercel React Best Practices skill in [.agents/skills/vercel-react-best-practices/README.md](.agents/skills/vercel-react-best-practices/README.md).

## Database

### Local Development

The poem database is distributed as a PostgreSQL dump file (`poetry-database/qafiyah_public_20250610_1424.dump`, 42 MB). It is not stored in the repository due to its size. Contact the project maintainer to obtain the file.

To restore locally:
```bash
pg_restore -d qafiyah poetry-database/qafiyah_public_20250610_1424.dump
```

To verify the restoration:
```sql
SELECT COUNT(*) FROM poems;
-- Expected: 84329
```

See [poetry-database/README.md](poetry-database/README.md) for details.

### Production (Supabase)

For production deployments, restore the dump to your Supabase PostgreSQL instance:
```bash
pg_restore --clean --no-owner --no-acl \
  -d "postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres" \
  poetry-database/qafiyah_public_20250610_1424.dump
```

Schema migrations (auth tables, design review tables) are managed via the Supabase CLI:
```bash
supabase db push
```

See [supabase/migrations/README.md](supabase/migrations/README.md) for the full list of migrations.

## Tech Stack

**Frontend**
- React 18
- Vite
- Tailwind CSS
- Lucide React (icons)
- Gemini API (AI features)
- Supabase client (authentication and user data — optional)

**Backend**
- Express.js 5
- PostgreSQL 15+ (17 required for Supabase auth migrations)
- node-postgres (pg) connection pool
- CORS middleware
- morgan (HTTP request logging)

**Authentication and User Data (optional)**
- Supabase Auth (Google and Apple OAuth)
- Supabase Database (user settings, saved poems)
- Row Level Security (RLS) policies

## Deployment

The production stack uses Vercel (frontend), Render (backend API), and Supabase (database). All services are available on free tiers at $0/month.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the complete step-by-step guide covering:
- Supabase project setup and database restoration
- Render web service configuration and environment variables
- Vercel frontend environment variable setup and redeployment
- Keep-alive configuration to prevent Render cold starts
- Troubleshooting common connectivity issues

### Vercel Setup (Recommended)

1. **Install Vercel GitHub App**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Git Repository"
   - Select `lesmartiepants/poetry-bil-araby`

2. **Configure Project**
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Add Environment Variables**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Add: `VITE_GEMINI_API_KEY` = `your-api-key-here`
   - Apply to: Production, Preview, Development

4. **Enable Automatic Deployments**
   - Every push to `main` → Production deployment
   - Every PR → Preview deployment with unique URL
   - PR comments will include preview links

5. **Optional: Custom Domain**
   - Go to Settings → Domains
   - Add your custom domain

### Benefits of Vercel Integration
- Automatic preview deployments for every PR
- Instant rollbacks
- Edge network CDN
- Zero configuration
- Automatic HTTPS

## Project Structure

```
poetry-bil-araby/
├── src/
│   ├── app.jsx                          # Main application component (~2800 lines)
│   ├── main.jsx                         # React entry point
│   ├── index.css                        # Global styles (Tailwind)
│   ├── hooks/useAuth.js                 # Authentication hooks
│   ├── supabaseClient.js                # Supabase client configuration
│   └── test/                            # Unit tests
│       ├── components.test.jsx
│       ├── database-components.test.jsx
│       ├── utils.test.jsx
│       └── App.test.jsx
├── e2e/                                 # Playwright E2E tests
│   ├── app.spec.js
│   ├── database-integration.spec.js
│   ├── ui-ux.spec.js
│   └── README.md
├── design-review/                       # Design mockup review UI
│   └── README.md
├── poetry-database/                     # Database dump files (gitignored)
│   └── README.md
├── supabase/
│   └── migrations/                      # SQL migration files
│       └── README.md
├── server.js                            # Express API server
├── playwright.config.js                 # E2E config (CI: 2 devices)
├── playwright.config.full.js            # E2E config (local: 6 devices)
├── vitest.config.js                     # Unit test configuration
├── vite.config.js                       # Vite build configuration
├── tailwind.config.js                   # Tailwind with custom Arabic fonts
├── vercel.json                          # Vercel deployment config
├── render.yaml                          # Render deployment config
├── DEPLOYMENT.md                        # Full deployment guide
└── package.json
```

## Production Readiness

The release readiness analysis (see PR #58) audited the app against a mobile-first public launch checklist. The following is the current status.

### P0 — Blocks Public Launch

- [x] **Debug panel in production** ([#111](https://github.com/lesmartiepants/poetry-bil-araby/issues/111)): `FEATURES.debug` now gates on `import.meta.env.DEV` — panel is hidden in production builds.
- [x] **No React error boundary** ([#112](https://github.com/lesmartiepants/poetry-bil-araby/issues/112)): `ErrorBoundary` added in `main.jsx`; crashes show a bilingual recovery UI instead of a blank screen.
- [ ] **Gemini API key exposed client-side** ([#113](https://github.com/lesmartiepants/poetry-bil-araby/issues/113)): `VITE_GEMINI_API_KEY` is bundled into the client-side JS. Proxy AI calls through the Express backend or restrict the key to the production domain.
- [x] **No SEO / Open Graph metadata** ([#114](https://github.com/lesmartiepants/poetry-bil-araby/issues/114)): Added description, OG, and Twitter Card meta tags to `index.html`.
- [x] **Favicon is the Vite default** ([#115](https://github.com/lesmartiepants/poetry-bil-araby/issues/115)): Replaced with a branded SVG app icon (`public/app-icon.svg`).
- [ ] **No graceful degradation without API key** ([#116](https://github.com/lesmartiepants/poetry-bil-araby/issues/116)): When `VITE_GEMINI_API_KEY` is absent or empty, AI mode silently fails. Add an explicit fallback UI directing users to database mode.
- [x] **Version is `0.0.0`** ([#117](https://github.com/lesmartiepants/poetry-bil-araby/issues/117)): Updated `package.json` to `1.0.0`.

### P1 — Launch-Critical Polish

- [ ] No splash screen or first-time onboarding ([#118](https://github.com/lesmartiepants/poetry-bil-araby/issues/118); extensive design exploration exists in PR #11)
- [x] PWA manifest added ([#119](https://github.com/lesmartiepants/poetry-bil-araby/issues/119)): `public/manifest.json` with app name, theme color, and icon; service worker not yet implemented
- [x] Light mode dropdown theming inconsistency ([#121](https://github.com/lesmartiepants/poetry-bil-araby/issues/121)): fixed — all dropdown panels now respect the active theme
- [ ] No analytics or error tracking ([#122](https://github.com/lesmartiepants/poetry-bil-araby/issues/122)): zero visibility into post-launch behavior

### P2 — Post-Launch

- [ ] File decomposition: `src/app.jsx` is ~2,800 lines; split into `components/`, `hooks/`, and `utils/`
- [ ] Full WCAG AA accessibility audit (keyboard navigation, screen reader, `aria-live`)
- [ ] Transliteration toggle and text zoom controls (design mockups exist in PR #50)
- [ ] Web Vitals / performance monitoring
- [ ] Harden E2E CI: `continue-on-error: true` on DB setup means tests can pass without real database coverage

### Already Complete

- Poem favorites, saved poems view, and persistent settings
- Supabase authentication (Google and Apple SSO)
- PostgreSQL-backed database mode with 84,329 poems
- Backend keep-alive to prevent Render cold starts
- Rate limiting dependency added (`express-rate-limit`)
- Optimized CI/CD pipeline with PostgreSQL service
- GitHub Copilot and Claude AI development instructions

See the full analysis in PR #58 (`RELEASE_READINESS.md`) for effort estimates, decision points, and a phased implementation plan.

## TODO

### Features
- [x] Add poem favorites and bookmarks
- [x] Saved Poems view to browse collection
- [x] Settings view for theme and font preferences
- [ ] Implement search functionality
- [ ] Add social media sharing
- [ ] Create poem collections and playlists
- [ ] Expand poet and category library
- [ ] Add keyboard shortcuts
- [ ] Implement pagination for large datasets

### Developer Experience
- [x] Set up GitHub Copilot instructions
- [ ] Configure ESLint and Prettier
- [ ] Set up pre-commit hooks
- [ ] Consider TypeScript migration
- [ ] Add JSDoc comments to functions
- [ ] Create CONTRIBUTING.md

## References

| Resource | Description |
|----------|-------------|
| [e2e/README.md](e2e/README.md) | Playwright E2E testing guide: running tests, debugging, writing new specs |
| [design-review/README.md](design-review/README.md) | Design review UI: accessing mockups, keyboard shortcuts, API endpoints |
| [supabase/migrations/README.md](supabase/migrations/README.md) | Database migration files and setup instructions |
| [poetry-database/README.md](poetry-database/README.md) | Database dump file location and restoration instructions |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Step-by-step production deployment guide (Supabase + Render + Vercel) |
| [.github/TESTING_STRATEGY.md](.github/TESTING_STRATEGY.md) | Comprehensive testing strategy and CI architecture |
| [.github/CI_CD_GUIDE.md](.github/CI_CD_GUIDE.md) | CI/CD pipeline operational reference |
| [CLAUDE.md](CLAUDE.md) | Guidance for Claude AI when working in this codebase |

# Poetry Bil-Araby | بالعربي

A beautiful React application for exploring Arabic poetry with AI-powered insights, audio recitation, and translations.

## Features

- 📖 Browse classic and modern Arabic poetry
- 🗄️ **NEW:** Database mode with 84K+ restored Arabic poems
- 🔐 **NEW:** User authentication with Google/Apple SSO (Supabase)
- ❤️ **NEW:** Save favorite poems to your personal collection
- ⚙️ **NEW:** Persistent user settings (theme, font preferences)
- 🎙️ AI-powered audio recitation with emotional context
- 🤖 Deep analysis and interpretation using AI
- 🔄 Toggle between Database mode (local PostgreSQL) and AI mode (Gemini API)
- 🌙 Dark/Light mode toggle
- 🎨 Beautiful Arabic typography and design (Amiri font)
- 🔍 Filter by poet and category
- 📋 Copy poems to clipboard
- ✅ Comprehensive test coverage (136 unit + 193 E2E tests)
- 🚀 Optimized CI/CD pipeline (3-minute builds)
- 🛡️ Robust error handling with user-friendly error messages

## Setup

### Prerequisites
- Node.js (v18 or higher)
- **For AI Mode:** A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **For Database Mode:** PostgreSQL 15+ (optional, but recommended for full functionality)
- **For Authentication (Optional):** A Supabase account and project ([supabase.com](https://supabase.com))

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:

   **For AI Mode (Gemini API):**
   - Create a `.env.local` file in the project root
   - Add your Gemini API key: `VITE_GEMINI_API_KEY=your-api-key-here`

   **For Database Mode (PostgreSQL):**
   - Install PostgreSQL 15+ locally (requires Postgres 17 for Supabase auth migrations)
   - Create database: `createdb qafiyah`
   - Set up environment variables (optional, defaults to localhost):
     ```bash
     # Backend API Configuration (server.js)
     PGUSER=your_username          # Default: $USER
     PGHOST=localhost              # Default: localhost
     PGDATABASE=qafiyah           # Default: qafiyah
     PGPASSWORD=your_password      # Default: empty
     PGPORT=5432                   # Default: 5432
     PORT=3001                     # Backend server port
     LOG_ENABLED=true              # Enable HTTP request logging (default: true)
     LOG_DEBUG=false               # Enable verbose database debug logs (default: false)

     # Frontend Configuration (.env.local)
     VITE_API_URL=http://localhost:3001  # Default: http://localhost:3001
     ```

   **For Authentication (Optional - Supabase):**
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Go to Project Settings → API
   - Add to `.env.local`:
     ```bash
     VITE_SUPABASE_URL=your-project-url
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```
   - Run database migrations:
     ```bash
     # Install Supabase CLI (if not already installed)
     npm install -g supabase
     
     # Link to your project
     supabase link --project-ref your-project-ref
     
     # Push migrations
     supabase db push
     ```
   - Configure OAuth providers in Supabase Dashboard:
     - Go to Authentication → Providers
     - Enable Google and/or Apple
     - Add OAuth credentials from respective platforms

3. Start the development server:

   **Option A: Frontend only (AI mode):**
   ```bash
   npm run dev
   ```

   **Option B: Frontend + Backend (Database mode):**
   ```bash
   # Terminal 1: Start backend API server
   npm run dev:server

   # Terminal 2: Start frontend dev server
   npm run dev
   ```

   **Option C: Both concurrently:**
   ```bash
   npm run dev:all
   ```

4. Open your browser to the URL shown (usually `http://localhost:5173`)

## Usage

### Mode Switching
- **Database Mode** (Library icon 📚): Fetches poems from local PostgreSQL database (84K+ poems)
- **AI Mode** (Sparkles icon ✨): Generates poems using Gemini API
- Toggle between modes using the control bar button or overflow menu (mobile)

### Core Features
- **Discover**: Click the rabbit/sparkles button to fetch new poems
- **Navigate**: Use arrow buttons to browse through poems
- **Play**: Click the play button to hear AI-generated recitation (AI mode only)
- **Analyze**: Click "Seek Insight" to get deep analysis (AI mode only)
- **Copy**: Click the copy icon to save poem text
- **Filter**: Select specific poets from the category dropdown
- **Theme**: Toggle between dark and light modes

### Authentication Features (Optional)
When Supabase is configured, the app provides:
- **Sign In**: Click the "Sign In" button to authenticate with Google or Apple
- **Save Poems**: Click the heart ❤️ button to save poems to your personal collection
- **My Poems**: View and browse all your saved poems from the account menu
- **Settings**: Customize theme and font preferences with live preview
- **Persistent Settings**: Your preferences are automatically saved across sessions
- **User Profile**: Access your account menu to view settings and sign out

**Note**: Authentication features only appear when Supabase environment variables are configured. The app works fully without authentication.

### Database Mode Benefits
- Access to 84,329 restored Arabic poems
- Instant fetching (no API latency)
- Works offline (after database setup)
- Filter by poet (50+ poets available)
- Proper line break formatting

## Building with Claude

### Recommended Workflow

1. **Start with clear goals**: Tell me what feature you want to add or what issue you're facing
2. **Let me explore first**: I'll read and understand the existing code structure
3. **Iterate together**: We'll make changes incrementally and test as we go
4. **Use the tools**: I can search, edit files, run tests, and commit changes

### Tips for Working Together

- Be specific about what you want to change
- Let me know your preferences (styling, architecture, etc.)
- I'll ask clarifying questions when needed
- Tell me if something doesn't look right - we can iterate!

## Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Lucide React (icons)
- Gemini API (AI features)
- Supabase (authentication & user data - optional)
- Structured logging (captured by Vercel/browser console)

### Backend (Database Mode)
- Express.js 5 (API server)
- PostgreSQL 15+ (poem database, requires 17 for auth features)
- node-postgres (pg) client
- CORS middleware
- Structured logging with LOG_ENABLED/LOG_DEBUG flags

### Authentication & User Data (Optional)
- Supabase Auth (Google & Apple OAuth)
- Supabase Database (user settings, saved poems, discussions)
- Row Level Security (RLS) policies for data protection

## Project Structure

```
poetry-bil-araby/
├── src/                     # Source code
│   ├── app.jsx             # Main application component (1500+ lines)
│   ├── main.jsx            # React entry point
│   ├── index.css           # Global styles (Tailwind)
│   └── test/               # Unit tests (136 tests)
│       ├── components.test.jsx
│       ├── database-components.test.jsx  # NEW: Database integration tests
│       ├── utils.test.jsx
│       └── App.test.jsx
├── e2e/                     # End-to-end tests (Playwright)
│   ├── app.spec.js         # Core functionality tests
│   ├── database-integration.spec.js  # NEW: Database E2E tests
│   ├── ui-ux.spec.js       # UI/UX quality tests
│   └── mockup-screenshots.spec.js
├── server.js                # NEW: Express API server for database mode
├── .github/                 # GitHub configuration
│   ├── workflows/ci.yml    # CI/CD pipeline (PostgreSQL service added)
│   ├── TESTING_STRATEGY.md # Comprehensive testing guide
│   └── CI_CD_GUIDE.md      # CI/CD operational reference
├── docs/                    # Documentation
│   └── CI_PERFORMANCE_OPTIMIZATION.md
├── package.json             # Dependencies and scripts
├── vitest.config.js         # Unit test configuration
├── playwright.config.js     # E2E test configuration
└── vercel.json             # Vercel deployment config
```

## Deployment

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
- ✅ Automatic preview deployments for every PR
- ✅ Instant rollbacks
- ✅ Edge network CDN
- ✅ Zero configuration
- ✅ Automatic HTTPS

## Testing

### Run Tests

```bash
# Unit tests (113 tests)
npm test                    # Watch mode
npm run test:run            # Single run
npm run test:coverage       # With coverage

# E2E tests (180+ test executions across devices)
npm run test:e2e            # All E2E tests
npm run test:e2e:ui         # UI/UX tests only
npm run test:e2e:headed     # With browser visible
npm run test:e2e:debug      # Debug mode
npm run test:e2e:report     # View HTML report
npm run test:e2e:full       # Full device matrix (local)
```

### Test Coverage

- **Unit Tests:** 136 tests covering components, utilities, and integration
  - Components: 74 tests (UI components, buttons, navigation)
  - Database Components: 23 tests (DatabaseToggle, ErrorBanner)
  - Utilities: 18 tests (helper functions, data processing)
  - Integration: 21 tests (API calls, state management)
- **E2E Tests:** 45 scenarios × 6 devices = 193+ test executions
  - Desktop: Chrome, Firefox, Safari
  - Mobile: Pixel 5, iPhone 12
  - Tablet: iPad Pro
  - Database Integration: 13 scenarios (mode toggle, error handling, fetching)
- **CI/CD:** Optimized pipeline with PostgreSQL service runs in ~3 minutes
- **Documentation:** See `.github/TESTING_STRATEGY.md` for details

## Documentation

- `.github/TESTING_STRATEGY.md` - Comprehensive testing strategy
- `.github/CI_CD_GUIDE.md` - CI/CD pipeline reference
- `.github/copilot-instructions.md` - GitHub Copilot custom instructions
- `.github/instructions/` - Path-specific Copilot instructions
- `CLAUDE.md` - Comprehensive guide for Claude AI
- `docs/CI_PERFORMANCE_OPTIMIZATION.md` - Performance optimization journey
- `e2e/README.md` - E2E testing guide

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

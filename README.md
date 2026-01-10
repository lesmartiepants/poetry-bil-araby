# Poetry Bil-Araby | بالعربي

A beautiful React application for exploring Arabic poetry with AI-powered insights, audio recitation, and translations.

## Features

- 🌟 Mystical splash screen and interactive walkthrough guide
- 📖 Browse classic and modern Arabic poetry
- 🎙️ AI-powered audio recitation with emotional context
- 🤖 Deep analysis and interpretation using AI
- 🌙 Dark/Light mode toggle
- 🎨 Beautiful Arabic typography and design (Amiri font)
- 🔍 Filter by poet and category
- 📋 Copy poems to clipboard
- ✅ Comprehensive test coverage (113 unit + 180 E2E tests)
- 🚀 Optimized CI/CD pipeline (3-minute builds)

## Setup

### Prerequisites
- Node.js (v18 or higher)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Add your Gemini API key: `VITE_GEMINI_API_KEY=your-api-key-here`

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to the URL shown (usually `http://localhost:5173`)

## Usage

- **First Visit**: Experience the mystical splash screen and optional 4-step walkthrough guide
- **Discover**: Click the ✨ sparkles button to fetch new poems
- **Navigate**: Use arrow buttons to browse through poems
- **Play**: Click the play button to hear AI-generated recitation
- **Analyze**: Click "Seek Insight" to get deep analysis
- **Copy**: Click the copy icon to save poem text
- **Theme**: Toggle between dark and light modes

**For Testing**: Add `?skipSplash=true` to the URL to bypass the splash screen (e.g., `http://localhost:5173/?skipSplash=true`)

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

- React 18
- Vite
- Tailwind CSS
- Lucide React (icons)
- Gemini API (AI features)

## Project Structure

```
poetry-bil-araby/
├── src/                     # Source code
│   ├── app.jsx             # Main application component
│   ├── main.jsx            # React entry point
│   ├── index.css           # Global styles (Tailwind)
│   └── test/               # Unit tests (113 tests)
├── e2e/                     # End-to-end tests (Playwright)
│   ├── app.spec.js         # Core functionality tests
│   └── ui-ux.spec.js       # UI/UX quality tests
├── .github/                 # GitHub configuration
│   ├── workflows/ci.yml    # CI/CD pipeline (optimized)
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

- **Unit Tests:** 113 tests covering components, utilities, and integration
- **E2E Tests:** 32 scenarios × 6 devices = 180+ test executions
  - Desktop: Chrome, Firefox, Safari
  - Mobile: Pixel 5, iPhone 12
  - Tablet: iPad Pro
- **CI/CD:** Optimized pipeline runs in ~3 minutes
- **Documentation:** See `.github/TESTING_STRATEGY.md` for details

## Documentation

- `CLAUDE.md` - Primary context file for Claude Code (READ THIS FIRST)
- `.github/TESTING_STRATEGY.md` - Comprehensive testing strategy
- `.github/CI_CD_GUIDE.md` - CI/CD pipeline reference
- `docs/CI_PERFORMANCE_OPTIMIZATION.md` - Performance optimization journey
- `e2e/README.md` - E2E testing guide
- `SPLASH-WALKTHROUGH-REDESIGN.md` - Onboarding flow design documentation
- `INVESTIGATION-FINDINGS.md` - CI test failure root cause analysis

## TODO

### Features
- [ ] Add poem favorites and bookmarks
- [ ] Implement search functionality
- [ ] Add social media sharing
- [ ] Create poem collections and playlists
- [ ] Expand poet and category library
- [ ] Add keyboard shortcuts
- [ ] Implement pagination for large datasets

### Developer Experience
- [ ] Configure ESLint and Prettier
- [ ] Set up pre-commit hooks
- [ ] Consider TypeScript migration
- [ ] Add JSDoc comments to functions
- [ ] Create CONTRIBUTING.md

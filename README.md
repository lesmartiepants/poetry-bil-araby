# Poetry Bil-Araby | بالعربي

A beautiful React application for exploring Arabic poetry with AI-powered insights, audio recitation, and translations.

## Features

- 📖 Browse classic and modern Arabic poetry
- 🎙️ AI-powered audio recitation with emotional context
- 🤖 Deep analysis and interpretation using AI
- 🌙 Dark/Light mode toggle
- 🎨 Beautiful Arabic typography and design
- 🔍 Filter by poet and category
- 📋 Copy poems to clipboard

## Setup

### Prerequisites
- Node.js (v18 or higher)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Add your Gemini API key:
   - Open `app.jsx`
   - Find line 79: `const apiKey = "";`
   - Add your API key: `const apiKey = "your-api-key-here";`

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to the URL shown (usually `http://localhost:5173`)

## Usage

- **Discover**: Click the ✨ sparkles button to fetch new poems
- **Navigate**: Use arrow buttons to browse through poems
- **Play**: Click the play button to hear AI-generated recitation
- **Analyze**: Click "Seek Insight" to get deep analysis
- **Copy**: Click the copy icon to save poem text
- **Theme**: Toggle between dark and light modes

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
├── app.jsx                  # Main application component
├── main.jsx                 # React entry point
├── index.html               # HTML template
├── index.css                # Global styles (Tailwind)
├── package.json             # Dependencies
├── vite.config.js           # Vite configuration
├── vercel.json              # Vercel deployment config
├── .github/workflows/       # CI/CD pipelines
│   ├── ci.yml              # Continuous Integration
│   └── deploy.yml          # Production deployment
└── CI_CD_STRATEGY.md       # Detailed CI/CD evolution guide
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

## TODO

### Next Steps
- [ ] Add tests: Install Vitest and create first component tests
- [ ] Set up coverage: Connect Codecov for coverage tracking
- [ ] Add visual regression: Install Playwright when UI stabilizes

### Testing & Quality
- [ ] Add unit and component tests with Vitest
- [ ] Set up code coverage tracking with Codecov
- [ ] Implement visual regression testing with Playwright
- [ ] Create E2E test suite
- [ ] Add Lighthouse CI for performance monitoring
- [ ] Set up bundle size tracking
- [ ] Enable Dependabot for security scanning

### Features
- [ ] Add poem favorites and bookmarks
- [ ] Implement search functionality
- [ ] Add social media sharing
- [ ] Create poem collections and playlists
- [ ] Expand poet and category library
- [ ] Add keyboard shortcuts
- [ ] Implement pagination for large datasets

### Documentation
- [ ] Add JSDoc comments to functions
- [ ] Create CONTRIBUTING.md
- [ ] Document component architecture
- [ ] Add API integration documentation

### Developer Experience
- [ ] Configure ESLint and Prettier
- [ ] Set up pre-commit hooks
- [ ] Consider TypeScript migration
- [ ] Create development environment setup script

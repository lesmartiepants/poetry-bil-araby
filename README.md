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
├── app.jsx           # Main application component
├── main.jsx          # React entry point
├── index.html        # HTML template
├── index.css         # Global styles (Tailwind)
├── package.json      # Dependencies
└── vite.config.js    # Vite configuration
```

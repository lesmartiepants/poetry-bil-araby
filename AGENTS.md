# AGENTS.md

## Cursor Cloud specific instructions

- Standard setup, test, build, and run commands are documented in `README.md`, `CLAUDE.md`, and `package.json`.
- The app is a Vite React frontend plus an Express API. In Cursor Cloud, run them in separate tmux sessions when you need independent logs (`npm run dev -- --host 0.0.0.0` and `npm run dev:server`).
- The backend can start without a database: `/api/health` is only a lightweight process check, while `/api/health/full` verifies Postgres and returns 500 until `DATABASE_URL` or a local `qafiyah` database is available. DB-backed discover/search/design-review endpoints need that database.
- AI, insight, and TTS proxy routes use the backend `GEMINI_API_KEY`; frontend `VITE_GEMINI_API_KEY` alone does not enable those server routes.
- First-run onboarding is controlled by browser storage (`hasSeenOnboarding`). Clear local/session storage for `localhost:5173` to replay onboarding or reset a stuck client state after failed manual testing.

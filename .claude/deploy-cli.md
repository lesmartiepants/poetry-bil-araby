# Deploy CLI Reference (Render + Vercel)

## Topology
- **Frontend**: Vercel (auto-deploys `main`; PR branches get preview deploys)
- **Backend**: Render web service `poetry-bil-araby`, id `srv-d6jdt05m5p6s73dmrsq0`
- **API URL**: Both production and preview frontends call the same prod backend via `VITE_API_URL`
- **Health check**: `GET /api/health`

## Render CLI

**Install & Auth**
```bash
brew install render
render login                    # Device-code flow, or set $RENDER_API_KEY in .env
```

**View/Deploy**
```bash
# List deploys for the service
render deploys list srv-d6jdt05m5p6s73dmrsq0

# Deploy main branch (auto-triggered on push)
render deploys create srv-d6jdt05m5p6s73dmrsq0

# Deploy specific commit (one-off, doesn't affect auto-deploy)
render deploys create srv-d6jdt05m5p6s73dmrsq0 --commit <sha>

# Non-interactive
render deploys create srv-d6jdt05m5p6s73dmrsq0 -o json --confirm
```

**REST Alternative** (if CLI unavailable; needs `$RENDER_API_KEY`)
```bash
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/services/srv-d6jdt05m5p6s73dmrsq0/deploys \
  -X POST -H "Content-Type: application/json" \
  -d '{"commitId":"<sha>"}'
```

## Vercel CLI

**Install & Auth**
```bash
npm i -g vercel
vercel login                   # Device-code flow, or set $VERCEL_TOKEN in .env
vercel link --yes              # (if not already linked)
```

**Inspect Environment**
```bash
vercel env ls                  # List all env vars (names only, no values)
vercel env pull                # Download env vars to .env.local
```

**Deploy**
Vercel auto-deploys on `main` push. For preview URLs, push to a feature branch.

## Environment Variables

**Frontend** (`VITE_*` prefix, Vercel)
- `VITE_API_URL` – Backend URL (production + preview both use prod Render)
- `VITE_GEMINI_API_KEY` – Gemini API key

**Backend** (Render)
- `DATABASE_URL` – Supabase pooler connection string (use `pooler.supabase.com`, not direct host)
- `API_SECRET_KEY` – Protect write endpoints (optional)
- `LOG_ENABLED` – HTTP request logging (default: true)

**Local** (.env, gitignored)
- `RENDER_API_KEY` – For `render` CLI when offline/non-interactive
- `VERCEL_TOKEN` – For `vercel` CLI when offline/non-interactive

## Notes
- Backend changes that add SSE fields are backward-compatible (old frontends ignore unknown events)
- Render service has autoDeploy ON, PR previews OFF
- Never print secret values; verify presence with `grep -q '^NAME=' .env` instead

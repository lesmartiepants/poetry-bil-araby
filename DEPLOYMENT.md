# Deployment Guide: Supabase + Render + Vercel

This guide walks you through deploying the Poetry app with:

- **Database**: Supabase (Free tier - 500 MB PostgreSQL)
- **Backend**: Render (Free tier - Express API with keep-alive)
- **Frontend**: Vercel (Already deployed)

**Total Cost**: $0/month (free tiers)

---

## Prerequisites

- GitHub account
- Supabase account (sign up at [supabase.com](https://supabase.com))
- Render account (sign up at [render.com](https://render.com))
- Vercel account (you already have this)
- Database dump file: `poetry-database/qafiyah_public_20250610_1424.dump`

---

## Step 1: Set Up Supabase Database

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in:
   - **Name**: `poetry-bil-araby` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
4. Click **"Create new project"** (takes ~2 minutes)

### 1.2 Get Database Connection String

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection Pooling** (not the direct connection)
3. Copy the **Transaction mode** pooler URI. It looks like:
   ```
   postgresql://postgres.YOUR_REF:[YOUR-PASSWORD]@aws-N-REGION.pooler.supabase.com:6543/postgres
   ```
4. **IMPORTANT**: Use the **pooler** host (`pooler.supabase.com`), not the direct host (`db.*.supabase.co`). The direct host is not reachable from external services like Render.
5. Replace `[YOUR-PASSWORD]` with the password you set in step 1.1
6. Save this connection string somewhere safe - you'll need it later

### 1.3 Upload Database Dump

**Option A: Using psql (Command Line)**

```bash
# Install psql if you don't have it (Mac with Homebrew):
brew install libpq

# Restore dump to Supabase:
pg_restore --clean --no-owner --no-acl \
  -d "postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres" \
  poetry-database/qafiyah_public_20250610_1424.dump
```

**Option B: Using Supabase Studio (Web Interface)**

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. This method requires converting dump to SQL format first:
   ```bash
   # Convert dump to plain SQL:
   pg_restore --clean --no-owner --no-acl \
     -f poetry-database/schema.sql \
     poetry-database/qafiyah_public_20250610_1424.dump
   ```
4. Copy the SQL contents and paste into Supabase SQL Editor
5. Click **"Run"**

**Verify Upload:**

1. In Supabase dashboard, go to **Table Editor**
2. You should see tables: `poems`, `poets`, `themes`
3. Check poem count:
   ```sql
   SELECT COUNT(*) FROM poems;
   -- Should return: 84329
   ```

---

## Step 2: Deploy Backend to Render

### 2.1 Create Render Web Service

1. Go to [render.com](https://render.com) and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository:
   - Click **"Connect GitHub"**
   - Select your `poetry-bil-araby` repository
4. Fill in service details:
   - **Name**: `poetry-bil-araby-api`
   - **Region**: Same as Supabase (e.g., `Oregon`)
   - **Branch**: `main`
   - **Root Directory**: Leave blank
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: **Free**

### 2.2 Configure Environment Variables

1. Scroll down to **Environment Variables**
2. Click **"Add Environment Variable"**
3. Add these variables:
   - **Key**: `DATABASE_URL`
   - **Value**: Your Supabase **pooler** connection string from Step 1.2
   - **Key**: `SUPABASE_SECRET_KEY`
   - **Value**: Your Supabase service_role key (JWT format, starts with `eyJ`)
   - **Key**: `SUPABASE_PROJECT_URL`
   - **Value**: Your Supabase project URL (e.g. `https://your-ref.supabase.co`)
4. Click **"Add"** for each variable

### 2.3 Deploy

1. Click **"Create Web Service"**
2. Render will:
   - Clone your repo
   - Run `npm install`
   - Start `node server.js`
   - Assign a URL like: `https://your-service-name.onrender.com`
3. Wait for deployment to complete (~2-3 minutes)
4. Check logs for: `✓ Connected to PostgreSQL`

### 2.4 Test Backend API

1. Copy your Render URL (e.g., `https://your-service-name.onrender.com`)
2. Test in browser or terminal:

   ```bash
   # Health check:
   curl https://your-service-name.onrender.com/api/health

   # Should return:
   # {"status":"ok","database":"connected","totalPoems":84329}

   # Random poem:
   curl https://your-service-name.onrender.com/api/poems/random
   ```

**If you see errors**, check Render logs:

- Go to **Logs** tab in Render dashboard
- Look for database connection errors

---

## Step 3: Update Vercel Frontend

### 3.1 Add Environment Variables

1. Go to [vercel.com](https://vercel.com) and open your project
2. Go to **Settings** → **Environment Variables**
3. Add these variables (all for Production, Preview, and Development):

   | Key                      | Value                                                         |
   | ------------------------ | ------------------------------------------------------------- |
   | `VITE_API_URL`           | Your Render URL (e.g. `https://your-service.onrender.com`)    |
   | `VITE_GEMINI_API_KEY`    | Your Gemini API key                                           |
   | `VITE_SUPABASE_URL`      | Your Supabase project URL                                     |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon key (**must** be JWT format, starts with `eyJ`) |

   **Note**: Do NOT add `DATABASE_URL` to Vercel. The database is only used by the Render backend.

### 3.2 Redeploy Frontend

1. Go to **Deployments** tab
2. Click **"..."** on the latest deployment → **"Redeploy"**
3. Wait for deployment to complete (~1 minute)

---

## Step 4: Test Production Deployment

### 4.1 Open Your App

1. Go to your Vercel URL (e.g., `https://poetry-bil-araby.vercel.app`)
2. Wait for page to load

### 4.2 Test Database Mode

1. Click the **Library/Sparkles toggle** in the control bar (bottom)
2. Should show **"Local"** (database mode)
3. Click the **"Discover"** button (rabbit icon)
4. Wait 10-15 seconds for first request (cold start)
5. A poem should load from the database

### 4.3 Verify Keep-Alive Ping

**Backend Self-Ping (Primary)**

The backend now keeps itself alive automatically:

1. Check Render logs for:
   ```
   🔄 Starting keep-alive self-ping (every 9-13 minutes, initial: 11 min)
   ✓ Keep-alive ping successful - 84329 poems in database
   ```
2. This runs automatically in production mode (no user action needed)
3. Works 24/7 even when no users are active
4. Interval randomized between 9-13 minutes to prevent synchronized load

**Frontend Backup Ping (Secondary)**

1. Open browser DevTools → **Console**
2. You should see (if debug mode is on):
   ```
   [System Logs] Keep-Alive: Backend pinged successfully
   ```
3. This provides additional keep-alive when users have the app open

---

## Staging Backend

### What it's for

Vercel builds a preview for every PR, but by default every preview talks to the
**production** backend. So a PR that adds a new API parameter looks broken in its
own preview: the frontend sends the parameter, production ignores it, and the
feature appears not to work. A reviewer can't tell that apart from a real bug.

The staging service exists so backend changes can be verified end to end before
they reach production. Use it for any PR that touches `server.js` or adds a
migration.

|            | Production                                   | Staging                                         |
| ---------- | -------------------------------------------- | ----------------------------------------------- |
| Service    | `poetry-bil-araby`                           | `poetry-bil-araby-staging`                      |
| URL        | `https://poetry-bil-araby-2mb0.onrender.com` | `https://poetry-bil-araby-staging.onrender.com` |
| Branch     | `main`                                       | `staging`                                       |
| Plan       | Free                                         | Free                                            |
| `NODE_ENV` | `production`                                 | `staging`                                       |
| Database   | `poetry-bil-araby` (Supabase)                | `poetry-bil-araby-staging` (separate Supabase)  |
| Keep-alive | Yes (always warm)                            | No (cold starts)                                |

Render's free plan has no per-PR preview environments. Setting
`previews.generation` to `"automatic"` returns HTTP 200 but the value stays
`"off"`, so this is one shared long-lived service rather than one per PR.

### Getting a PR onto staging

`staging` is a normal branch that Render auto-deploys on every push.

```bash
git fetch origin
git checkout staging
git reset --hard origin/main        # start from a clean main
git merge --no-ff origin/your-pr-branch
git push origin staging
```

Render redeploys automatically (~2 min). Confirm the running commit matches what
you pushed — `/api/health` reports the deployed SHA, which is how you catch a
stale build:

```bash
curl https://poetry-bil-araby-staging.onrender.com/api/health
# {"status":"ok","uptime":14.4,"commit":"7e9749b2..."}
```

Reset `staging` back to `origin/main` when you're done so the next person starts
clean.

> **`staging` is a single shared branch.** Two people testing at once will
> overwrite each other, and the second push silently replaces the first person's
> build — they'll be reviewing your code without knowing it. Say so in the PR or
> in chat before you push, and reset when you're finished. If you hit a
> collision, the `commit` field from `/api/health` tells you whose build is
> actually running.

### Pointing a Vercel preview at staging

The frontend reads `VITE_API_URL` (`src/services/database.js:5`). Vite inlines it
at **build** time, so it has to be set before the preview builds — you can't flip
it on an existing deployment.

In the Vercel dashboard: **Settings → Environment Variables → Add**

- Key: `VITE_API_URL`
- Value: `https://poetry-bil-araby-staging.onrender.com`
- Environment: **Preview** only
- Branch: your PR's branch name

Then redeploy the preview (push a commit, or **Deployments → ⋯ → Redeploy**).

Scope it to a **branch**, not to all previews. A bare Preview-scoped variable
sends every open PR's preview to staging, which is wrong twice over: unrelated
PRs get tested against whatever half-merged code is sitting on `staging`, and
they break outright whenever staging is missing a credential. Delete the variable
when the PR merges.

CORS needs no change. `server.js` allowlists origins matching
`poetry-bil-araby-*.vercel.app`, and staging runs the same code, so preview
origins are already accepted. The staging host itself never needs adding — it's
the server, not a browser origin.

### Environment variables

`DATABASE_URL` is **already set** and points at the dedicated staging Supabase
project (see below). The rest must be added by hand in the Render dashboard
(**poetry-bil-araby-staging → Environment**), and only if a given PR needs them:

- `GEMINI_API_KEY` — only if the PR exercises AI mode or the TTS proxy.
- `GITHUB_TOKEN_SUBMIT_BUG` — only if the PR exercises bug-report submission.
- `API_SECRET_KEY` — only if the PR exercises a write endpoint. Left unset,
  write-endpoint auth is bypassed, which is fine for staging and wrong for prod.

Without `DATABASE_URL`, `/api/health` still returns ok but `/api/health/full` and
every poem route return 500 — with an **empty** error message, so don't go hunting
for a cause in the logs.

### The staging database

Staging has its **own** Supabase project, not a pointer at production.

|             | Production                            | Staging                               |
| ----------- | ------------------------------------- | ------------------------------------- |
| Project     | `poetry-bil-araby`                    | `poetry-bil-araby-staging`            |
| Region      | `us-east-1`                           | `us-east-1`                           |
| Pooler host | `aws-1-us-east-1.pooler.supabase.com` | `aws-0-us-east-1.pooler.supabase.com` |

Both are free-tier projects in the same org, which is the free plan's limit of two
active projects. **Everything else in the org is now paused-only** — activating a
third project means pausing one of these or upgrading.

The pooler subdomains differ (`aws-1` vs `aws-0`). Read the host from
`GET /v1/projects/{ref}/config/database/pooler` rather than copying production's
and editing the ref. As everywhere else in this repo, use the **pooler** host on
port `6543`, never `db.<ref>.supabase.co`.

The staging DB password is in the repo-root `.env` as `STAGING_DB_PASSWORD`.

**What's in it.** A full copy of production's content: all 9,073 poems, 1,013
poets, and the complete categorization data (40,019 `poem_categories` rows), plus
eras, meters, rhymes, themes and patterns. Deliberately **not** copied: `users`,
`user_settings`, `saved_poems`, `bug_reports`, `discussions`, `discussion_likes`,
`poem_events`, `tagging_jobs` and the `design_*` tables. Those tables exist with
the right schema but are empty, so staging carries no real user data.

The staging DB is ~102 MB against the 500 MB free cap. Production reports 941 MB
for the same content, almost all of it index bloat on `poems`; a fresh rebuild is
an order of magnitude smaller.

**Migration history is replicated too**, so `supabase db push` against staging
applies only migrations production hasn't seen. That is the whole point: a new
migration can be proven on staging before it ever touches production.

### Recreating the staging database

There is no single command for this, because **the base schema is not in this
repo**. `supabase/migrations/` never runs `CREATE TABLE poems` or `poets` — every
reference is an `ALTER`. Those 37 tables came from the original corpus import, and
`.gitignore` excludes `*_import_poetry.sql`. Run `supabase db push` at a blank
project and it fails immediately.

So the schema has to come out of production:

```bash
# Session mode (port 5432) — pg_dump does not work through the transaction pooler
pg_dump "$PROD_SESSION_URL" --schema-only --no-owner --no-privileges \
  --schema=public --schema=supabase_migrations -f prod_schema.sql

pg_dump "$PROD_SESSION_URL" --data-only --no-owner --no-privileges \
  --schema=public --schema=supabase_migrations \
  --exclude-table-data=public.users \
  --exclude-table-data=public.user_settings \
  --exclude-table-data=public.saved_poems \
  --exclude-table-data=public.bug_reports \
  --exclude-table-data=public.discussions \
  --exclude-table-data=public.discussion_likes \
  --exclude-table-data=public.poem_events \
  --exclude-table-data=public.tagging_jobs \
  --exclude-table-data="public.design_*" -f prod_data.sql
```

Load the schema first, then the data with `SET session_replication_role = 'replica';`
ahead of it — `tags` has a circular foreign key that a plain `--data-only` restore
cannot satisfy in order.

A copy of the schema dump is at `~/pgdump/prod_schema.sql` on the maintainer's
machine. **Committing it as a baseline migration would remove this whole problem**
and is worth doing.

**Never point staging at production.** A bad `ALTER`/`DROP` in an unreviewed PR
would hit the real corpus with free-plan backup retention as the only recovery.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│  Vercel (Frontend)                          │
│  - React app (Vite build)                   │
│  - VITE_API_URL, VITE_GEMINI_API_KEY        │
│  - VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY│
└─────────────┬───────────────────────────────┘
              │ HTTPS
              ▼
┌─────────────────────────────────────────────┐
│  Render (Backend API - FREE)                │
│  - Express API (server.js)                  │
│  - /api/poems/*, /api/poets                 │
│  - /api/design-review/*                     │
│  - /api/health                              │
│  - Self-ping every 9-13 min (randomized)    │
│  - DATABASE_URL, SUPABASE_SECRET_KEY        │
└─────────────┬───────────────────────────────┘
              │ Supabase Connection Pooler
              ▼
┌─────────────────────────────────────────────┐
│  Supabase (Database - FREE)                 │
│  - PostgreSQL 17                            │
│  - 84,329 poems                             │
│  - Design review tables                     │
│  - Auth tables (optional)                   │
│  - Pooler: aws-N-region.pooler.supabase.com │
└─────────────────────────────────────────────┘
```

---

## Troubleshooting

### Backend Not Responding

**Symptom**: "Backend server is not running" error

**Solutions**:

1. Check Render logs for errors
2. Verify `DATABASE_URL` is set correctly in Render
3. Ensure Supabase database is online (check Supabase dashboard)
4. Wait 15-30 seconds for cold start on first request

### Poems Not Loading

**Symptom**: "No poems found" or 404 errors

**Solutions**:

1. Verify database was uploaded correctly:
   ```sql
   SELECT COUNT(*) FROM poems;
   ```
2. Check Render logs for SQL errors
3. Ensure Supabase connection string includes correct password

### Keep-Alive Not Working

**Symptom**: Cold starts still happening frequently

**Solutions**:

1. Check Render logs for `🔄 Starting keep-alive self-ping` message
2. Verify `NODE_ENV=production` is set in Render environment
3. Check Render logs for periodic `✓ Keep-alive ping successful` messages
4. If backend is still sleeping, check Render service status and logs

**Note**: The backend now uses self-ping (server pings itself) which works 24/7. The frontend ping is now a backup mechanism.

### Vercel Not Connecting to Backend

**Symptom**: Frontend can't fetch from backend

**Solutions**:

1. Verify `VITE_API_URL` is set in Vercel **Environment Variables**
2. Redeploy frontend after adding env var
3. Check that Render URL is correct (no trailing slash)

---

## Cost Breakdown

| Service      | Plan  | Cost         | Limits                             |
| ------------ | ----- | ------------ | ---------------------------------- |
| **Supabase** | Free  | $0/month     | 500 MB DB, 50K users/month         |
| **Render**   | Free  | $0/month     | 750 hrs/month, sleeps after 15 min |
| **Vercel**   | Hobby | $0/month     | 100 GB bandwidth/month             |
| **Total**    |       | **$0/month** |                                    |

**Upgrade Path**:

- **Render Pro**: $7/month (always-on, no cold starts)
- **Supabase Pro**: $25/month (8 GB DB, 250 GB bandwidth)

---

## GitHub Actions CI

Your CI pipeline already supports this architecture:

- ✅ PostgreSQL service runs in CI
- ✅ Backend starts for E2E tests
- ✅ Tests pass with database integration

No additional CI configuration needed!

---

## Diacritics Migration

After deploying, run the batch diacritization script to add tashkeel to poems:

1. Install Python deps: `pip install -r scripts/requirements-diacritize.txt`
2. Run: `DATABASE_URL="..." python scripts/batch-diacritize.py`
3. Apply generated migration: `psql "$DATABASE_URL" < supabase/migrations/20260306000001_populate_diacritics.sql.skip`

The `.sql.skip` suffix means it won't auto-run on `supabase db push` (too large for standard migrations).

---

## Next Steps

After successful deployment:

1. **Monitor Usage**:
   - Supabase: Check **Database** → **Usage**
   - Render: Check **Metrics** for uptime
   - Vercel: Check **Analytics** for traffic

2. **Consider Upgrades**:
   - If you get >1000 daily users → Upgrade Render to Pro ($7/month)
   - If database grows >500 MB → Upgrade Supabase to Pro ($25/month)

3. **Add Monitoring**:
   - Set up Sentry for error tracking
   - Add analytics for user behavior

---

**Questions?** Check the logs first:

- **Supabase**: Dashboard → **Logs**
- **Render**: Dashboard → **Logs**
- **Vercel**: Dashboard → **Deployments** → **Logs**

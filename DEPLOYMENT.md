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
2. Scroll down to **Connection string**
3. Select **URI** mode
4. Copy the connection string - it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
5. **IMPORTANT**: Replace `[YOUR-PASSWORD]` with the password you set in step 1.1
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
3. Add this variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Paste your Supabase connection string from Step 1.2
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
     ```
4. Click **"Add"**

### 2.3 Deploy

1. Click **"Create Web Service"**
2. Render will:
   - Clone your repo
   - Run `npm install`
   - Start `node server.js`
   - Assign a URL like: `https://poetry-bil-araby-api.onrender.com`
3. Wait for deployment to complete (~2-3 minutes)
4. Check logs for: `✓ Connected to PostgreSQL`

### 2.4 Test Backend API

1. Copy your Render URL (e.g., `https://poetry-bil-araby-api.onrender.com`)
2. Test in browser or terminal:
   ```bash
   # Health check:
   curl https://poetry-bil-araby-api.onrender.com/api/health

   # Should return:
   # {"status":"ok","database":"connected","totalPoems":84329}

   # Random poem:
   curl https://poetry-bil-araby-api.onrender.com/api/poems/random
   ```

**If you see errors**, check Render logs:
- Go to **Logs** tab in Render dashboard
- Look for database connection errors

---

## Step 3: Update Vercel Frontend

### 3.1 Add Environment Variable

1. Go to [vercel.com](https://vercel.com) and open your project
2. Go to **Settings** → **Environment Variables**
3. Click **"Add New"**
4. Fill in:
   - **Key**: `VITE_API_URL`
   - **Value**: Your Render URL (e.g., `https://poetry-bil-araby-api.onrender.com`)
   - **Environment**: Select **Production**, **Preview**, and **Development**
5. Click **"Save"**

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

1. Open browser DevTools → **Console**
2. You should see (if debug mode is on):
   ```
   [System Logs] Keep-Alive: Backend pinged successfully
   ```
3. This will repeat every 10 minutes to prevent Render from sleeping

---

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│  Vercel (Frontend)                          │
│  - React app                                │
│  - VITE_API_URL = Render URL                │
│  - Keep-alive ping every 10 min            │
└─────────────┬───────────────────────────────┘
              │ HTTPS
              ▼
┌─────────────────────────────────────────────┐
│  Render (Backend - FREE)                    │
│  - Express API (server.js)                  │
│  - /api/poems/random                        │
│  - /api/health                              │
│  - Sleeps after 15 min idle (kept awake)   │
└─────────────┬───────────────────────────────┘
              │ DATABASE_URL
              ▼
┌─────────────────────────────────────────────┐
│  Supabase (Database - FREE)                 │
│  - PostgreSQL 16                            │
│  - 84,329 poems                             │
│  - 500 MB storage (40 MB used)              │
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
1. Check browser console for keep-alive logs
2. Verify `VITE_API_URL` is set in Vercel
3. Ensure `useDatabase` mode is enabled

### Vercel Not Connecting to Backend

**Symptom**: Frontend can't fetch from backend

**Solutions**:
1. Verify `VITE_API_URL` is set in Vercel **Environment Variables**
2. Redeploy frontend after adding env var
3. Check that Render URL is correct (no trailing slash)

---

## Cost Breakdown

| Service | Plan | Cost | Limits |
|---------|------|------|--------|
| **Supabase** | Free | $0/month | 500 MB DB, 50K users/month |
| **Render** | Free | $0/month | 750 hrs/month, sleeps after 15 min |
| **Vercel** | Hobby | $0/month | 100 GB bandwidth/month |
| **Total** | | **$0/month** | |

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

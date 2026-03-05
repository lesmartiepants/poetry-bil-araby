# Authentication Setup Guide

This guide explains how to set up Supabase authentication for Poetry Bil-Araby, enabling user accounts, saved poems, and persistent settings.

## Overview

The application supports optional authentication through Supabase, providing:
- **Single Sign-On (SSO)**: Google and Apple OAuth
- **Saved Poems**: Personal collection of favorite poems with browse and read functionality
- **My Poems View**: Full-screen overlay to browse, read, and manage saved poems
- **Settings View**: Full-screen overlay to customize theme and font preferences with live preview
- **User Settings**: Persistent theme and font preferences across sessions
- **Future Features**: Discussions, custom voices, transliteration preferences

**Important**: Authentication is completely optional. The app works fully without it.

## Prerequisites

1. A [Supabase](https://supabase.com) account (free tier available)
2. Google OAuth credentials (for Google sign-in)
3. Apple OAuth credentials (for Apple sign-in, optional)

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in project details:
   - **Name**: `poetry-bil-araby` (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Select closest to your users
4. Wait for project creation (takes ~2 minutes)

## Step 2: Get Your API Credentials

1. In your Supabase project, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key — this **must** be the JWT-format key (starts with `eyJhbGc...`, ~200 chars). Do NOT use the `sb_publish...` format key.
3. Add to your `.env` file:
   ```bash
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-jwt-anon-key
   ```

## Step 3: Run Database Migrations

The app includes migrations to create necessary tables. Run them using the Supabase CLI:

```bash
# Install Supabase CLI globally (one-time setup)
npm install -g supabase

# Login to Supabase
supabase login

# Link your local project to Supabase
supabase link --project-ref your-project-ref

# Push migrations to create tables
supabase db push
```

**Important**: The migrations are compatible with PostgreSQL 17+ (uses `gen_random_uuid()` instead of `uuid_generate_v4()` extension).

**Migrations Applied:**
1. `20260119000000_auth_and_user_features.sql` - Creates auth tables (user_settings, saved_poems, discussions)
2. `20260219000000_postgrest_schema_grants.sql` - Grants schema access to PostgREST (required for Supabase Data API)
3. `20260220_create_design_review_tables.sql` - Creates design review tables (design_items, design_review_sessions, design_verdicts, design_review_history)

**Alternative**: Manually run the SQL migrations in Supabase Studio:
1. Go to **SQL Editor** in your Supabase dashboard
2. Run both migration files in order:
   - First: `supabase/migrations/20260119000000_auth_and_user_features.sql`
   - Second: `supabase/migrations/20260219000000_postgrest_schema_grants.sql`
3. Copy and paste the SQL for each
4. Click "Run" for each migration

### What Gets Created

**Migration 1** (`20260119000000_auth_and_user_features.sql`):
- **`user_settings`**: Stores user preferences (theme, font, voice, transliteration)
- **`saved_poems`**: User's favorite poems collection
- **`discussions`**: Future feature for poem discussions
- **`discussion_likes`**: Future feature for discussion interactions

**Migration 2** (`20260219000000_postgrest_schema_grants.sql`):
- Grants schema access to PostgREST roles (anon, authenticated, service_role)
- Enables Supabase Data API to access public tables
- Sets up proper permissions for poetry data tables (poems, poets, themes, etc.)
- Configures default privileges for future tables

All tables have Row Level Security (RLS) enabled, ensuring users can only access their own data.

## Step 4: Configure OAuth Providers

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen:
   - **Application type**: Web application
   - **Name**: Poetry Bil-Araby
   - **Authorized redirect URIs**: Add your Supabase auth callback URL
     ```
     https://your-project-ref.supabase.co/auth/v1/callback
     ```
6. Copy **Client ID** and **Client Secret**
7. In Supabase Dashboard:
   - Go to **Authentication** → **Providers**
   - Enable **Google**
   - Paste Client ID and Client Secret
   - Save

### Apple OAuth (Optional)

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Create an App ID and Services ID
3. Configure Sign in with Apple:
   - Enable Sign in with Apple capability
   - Add return URLs and domain
4. Generate a private key
5. In Supabase Dashboard:
   - Go to **Authentication** → **Providers**
   - Enable **Apple**
   - Add Services ID, Team ID, Key ID, and Private Key
   - Save

For detailed Apple OAuth setup, see [Supabase Apple Auth Docs](https://supabase.com/docs/guides/auth/social-login/auth-apple).

## Step 5: Configure Site URL

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your application URL:
   - Development: `http://localhost:5173`
   - Production: `https://your-domain.com`
3. Add **Redirect URLs** (same as site URL for now)

## Step 6: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```
2. Open the app in your browser
3. You should see a "Sign In" button in the control bar
4. Click it and try signing in with Google
5. After successful sign-in, you should see:
   - Your user icon/avatar with dropdown menu
   - A heart button to save poems
   - "My Poems" option in account dropdown to view saved collection
   - "Settings" option in account dropdown to customize preferences
   - Settings are now persisted across sessions

## Deployment

### Vercel (Frontend)

Add environment variables in Vercel dashboard:
```
VITE_SUPABASE_URL=your-production-url
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

### Update Supabase for Production

1. In Supabase Dashboard, update **Site URL** to production URL
2. Add production URL to **Redirect URLs**
3. Update OAuth provider redirect URIs with production callback URL

## Database Schema

### user_settings
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- theme: VARCHAR(10) - 'dark' or 'light'
- font_id: VARCHAR(50) - Font identifier
- voice_preference: VARCHAR(50) - Future: voice selection
- transliteration_enabled: BOOLEAN - Future: show transliteration
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### saved_poems
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- poem_id: INTEGER - Database poem ID (nullable)
- poem_text: TEXT - Full Arabic text
- poet: VARCHAR(255)
- title: VARCHAR(255)
- english: TEXT
- category: VARCHAR(100)
- saved_at: TIMESTAMP
```

## Security

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only view/modify their own data
- Discussions are publicly readable but only modifiable by owners
- Strict authentication checks on all operations

### Best Practices

1. **Never commit credentials**: Keep `.env.local` in `.gitignore`
2. **Use environment variables**: Different keys for dev/staging/prod
3. **Rotate keys**: If compromised, regenerate in Supabase dashboard
4. **Monitor usage**: Check Supabase logs for suspicious activity

## Troubleshooting

### "Supabase is not configured" error
- Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Ensure `.env.local` is in project root
- Verify anon key is in JWT format (long string starting with `eyJ`)
- Restart dev server after adding variables

### Migration errors with uuid_generate_v4()
- **Solution**: Use PostgreSQL 17+ which has `gen_random_uuid()` built-in
- The migrations have been updated to use `gen_random_uuid()` instead of the `uuid-ossp` extension
- If using older Postgres, manually replace `gen_random_uuid()` with `uuid_generate_v4()` and enable the extension

### OAuth redirect errors
- Verify redirect URIs match exactly in both provider and Supabase
- Check Site URL in Supabase matches your app URL
- Ensure OAuth provider is enabled in Supabase dashboard

### Settings not persisting
- Check browser console for errors
- Verify migrations ran successfully
- Confirm RLS policies are in place
- Check user is authenticated (user object exists)

### Saved poems not showing
- Confirm user is signed in
- Check network tab for API errors
- Verify `saved_poems` table exists
- Check RLS policies allow SELECT

## Future Features

The schema includes tables for planned features:

- **Discussions**: Comment on poems, view popular discussions
- **Voice Settings**: Choose preferred recitation voice
- **Transliteration**: Toggle Arabic transliteration display

These features are not yet implemented but the database is ready.

## Support

For issues with:
- **Supabase**: [Supabase Docs](https://supabase.com/docs) or [Discord](https://discord.supabase.com)
- **Google OAuth**: [Google OAuth Docs](https://developers.google.com/identity/protocols/oauth2)
- **Apple OAuth**: [Apple Sign In Docs](https://developer.apple.com/sign-in-with-apple/)
- **This App**: Open an issue on GitHub

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase React Quick Start](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)

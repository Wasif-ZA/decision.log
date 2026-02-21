# Setup Guide

## Prerequisites

- Node.js 18 or higher ([download](https://nodejs.org))
- npm
- A Supabase account ([sign up free](https://supabase.com))
- A GitHub account (for OAuth configuration)
- Git

## Step 1: Clone and Install

```bash
git clone https://github.com/Wasif-ZA/decision.log.git
cd decision.log/code
npm install
```

## Step 2: Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose a name, set a database password (save this — you will need it for the connection string), and pick a region close to you
4. Wait for the project to finish provisioning

## Step 3: Get Your Supabase Credentials

From your Supabase project dashboard:

1. Go to **Settings → API**
2. Copy the **Project URL** — this is your `NEXT_PUBLIC_SUPABASE_URL`
3. Copy the **anon/public key** — this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Go to **Settings → Database**
5. Copy the **Connection string** (URI format) — this is your `DATABASE_URL`
   - Replace `[YOUR-PASSWORD]` in the string with the database password you set in Step 2

## Step 4: Create a GitHub OAuth App

DecisionLog uses GitHub OAuth for authentication and repository access.

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the fields:
   - **Application name:** `DecisionLog` (or any name)
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback`
4. Click **Register application**
5. Copy the **Client ID** — this is your `GITHUB_CLIENT_ID`
6. Click **Generate a new client secret** and copy it — this is your `GITHUB_CLIENT_SECRET`

## Step 5: Configure Environment Variables

```bash
cp .env.example .env.local
```

If `.env.example` does not exist, create `.env.local` manually with the following variables:

```bash
# Supabase / PostgreSQL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...your-key
DATABASE_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/callback

# JWT
JWT_SECRET=a-strong-random-string-at-least-32-characters
JWT_EXPIRES_IN=7d

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Demo mode (set to true for read-only public access)
NEXT_PUBLIC_DEMO_MODE=false

# LLM API keys (for decision extraction)
ANTHROPIC_API_KEY=sk-ant-...your-anthropic-key
OPENAI_API_KEY=sk-...your-openai-key
```

**Notes on specific variables:**

- `JWT_SECRET` must be at least 32 characters. Used for signing session JWTs and deriving the encryption key for stored GitHub tokens.
- `ANTHROPIC_API_KEY` is required for the primary extraction model (Claude Sonnet 4). `OPENAI_API_KEY` is the fallback (GPT-4o). At least one is needed for decision extraction to work.
- `NEXT_PUBLIC_DEMO_MODE=true` enables read-only public access without GitHub login, using a seeded demo user.

## Step 6: Run Migrations

```bash
npx prisma migrate dev
```

This creates all the database tables defined in the Prisma schema (users, repos, artifacts, candidates, decisions, extraction_costs, sync_operations).

If you see a prompt to name the migration, enter a descriptive name like `init`.

## Step 7: Seed the Database

```bash
npx prisma db seed
```

This populates the database with sample data for demonstration. The seed script is located at `prisma/seed.js`.

## Step 8: Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the login page. Click **Sign in with GitHub** to authenticate through your OAuth app.

## Running Tests

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# All tests (unit + integration + e2e)
npm run test:all

# Watch mode
npm run test:watch

# E2E tests (requires the dev server to be running)
npm run test:e2e
```

## Deployment to Vercel

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Set the **Root Directory** to `code` in Vercel's project settings
4. Add all environment variables in Vercel's dashboard (**Settings → Environment Variables**):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DATABASE_URL` (use your production Supabase connection string)
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `GITHUB_REDIRECT_URI` (update to your Vercel domain: `https://your-app.vercel.app/api/auth/callback`)
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `NEXT_PUBLIC_APP_URL` (your Vercel domain)
   - `NEXT_PUBLIC_DEMO_MODE` (set to `true` for a public demo)
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY` (optional fallback)
5. Deploy — Vercel auto-detects Next.js and handles the build
6. Update your GitHub OAuth app's callback URL to match the Vercel domain
7. After deploy, seed the production database:
   - Set `DATABASE_URL` locally to point to your production Supabase database
   - Run `npx prisma db seed`
   - Revert `DATABASE_URL` back to your local database

## Troubleshooting

### "PrismaClientInitializationError: Can't reach database server"

- Check that your `DATABASE_URL` is correct and includes the right password
- Make sure your Supabase project is active (free tier pauses after 7 days of inactivity)
- Verify the connection string format: `postgresql://postgres:PASSWORD@db.PROJECT-REF.supabase.co:5432/postgres`

### "Module not found" errors on build

- Run `npm install` again
- Delete `node_modules` and `.next`, then reinstall:
  ```bash
  rm -rf node_modules .next && npm install
  ```

### GitHub OAuth errors ("csrf_mismatch", "token_exchange")

- Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct
- Verify `GITHUB_REDIRECT_URI` matches exactly what you set in the GitHub OAuth app settings
- Check that cookies are enabled in your browser (the CSRF state is stored in a cookie)

### Seed script creates duplicates

The seed script should be idempotent, but if you see duplicates, reset with:
```bash
npx prisma migrate reset
```
This drops and recreates all tables, then re-runs the seed.

### LLM extraction returns errors

- Verify `ANTHROPIC_API_KEY` is valid and has available credits
- If Claude fails, the system automatically falls back to GPT-4o (requires `OPENAI_API_KEY`)
- Check the daily extraction limit: 20 extractions per repository per 24-hour period

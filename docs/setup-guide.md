# Setup Guide

## Prerequisites

- Node.js 18 or higher ([download](https://nodejs.org))
- npm
- A Supabase account ([sign up free](https://supabase.com))
- Git

## Step 1: Clone and Install

```bash
git clone https://github.com/[username]/decisionlog.git
cd decisionlog/code
npm install
```

## Step 2: Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose a name, set a database password, and pick a region
4. Wait for provisioning to finish

## Step 3: Get Your Credentials

From Supabase:

1. **Settings → API**
2. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Settings → Database**
5. Copy **Connection string (URI)** → `DATABASE_URL`
6. Replace `[YOUR-PASSWORD]` in the URI with your DB password

## Step 4: Configure Environment Variables

```bash
cp .env.example .env.local
```

Example values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...your-key
DATABASE_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres
NEXT_PUBLIC_DEMO_MODE=true
```

Also configure GitHub OAuth and JWT values from `.env.example`.

## Step 5: Run Migrations

```bash
npx prisma migrate dev
```

## Step 6: Seed the Database

```bash
npx prisma db seed
```

## Step 7: Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment to Vercel

1. Push repo to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set all environment variables from `.env.example`
4. Set `NEXT_PUBLIC_DEMO_MODE=true` for public demo deployments
5. Deploy
6. Seed production DB (using production `DATABASE_URL`) with `npx prisma db seed`

## Troubleshooting

### Prisma cannot reach database
- Confirm `DATABASE_URL` is valid and password is correct
- Confirm Supabase project is active

### Build/module errors
- Reinstall deps: `npm install`
- Clean reinstall: `rm -rf node_modules .next && npm install`

### Seed issues
- Generate and validate Prisma client/migrations first
- If needed, reset local DB:
  ```bash
  npx prisma migrate reset
  ```
  (drops and recreates local tables, then runs seed)

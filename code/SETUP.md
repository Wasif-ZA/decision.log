# decision.log Setup Guide

Complete setup instructions for running decision.log locally or in production.

## Prerequisites

- **Node.js 20+** and npm
- **PostgreSQL 14+** database
- **GitHub OAuth App** (create at [GitHub Settings](https://github.com/settings/developers))
- **Anthropic API Key** (get from [Anthropic Console](https://console.anthropic.com/))
- **OpenAI API Key** (optional fallback, get from [OpenAI Platform](https://platform.openai.com/))

## Quick Start (Local Development)

### 1. Install Dependencies

```bash
cd code
npm install
```

### 2. Set Up Database

Create a PostgreSQL database:

```bash
createdb decisionlog
```

Or using Docker:

```bash
docker run --name decisionlog-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=decisionlog \
  -p 5432:5432 \
  -d postgres:16
```

### 3. Generate Secure Keys

```bash
node scripts/generate-keys.js
```

This will output:
- `JWT_SECRET` (for session tokens)
- `ENCRYPTION_KEY` (for GitHub token encryption)

### 4. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/decisionlog"
JWT_SECRET="<generated-jwt-secret>"
ENCRYPTION_KEY="<generated-encryption-key>"
GITHUB_CLIENT_ID="<your-github-client-id>"
GITHUB_CLIENT_SECRET="<your-github-client-secret>"
GITHUB_REDIRECT_URI="http://localhost:3000/api/auth/callback"
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."  # Optional
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 5. Set Up GitHub OAuth App

1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name:** decision.log (local)
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback`
4. Copy the **Client ID** and generate a **Client Secret**
5. Add them to your `.env` file

### 6. Run Database Migrations

```bash
./scripts/setup-db.sh
```

Or manually:

```bash
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate
npx prisma migrate deploy
```

### 7. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Verification Checklist

After setup, verify everything works:

- [ ] **Homepage loads** at `http://localhost:3000`
- [ ] **GitHub OAuth** redirects correctly
- [ ] **Database connection** successful (check logs)
- [ ] **Session cookie** set after login
- [ ] **API endpoints** respond (try `/api/auth/me`)

## Common Issues

### Prisma Client Generation Fails

```bash
# Try with checksum ignore
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate
```

### Database Connection Refused

```bash
# Check if PostgreSQL is running
psql -U user -d decisionlog -c "SELECT 1"

# Or with Docker
docker ps | grep decisionlog-db
```

### GitHub OAuth Redirect Mismatch

Ensure your GitHub OAuth app's callback URL exactly matches:
```
http://localhost:3000/api/auth/callback
```

### Missing Environment Variables

```bash
# Verify all required vars are set
node -e "require('dotenv').config(); console.log(Object.keys(process.env).filter(k => k.includes('GITHUB') || k.includes('JWT')))"
```

## Production Deployment

### 1. Environment Variables

Set all variables from `.env.example` in your production environment:

```bash
# Required
DATABASE_URL
JWT_SECRET
ENCRYPTION_KEY
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_REDIRECT_URI  # e.g., https://your-domain.com/api/auth/callback
ANTHROPIC_API_KEY
NEXT_PUBLIC_APP_URL  # e.g., https://your-domain.com

# Recommended
NODE_ENV=production
OPENAI_API_KEY
UPSTASH_REDIS_URL
UPSTASH_REDIS_TOKEN
SENTRY_DSN
```

### 2. Database Migrations

```bash
npx prisma migrate deploy
```

### 3. Build Application

```bash
npm run build
```

### 4. Start Production Server

```bash
npm start
```

Or use a process manager:

```bash
pm2 start npm --name "decisionlog" -- start
```

## Database Management

### View Database Schema

```bash
npx prisma studio
```

### Create a Migration

```bash
npx prisma migrate dev --name describe-your-change
```

### Reset Database (⚠️ Deletes all data)

```bash
npx prisma migrate reset
```

### Seed Database (optional)

```bash
npx prisma db seed
```

## Testing

### Run Unit Tests

```bash
npm run test:unit
```

### Run Integration Tests

```bash
npm run test:integration
```

### Run E2E Tests

```bash
npm run test:e2e
```

### Run All Tests

```bash
npm run test:all
```

### Coverage Report

```bash
npm run test:coverage
open coverage/index.html
```

## Architecture

See [TEST_PLAN.md](../TEST_PLAN.md) for detailed system architecture, API contracts, and security model.

## Support

For issues or questions:
1. Check this guide
2. Review [TEST_PLAN.md](../TEST_PLAN.md)
3. Check application logs
4. Open an issue on GitHub

## Security Notes

- **Never commit** `.env` file to version control
- **Rotate keys** regularly in production
- **Use HTTPS** in production (required for secure cookies)
- **Enable rate limiting** with Upstash Redis
- **Monitor costs** via extraction cost logs
- **Review permissions** on GitHub tokens

---

**Last Updated:** 2026-01-11

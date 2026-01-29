#!/bin/bash

# decision.log Database Setup Script
# Sets up PostgreSQL and runs migrations

set -e

echo "🗄️  Setting up decision.log database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable not set"
  echo "Please set DATABASE_URL in your .env file"
  exit 1
fi

# Check if Prisma is installed
if ! command -v npx &> /dev/null; then
  echo "❌ ERROR: npx not found. Please install Node.js and npm"
  exit 1
fi

echo "📦 Generating Prisma client..."
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate

echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Verify your .env file has all required variables"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Visit http://localhost:3000"

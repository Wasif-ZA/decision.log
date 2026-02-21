# DecisionLog

![Next.js](https://img.shields.io/badge/Next.js-000?logo=nextdotjs&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Deployed on Vercel](https://img.shields.io/badge/Vercel-000?logo=vercel&logoColor=white)

Track architecture decisions so your team never loses context.

🔗 **[Live Demo](https://your-vercel-url.vercel.app)** — browse with sample data, no login required

![DecisionLog list view](docs/screenshots/list-view.png)

Teams constantly lose track of why technical decisions were made. When engineers rotate off projects, critical context disappears into old Slack threads, forgotten Confluence pages, or undocumented tribal knowledge. Architecture Decision Records (ADRs) solve this, but existing approaches — markdown files in repos and wiki pages — are hard to search, lack version history, and have no structured metadata. DecisionLog provides a dedicated tool for creating, tracking, and searching ADRs with full version history and impact assessments.

## Features
- Full-text fuzzy search — find past decisions in seconds
- Version history — see how a decision evolved from proposal to acceptance
- Stakeholder tagging — know who was involved in each decision
- Impact assessments — rate decisions on performance, security, DX, and cost
- Filter by status, tag, stakeholder, or date range

### Detail View
![ADR detail view](docs/screenshots/detail-view.png)

### Version History
![Version history](docs/screenshots/version-history.png)

### Search
![Search results](docs/screenshots/search-results.png)

## Tech Stack
- **Next.js** (App Router) — React framework with server components
- **Supabase** — PostgreSQL database, auth, and real-time subscriptions
- **Prisma** — Type-safe ORM and migrations
- **Tailwind CSS** — Utility-first styling
- **Vercel** — Deployment and hosting

## Getting Started

**Prerequisites:** Node.js 18+, a free [Supabase](https://supabase.com) account

1. Clone the repo
   ```bash
   git clone https://github.com/[username]/decisionlog.git
   cd decisionlog
   ```
2. Install dependencies
   ```bash
   cd code
   npm install
   ```
3. Set up environment variables
   ```bash
   cp .env.example .env.local
   # Fill in your Supabase URL, anon key, and database URL
   ```
4. Run database migrations and seed
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```
5. Start the dev server
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```text
code/
├── app/          # Next.js App Router — pages, layouts, API routes
├── components/   # Reusable UI components
├── lib/          # Utilities, auth helpers, and shared logic
├── prisma/
│   ├── schema.prisma # Database schema
│   ├── seed.js       # Mock data seed script
│   └── migrations/   # Prisma migration files
└── docs/             # Existing in-app documentation assets

docs/
├── architecture.md    # System architecture and design decisions
├── database-schema.md # Full database schema documentation
├── api-routes.md      # API route reference
├── setup-guide.md     # Detailed setup and deployment guide
└── screenshots/       # App screenshots for README
```

## Documentation

For detailed docs on architecture, database schema, API routes, and deployment, see the [docs/](docs/) folder.

## Roadmap
- Slack/Teams notifications when a decision changes status
- Export to markdown (compatible with adr-tools)
- Team permissions and role-based access
- Decision templates for common decision types
- AI-assisted drafting — suggest consequences based on context

## License

MIT

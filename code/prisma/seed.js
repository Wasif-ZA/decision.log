// ===========================================
// DecisionLog Seed Script
// ===========================================
//
// Populates the database with realistic demo data:
// - 1 demo user + 1 demo repo
// - 16 extracted decisions (with artifacts + candidates)
// - 5 pending candidates (visible on /candidates page)
// - Sync operations and extraction cost records
//
// Idempotent: safe to run multiple times.
// Usage: npx prisma db seed

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────
// Stakeholders
// ─────────────────────────────────────────────

const STAKEHOLDERS = {
  sarah: 'Sarah Chen — Backend Lead',
  marcus: 'Marcus Rivera — DevOps Engineer',
  priya: 'Priya Patel — Product Manager',
  james: "James O'Brien — Frontend Lead",
  aisha: 'Aisha Kwame — Security Engineer',
  tom: 'Tom Nakamura — Engineering Manager',
  elena: 'Elena Voss — Staff Engineer',
  raj: 'Raj Mehta — Platform Engineer',
};

// ─────────────────────────────────────────────
// Extracted ADR data (become Decision records)
// ─────────────────────────────────────────────

const ADRS = [
  {
    title: 'Use PostgreSQL over MongoDB for primary datastore',
    status: 'accepted',
    tags: ['database', 'architecture', 'backend'],
    stakeholders: [STAKEHOLDERS.sarah, STAKEHOLDERS.priya, STAKEHOLDERS.elena],
    impact: { performance: 'high', security: 'medium', developerExperience: 'high', cost: 'medium' },
    context:
      "decision.log needs relational queries across users, repos, candidates, decisions, extraction costs, and sync operations. During our spike, MongoDB required denormalizing candidate/artifact links and made ownership checks harder to reason about. We also needed predictable transactional behavior for sync + extraction jobs.",
    decision:
      'We standardized on PostgreSQL as the primary datastore and model layer behind Prisma. This gives us strong relational integrity, transactional updates, and easier querying for timeline/export screens. It also aligns with managed Postgres offerings used in deployment.',
    reasoning:
      'Sarah Chen led a two-week evaluation comparing PostgreSQL and MongoDB across sync, extraction, and analytics workloads. The relational model matched our access patterns far better, and Priya Patel confirmed that compliance reporting required consistent transactional guarantees.',
    consequences:
      'We gain safer schema evolution and clearer data constraints, but we must maintain migrations and enforce migration discipline across branches. Query performance tuning becomes a first-class engineering responsibility as data volume grows.',
    alternatives:
      'MongoDB was evaluated for its flexible document model but required denormalization across candidate/artifact boundaries. DynamoDB was briefly considered but rejected due to complex access patterns and limited local development tooling.',
    versions: [
      'v1 Proposed: Evaluate PostgreSQL and MongoDB against sync and analytics workloads',
      'v2 Under Review: Prefer PostgreSQL pending query benchmark results',
      'v3 Accepted: Use PostgreSQL over MongoDB for primary datastore',
    ],
  },
  {
    title: 'Adopt Next.js App Router over Pages Router',
    status: 'accepted',
    tags: ['frontend', 'architecture', 'developer-experience'],
    stakeholders: [STAKEHOLDERS.james, STAKEHOLDERS.priya, STAKEHOLDERS.tom],
    impact: { performance: 'medium', security: 'low', developerExperience: 'high', cost: 'low' },
    context:
      'We needed clear separation between public/login routes, setup flow routes, and protected app routes. The Pages Router implementation duplicated guard logic and made layout composition brittle. Our team asked for a routing model that matches nested product areas.',
    decision:
      'We chose App Router and route groups to partition public/setup/app experiences while preserving shared shell primitives. This lets us compose middleware and layouts more cleanly and reduces route-level boilerplate over time.',
    reasoning:
      "James O'Brien prototyped route groups for auth/setup/app boundaries and demonstrated 40% less duplication in layout code. Tom Nakamura approved after confirming the team could absorb the App Router learning curve within the current sprint.",
    consequences:
      'We gain better structure for nested layouts and future feature slicing. The downside is a steeper learning curve for newer contributors and tighter coupling to current Next.js conventions.',
    alternatives:
      'Keeping Pages Router with custom HOC wrappers for auth and layout was the alternative. Remix was considered but rejected due to ecosystem maturity concerns and migration cost from existing Next.js infrastructure.',
    versions: [
      'v1 Proposed: Keep Pages Router and add custom route wrappers',
      'v2 Under Review: Prototype App Router route groups for auth/setup/app',
      'v3 Accepted: Adopt Next.js App Router over Pages Router',
    ],
  },
  {
    title: 'Use Tailwind CSS over styled-components',
    status: 'accepted',
    tags: ['frontend', 'tooling', 'developer-experience'],
    stakeholders: [STAKEHOLDERS.james, STAKEHOLDERS.priya],
    impact: { performance: 'medium', security: 'low', developerExperience: 'high', cost: 'low' },
    context:
      'UI work was slowing down because component-level CSS patterns were inconsistent and review comments were mostly about styling conventions. We wanted a shared design vocabulary that helped us move faster while keeping UI coherent. Performance concerns around runtime style generation also came up.',
    decision:
      'We selected Tailwind CSS for utility-first styling and design token consistency across pages and components. This approach keeps style decisions close to markup and reduces context-switching between TSX and stylesheet files.',
    reasoning:
      "James O'Brien benchmarked Tailwind versus styled-components on the DecisionCard component. Tailwind eliminated runtime CSS injection and reduced bundle size by ~18KB. Priya Patel noted faster design review cycles since styles were visible inline.",
    consequences:
      'We get faster UI iteration and lower styling drift. We accept larger class strings in JSX and a requirement to maintain Tailwind conventions/documentation.',
    alternatives:
      'styled-components was the incumbent but added runtime overhead. CSS Modules were considered as a middle ground but lacked the design token consistency Tailwind provides out of the box.',
  },
  {
    title: 'Deploy on Vercel over AWS ECS',
    status: 'accepted',
    tags: ['infrastructure', 'devops'],
    stakeholders: [STAKEHOLDERS.marcus, STAKEHOLDERS.tom, STAKEHOLDERS.priya],
    impact: { performance: 'medium', security: 'medium', developerExperience: 'high', cost: 'medium' },
    context:
      'For this stage of the project we prioritized fast iterations, low ops overhead, and frictionless preview environments. ECS gave us more flexibility but introduced extra setup burden for networking, scaling policies, and deployment pipelines. Team feedback favored simplicity during product validation.',
    decision:
      'We deploy on Vercel to optimize speed of delivery and reduce platform management overhead. Managed deployments and preview workflows fit our current team size and cadence better than maintaining custom ECS infrastructure.',
    reasoning:
      'Marcus Rivera estimated 3 weeks of ECS setup versus same-day Vercel deployment. Tom Nakamura prioritized shipping velocity during product validation phase. The team agreed to revisit when monthly active users exceed 10K.',
    consequences:
      'We move faster with less DevOps toil and simpler previews. We trade away some infrastructure flexibility and may revisit this if traffic patterns or compliance constraints change.',
    alternatives:
      'AWS ECS with Fargate was the primary alternative, offering more control over scaling and networking. Railway and Fly.io were also evaluated but lacked the Next.js-specific optimizations Vercel provides.',
  },
  {
    title: 'Use Prisma ORM over raw SQL queries',
    status: 'accepted',
    tags: ['backend', 'database', 'developer-experience'],
    stakeholders: [STAKEHOLDERS.sarah, STAKEHOLDERS.raj],
    impact: { performance: 'medium', security: 'medium', developerExperience: 'high', cost: 'low' },
    context:
      'Our schema has many linked entities and frequent relation traversals. Raw SQL prototypes worked, but adding features required repetitive query plumbing and increased risk of drift between models and query logic. We wanted stronger type safety in API route implementations.',
    decision:
      'We adopted Prisma for schema-first modeling, generated client types, and consistent data access patterns. This standardizes CRUD/query code and improves confidence when evolving the schema.',
    reasoning:
      'Sarah Chen identified three instances of raw SQL drift during the prototype phase where query logic diverged from the intended schema. Raj Mehta confirmed Prisma Client generation caught type mismatches at build time that raw SQL missed until runtime.',
    consequences:
      'We gain maintainability and safer refactors, but we need to watch query plans and occasionally drop to raw SQL for advanced cases. Prisma version upgrades become part of routine platform maintenance.',
    alternatives:
      'Drizzle ORM was evaluated for its lighter abstraction but lacked Prisma\'s migration tooling maturity. Knex.js was considered as a query builder but did not provide the type generation we needed.',
  },
  {
    title: 'Adopt trunk-based development over GitFlow',
    status: 'accepted',
    tags: ['developer-experience', 'tooling'],
    stakeholders: [STAKEHOLDERS.tom, STAKEHOLDERS.elena, STAKEHOLDERS.priya],
    impact: { performance: 'low', security: 'low', developerExperience: 'high', cost: 'low' },
    context:
      'Long-lived branches repeatedly caused merge friction and delayed bug fixes. Feature work sat unmerged while dependent changes stacked, which made releases riskier. The team asked for a workflow that favors small, reviewable increments.',
    decision:
      'We chose trunk-based development with short-lived feature branches and frequent integration. CI checks and targeted feature flags cover risk without maintaining parallel release branch complexity.',
    reasoning:
      'Elena Voss analyzed the last quarter of merge conflicts and found 60% originated from branches older than 5 days. Tom Nakamura enforced a max 2-day branch lifetime policy with CI gating to keep trunk stable.',
    consequences:
      'We get faster feedback cycles and simpler release coordination. This requires strict CI discipline and smaller PR culture to keep trunk stable.',
    alternatives:
      'GitFlow was the existing workflow but created friction for a team of our size. GitHub Flow (long-lived feature branches with PRs) was considered but still risked the stale-branch problem we were trying to solve.',
  },
  {
    title: 'Implement event-driven architecture for notifications',
    status: 'proposed',
    tags: ['architecture', 'backend', 'infrastructure'],
    stakeholders: [STAKEHOLDERS.raj, STAKEHOLDERS.priya, STAKEHOLDERS.sarah],
    impact: { performance: 'medium', security: 'medium', developerExperience: 'medium', cost: 'medium' },
    context:
      'Notification side effects are currently coupled to synchronous API flows, increasing latency and failure blast radius. We observed cases where non-critical notifications delayed user-facing requests. Product wants more channels without slowing core operations.',
    decision:
      'Proposal is to publish domain events and process notifications asynchronously via dedicated workers. This decouples critical user flows from downstream delivery retries and channel-specific logic.',
    reasoning:
      'Raj Mehta traced a 400ms P95 latency increase to inline Slack webhook calls during sync completion. Sarah Chen proposed an event bus pattern that would isolate notification failures from the critical sync path.',
    consequences:
      'Potential upside is lower request latency and cleaner extensibility. Downside is added operational complexity for queue observability, retries, and dead-letter handling.',
    alternatives:
      'Keeping inline notifications with circuit breakers was considered but only addresses failure isolation, not latency. A cron-based digest approach was proposed but doesn\'t meet real-time notification requirements.',
  },
  {
    title: 'Implement feature flags with LaunchDarkly',
    status: 'proposed',
    tags: ['tooling', 'developer-experience', 'architecture'],
    stakeholders: [STAKEHOLDERS.priya, STAKEHOLDERS.tom, STAKEHOLDERS.james],
    impact: { performance: 'low', security: 'low', developerExperience: 'high', cost: 'medium' },
    context:
      'We currently use branch toggles and manual deploy timing to control rollout risk. This makes experimentation and partial rollouts harder and complicates incident rollback. PM and engineering requested safer progressive delivery controls.',
    decision:
      'Proposal is to integrate LaunchDarkly for server/client feature evaluation with explicit flag lifecycles. This should reduce release anxiety and allow cohort-based validation before broad rollout.',
    reasoning:
      'Priya Patel documented three cases where deploy-time feature control would have prevented user-facing regressions. Tom Nakamura evaluated LaunchDarkly, Unleash, and Flagsmith and found LaunchDarkly best fit the team\'s Next.js server/client rendering split.',
    consequences:
      'We gain controlled rollout and faster rollback paths. We incur vendor cost and need governance to prevent stale flags from accumulating.',
    alternatives:
      'Unleash (open-source) was considered but requires self-hosting infrastructure. Environment-variable based flags are the current approach but lack targeting and analytics capabilities.',
  },
  {
    title: 'Implement RBAC over simple role checks',
    status: 'under-review',
    tags: ['security', 'backend', 'architecture'],
    stakeholders: [STAKEHOLDERS.aisha, STAKEHOLDERS.sarah, STAKEHOLDERS.priya],
    impact: { performance: 'low', security: 'high', developerExperience: 'medium', cost: 'medium' },
    context:
      'Current checks are coarse and scattered, which risks authorization drift as features expand. Security review identified permission paths that are hard to audit and test. We need policy-based control that scales with project/repo boundaries.',
    decision:
      'Under review: move to RBAC with explicit permissions and centralized enforcement helpers in API routes. This should make access logic auditable and easier to evolve than ad-hoc role booleans.',
    reasoning:
      'Aisha Kwame identified 8 API routes with inconsistent authorization logic during a security audit. Sarah Chen proposed a middleware-based permission system that would centralize checks and produce audit logs automatically.',
    consequences:
      'Improved least-privilege controls and auditability are expected. Migration will touch many routes and require thorough regression tests.',
    alternatives:
      'Continuing with scattered role checks was rejected due to audit findings. Attribute-based access control (ABAC) was considered too complex for current team size and product scope.',
    versions: [
      'v1 Proposed: Add admin/user role distinction',
      'v2 Under Review: Implement RBAC over simple role checks',
    ],
  },
  {
    title: 'Adopt monorepo structure with Turborepo',
    status: 'under-review',
    tags: ['tooling', 'architecture', 'developer-experience'],
    stakeholders: [STAKEHOLDERS.raj, STAKEHOLDERS.tom, STAKEHOLDERS.elena],
    impact: { performance: 'low', security: 'low', developerExperience: 'medium', cost: 'medium' },
    context:
      'As integrations grow, we expect shared packages for SDKs, schema contracts, and worker code. Managing these in separate repos may increase version drift and release coordination overhead. We are evaluating whether monorepo tooling would reduce this friction.',
    decision:
      'Under review: consolidate app and shared packages under Turborepo with caching-aware CI. This may improve consistency and dependency management if repository boundaries remain clear.',
    reasoning:
      'Raj Mehta demonstrated a Turborepo prototype that reduced CI times by 35% via remote caching. Elena Voss noted that shared schema packages would eliminate the current copy-paste pattern for type definitions across services.',
    consequences:
      'Potential gains include shared tooling and coherent versioning. Potential costs include larger CI complexity and repository onboarding overhead.',
    alternatives:
      'Nx was evaluated as an alternative monorepo tool but adds more framework opinions than the team wants. Keeping separate repos with a shared npm package registry was considered but doesn\'t solve the version drift problem.',
  },
  {
    title: 'Migrate from REST to GraphQL for mobile API',
    status: 'deprecated',
    tags: ['backend', 'architecture'],
    stakeholders: [STAKEHOLDERS.sarah, STAKEHOLDERS.priya],
    impact: { performance: 'medium', security: 'medium', developerExperience: 'low', cost: 'medium' },
    context:
      'A previous plan proposed a GraphQL gateway for mobile clients to reduce endpoint churn. During implementation planning, we found schema governance and caching strategy would materially increase near-term complexity. Mobile requirements also stabilized enough to avoid urgent API shape changes.',
    decision:
      'We are deprecating the GraphQL migration proposal for now and continuing with focused REST improvements. This keeps delivery scope manageable while preserving optionality for future graph needs.',
    reasoning:
      'Sarah Chen estimated 6 weeks for a production-ready GraphQL layer including auth, caching, and schema governance. Priya Patel confirmed mobile API requirements had stabilized and the effort was no longer justified by product needs.',
    consequences:
      'Short-term complexity is reduced and current roadmap remains intact. We lose GraphQL-specific ergonomics until a stronger product need emerges.',
    alternatives:
      'Apollo Federation was the leading GraphQL implementation option. tRPC was briefly discussed as a typed RPC alternative but doesn\'t solve the mobile client use case.',
  },
  {
    title: 'Use Redis for session management',
    status: 'superseded',
    tags: ['security', 'infrastructure', 'backend'],
    stakeholders: [STAKEHOLDERS.aisha, STAKEHOLDERS.marcus, STAKEHOLDERS.raj],
    impact: { performance: 'medium', security: 'medium', developerExperience: 'medium', cost: 'medium' },
    context:
      'An early design considered central session storage in Redis for revocation support and multi-instance consistency. As auth architecture evolved, token-based sessions became simpler to operate with our current scale and deployment topology.',
    decision:
      'This decision is superseded by signed JWT session cookies with short expiry and rotation policies. We retain Redis as an optional future enhancement for advanced revocation requirements.',
    reasoning:
      'Aisha Kwame confirmed that JWT with 24-hour expiry and refresh rotation meets security requirements at current scale. Marcus Rivera estimated Redis would add $50/month infrastructure cost with no immediate security benefit over JWT cookies.',
    consequences:
      'We reduce infrastructure dependencies and keep auth implementation lean. Immediate revocation controls are weaker than fully stateful session stores.',
    alternatives:
      'Redis Cluster was the original proposal for distributed session storage. Database-backed sessions via Prisma were also considered but added query overhead per request.',
    versions: [
      'v1 Proposed: Use Redis for session management',
      'v2 Superseded: Use JWT session cookies with signed tokens',
    ],
  },
  {
    title: 'Store only first 100KB of PR diffs for artifacts',
    status: 'accepted',
    tags: ['architecture', 'performance', 'cost'],
    stakeholders: [STAKEHOLDERS.raj, STAKEHOLDERS.sarah, STAKEHOLDERS.marcus],
    impact: { performance: 'high', security: 'low', developerExperience: 'medium', cost: 'high' },
    context:
      'Large pull requests were increasing storage costs and slowing extraction jobs when full diffs were retained. Most architectural signal appears near titles, descriptions, and key changed files, not every line in huge generated patches.',
    decision:
      'We cap persisted diff content at ~100KB per artifact while still storing file/addition/deletion metadata. This preserves enough context for candidate scoring and extraction without unbounded payload growth.',
    reasoning:
      'Raj Mehta analyzed diff sizes across 500 PRs and found 95% of architectural signal was in the first 100KB. Sarah Chen confirmed extraction quality was statistically identical with truncated versus full diffs across a 50-PR test set.',
    consequences:
      'Database and extraction costs stay predictable. Rare edge cases may lose deep context for very large decisions and require fetching full diff on demand.',
    alternatives:
      'Storing full diffs with lazy loading was considered but database storage costs scaled linearly. Storing only file metadata without diffs was too aggressive and reduced extraction quality by 30%.',
  },
  {
    title: 'Adopt sieve-based candidate scoring before LLM extraction',
    status: 'accepted',
    tags: ['architecture', 'backend', 'cost', 'tooling'],
    stakeholders: [STAKEHOLDERS.elena, STAKEHOLDERS.sarah, STAKEHOLDERS.priya],
    impact: { performance: 'high', security: 'low', developerExperience: 'medium', cost: 'high' },
    context:
      'Running extraction on every PR/commit created unnecessary spend and noisy outputs. We needed a deterministic pre-filter to prioritize likely architectural changes and reject routine dependency churn.',
    decision:
      'We use sieve scoring to rank artifacts and only extract from candidates above configurable thresholds. Score breakdown metadata is stored for debugging and tuning.',
    reasoning:
      'Elena Voss designed the scoring algorithm using commit message patterns, file path analysis, and diff complexity metrics. Priya Patel validated that the 0.4 threshold captured 92% of manually tagged architectural decisions while filtering 78% of noise.',
    consequences:
      'Token usage is reduced and extraction quality improves. There is risk of false negatives for subtle architectural changes, requiring periodic threshold calibration.',
    alternatives:
      'Extracting from every merged PR was the initial approach but cost $12/day per active repo. A keyword-based filter was prototyped but had high false-negative rates for decisions phrased in non-standard ways.',
    versions: [
      'v1 Proposed: Extract from every merged PR',
      'v2 Under Review: Add heuristic filtering for noisy changes',
      'v3 Accepted: Adopt sieve-based candidate scoring before extraction',
    ],
  },
  {
    title: 'Enforce extraction cost governor per repository',
    status: 'accepted',
    tags: ['cost', 'backend', 'tooling'],
    stakeholders: [STAKEHOLDERS.priya, STAKEHOLDERS.tom, STAKEHOLDERS.raj],
    impact: { performance: 'medium', security: 'low', developerExperience: 'medium', cost: 'high' },
    context:
      'Usage spikes during initial sync could trigger expensive extraction bursts. Finance feedback requested clearer safeguards and visibility around model spend by repo.',
    decision:
      'We enforce cost and batch guardrails in the extraction governor, and persist extraction cost records for auditability. This supports predictable spend while still allowing meaningful coverage.',
    reasoning:
      'Priya Patel reported a $47 spike during a single initial sync of a large repository. Tom Nakamura set a 20-extraction daily limit per repo as a default ceiling. Raj Mehta implemented per-repo cost tracking to support reporting.',
    consequences:
      'Cost risk is significantly reduced and reporting improves. Users may see delayed extraction for large repos when budgets are temporarily exhausted.',
    alternatives:
      'A global daily budget across all repos was considered but penalized active repos when idle repos consumed no budget. Per-user limits were rejected because team repos would require coordinated budgeting.',
  },
  {
    title: 'Use proxy middleware for route protection and setup gating',
    status: 'accepted',
    tags: ['security', 'architecture', 'frontend'],
    stakeholders: [STAKEHOLDERS.aisha, STAKEHOLDERS.james, STAKEHOLDERS.sarah],
    impact: { performance: 'low', security: 'high', developerExperience: 'medium', cost: 'low' },
    context:
      'Route-level auth checks were being duplicated and occasionally drifted across pages. Setup completion checks were also inconsistent, causing confusing redirects for newly authenticated users.',
    decision:
      'We centralized protection and setup gating in middleware/proxy logic with a shared session-cookie contract. This consolidates redirects and reduces accidental public exposure of protected screens.',
    reasoning:
      "Aisha Kwame found 4 pages that could be accessed without proper auth due to inconsistent guard implementations. James O'Brien proposed centralizing all route protection in a single middleware layer that reads the session cookie and enforces redirect rules.",
    consequences:
      'Authorization flows become more predictable and secure. Middleware mistakes can affect broad navigation paths, so regression coverage is essential.',
    alternatives:
      'Per-page auth HOCs were the existing approach but had drift issues. Next.js middleware was considered but operates at the edge and cannot access the database directly for session validation.',
  },
];

// ─────────────────────────────────────────────
// Pending candidates (shown on /candidates page)
// ─────────────────────────────────────────────

const PENDING_CANDIDATES = [
  {
    title: 'Add OpenTelemetry tracing to sync pipeline',
    author: 'Raj Mehta',
    body: 'Introduces distributed tracing spans across fetch, sieve, and extract phases. This PR adds @opentelemetry/sdk-node and configures OTLP export to Grafana Cloud. Allows us to identify bottlenecks in the sync pipeline and correlate extraction latency with specific artifact characteristics.',
    sieveScore: 0.82,
    scoreBreakdown: { commitScore: 0.78, prScore: 0.85, diffScore: 0.83, details: 'High architectural signal: observability infrastructure' },
    filesChanged: 14,
    additions: 340,
    deletions: 22,
  },
  {
    title: 'Refactor extraction client to support streaming responses',
    author: 'Sarah Chen',
    body: 'Switches the LLM extraction client from batch completion to streaming mode. Reduces time-to-first-token visibility and allows progressive parsing of structured ADR output. Includes fallback to non-streaming mode for models that do not support it.',
    sieveScore: 0.76,
    scoreBreakdown: { commitScore: 0.72, prScore: 0.80, diffScore: 0.75, details: 'Moderate architectural signal: API client redesign' },
    filesChanged: 8,
    additions: 185,
    deletions: 67,
  },
  {
    title: 'Implement webhook-based real-time sync trigger',
    author: 'Marcus Rivera',
    body: 'Adds a GitHub webhook endpoint that triggers incremental sync when PRs are merged. Replaces the current manual sync button for repositories that have webhooks installed. Includes HMAC signature verification and idempotent processing.',
    sieveScore: 0.88,
    scoreBreakdown: { commitScore: 0.85, prScore: 0.90, diffScore: 0.88, details: 'High architectural signal: new integration pattern' },
    filesChanged: 11,
    additions: 290,
    deletions: 15,
  },
  {
    title: 'Add rate limiting middleware with sliding window',
    author: 'Aisha Kwame',
    body: 'Implements per-user and per-IP rate limiting using a sliding window algorithm backed by in-memory counters. Configurable limits per route group. Returns standard 429 responses with Retry-After headers. Designed to work without external dependencies.',
    sieveScore: 0.71,
    scoreBreakdown: { commitScore: 0.65, prScore: 0.78, diffScore: 0.70, details: 'Moderate architectural signal: security middleware' },
    filesChanged: 6,
    additions: 155,
    deletions: 8,
  },
  {
    title: 'Migrate decision search to PostgreSQL full-text search',
    author: 'Elena Voss',
    body: 'Replaces case-insensitive LIKE queries with PostgreSQL tsvector-based full-text search. Adds a generated tsvector column to the decisions table with GIN index. Supports ranked results and prefix matching. Improves search performance by ~10x on large decision sets.',
    sieveScore: 0.79,
    scoreBreakdown: { commitScore: 0.75, prScore: 0.82, diffScore: 0.80, details: 'High architectural signal: search infrastructure change' },
    filesChanged: 9,
    additions: 210,
    deletions: 45,
  },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function monthsAgo(months, day = 1) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(day);
  d.setHours(12, 0, 0, 0);
  return d;
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10 + (days % 8), (days * 17) % 60, 0, 0);
  return d;
}

function personName(stakeholder) {
  return stakeholder.split(' — ')[0];
}

const EXTRACTION_MODELS = ['claude-sonnet-4', 'claude-sonnet-4', 'gpt-4o', 'claude-sonnet-4', 'claude-sonnet-4'];

// ─────────────────────────────────────────────
// Main seed function
// ─────────────────────────────────────────────

async function main() {
  // ── Demo User ──────────────────────────────
  const demoUser = await prisma.user.upsert({
    where: { login: 'demo-viewer' },
    update: { name: 'DecisionLog Demo User', email: 'demo@decisionlog.dev' },
    create: {
      login: 'demo-viewer',
      githubId: 90000001,
      name: 'DecisionLog Demo User',
      email: 'demo@decisionlog.dev',
      avatarUrl: 'https://avatars.githubusercontent.com/u/90000001',
    },
  });

  // ── Demo Repository ────────────────────────
  const repo = await prisma.repo.upsert({
    where: { fullName: 'decisionlog/demo-architecture' },
    update: {
      enabled: true,
      defaultBranch: 'main',
      userId: demoUser.id,
      syncStatus: 'idle',
      lastSyncAt: daysAgo(1),
    },
    create: {
      githubId: 91000001,
      owner: 'decisionlog',
      name: 'demo-architecture',
      fullName: 'decisionlog/demo-architecture',
      private: false,
      defaultBranch: 'main',
      enabled: true,
      userId: demoUser.id,
      syncStatus: 'idle',
      lastSyncAt: daysAgo(1),
    },
  });

  // ── Seed extracted ADRs ────────────────────
  let seededAdrs = 0;
  let seededVersions = 0;

  for (let i = 0; i < ADRS.length; i += 1) {
    const adr = ADRS[i];
    // Spread dates across 6 months, with realistic variation
    const authoredAt = monthsAgo(6 - Math.floor(i / 3), (i * 3 + 2) % 28 + 1);
    const extractedAt = new Date(authoredAt.getTime() + (2 + (i % 5)) * 24 * 60 * 60 * 1000);
    const model = EXTRACTION_MODELS[i % EXTRACTION_MODELS.length];

    // Vary significance realistically
    const significance = [0.92, 0.85, 0.78, 0.88, 0.73, 0.65, 0.81, 0.69, 0.87, 0.74, 0.56, 0.63, 0.91, 0.95, 0.83, 0.77][i];

    const artifact = await prisma.artifact.upsert({
      where: {
        repoId_githubId_type: {
          repoId: repo.id,
          githubId: String(92000000 + i),
          type: 'pr',
        },
      },
      update: {
        title: adr.title,
        authoredAt,
        mergedAt: authoredAt,
        body: adr.context.slice(0, 200) + '...',
      },
      create: {
        repoId: repo.id,
        githubId: String(92000000 + i),
        type: 'pr',
        url: `https://github.com/decisionlog/demo-architecture/pull/${100 + i}`,
        branch: 'main',
        title: adr.title,
        author: personName(adr.stakeholders[0]),
        authoredAt,
        mergedAt: authoredAt,
        body: adr.context.slice(0, 200) + '...',
        diff: 'Seeded diff placeholder (trimmed by design).',
        filesChanged: 6 + (i % 12),
        additions: 60 + i * 13,
        deletions: 8 + i * 3,
      },
    });

    const candidate = await prisma.candidate.upsert({
      where: { artifactId: artifact.id },
      update: {
        sieveScore: significance,
        status: 'extracted',
        extractedAt,
      },
      create: {
        repoId: repo.id,
        artifactId: artifact.id,
        userId: demoUser.id,
        sieveScore: significance,
        scoreBreakdown: {
          commitScore: +(significance - 0.05 + Math.random() * 0.1).toFixed(2),
          prScore: +(significance + 0.02 + Math.random() * 0.06).toFixed(2),
          diffScore: +(significance - 0.02 + Math.random() * 0.08).toFixed(2),
          details: `Candidate for: ${adr.title}`,
        },
        status: 'extracted',
        extractedAt,
      },
    });

    await prisma.decision.upsert({
      where: { candidateId: candidate.id },
      update: {
        title: adr.title,
        context: adr.context,
        decision: adr.decision,
        reasoning: adr.reasoning,
        consequences: adr.consequences,
        alternatives: adr.alternatives || null,
        tags: [...adr.tags, `status:${adr.status}`],
        significance,
        extractedBy: model,
      },
      create: {
        repoId: repo.id,
        candidateId: candidate.id,
        userId: demoUser.id,
        title: adr.title,
        context: adr.context,
        decision: adr.decision,
        reasoning: adr.reasoning,
        consequences: adr.consequences,
        alternatives: adr.alternatives || null,
        tags: [...adr.tags, `status:${adr.status}`],
        significance,
        extractedBy: model,
        rawResponse: {
          status: adr.status,
          stakeholders: adr.stakeholders,
          impactAssessment: adr.impact,
          versionNotes: adr.versions || [],
        },
        createdAt: extractedAt,
      },
    });

    seededAdrs += 1;
    if (adr.versions && adr.versions.length > 1) seededVersions += 1;
  }

  // ── Seed pending candidates ────────────────
  let seededPending = 0;

  for (let i = 0; i < PENDING_CANDIDATES.length; i += 1) {
    const pc = PENDING_CANDIDATES[i];
    const prNumber = 200 + i;
    const authoredAt = daysAgo(3 + i * 2);

    const artifact = await prisma.artifact.upsert({
      where: {
        repoId_githubId_type: {
          repoId: repo.id,
          githubId: String(93000000 + i),
          type: 'pr',
        },
      },
      update: {
        title: pc.title,
        authoredAt,
        mergedAt: authoredAt,
        body: pc.body,
      },
      create: {
        repoId: repo.id,
        githubId: String(93000000 + i),
        type: 'pr',
        url: `https://github.com/decisionlog/demo-architecture/pull/${prNumber}`,
        branch: 'main',
        title: pc.title,
        author: pc.author,
        authoredAt,
        mergedAt: authoredAt,
        body: pc.body,
        diff: 'Seeded diff placeholder (trimmed by design).',
        filesChanged: pc.filesChanged,
        additions: pc.additions,
        deletions: pc.deletions,
      },
    });

    await prisma.candidate.upsert({
      where: { artifactId: artifact.id },
      update: {
        sieveScore: pc.sieveScore,
        status: 'pending',
      },
      create: {
        repoId: repo.id,
        artifactId: artifact.id,
        userId: demoUser.id,
        sieveScore: pc.sieveScore,
        scoreBreakdown: pc.scoreBreakdown,
        status: 'pending',
      },
    });

    seededPending += 1;
  }

  // ── Seed sync operations ───────────────────
  const syncDates = [daysAgo(1), daysAgo(7), daysAgo(14), daysAgo(30)];
  for (let i = 0; i < syncDates.length; i += 1) {
    await prisma.syncOperation.create({
      data: {
        userId: demoUser.id,
        repoId: repo.id,
        status: i === 0 ? 'success' : i === 2 ? 'partial' : 'success',
        startedAt: syncDates[i],
        completedAt: new Date(syncDates[i].getTime() + 45000 + i * 15000),
        fetchedCount: 12 + i * 4,
        sievedCount: 5 + i * 2,
        extractedCount: 3 + i,
        errorCount: i === 2 ? 1 : 0,
        errorMessage: i === 2 ? 'Rate limit exceeded for 1 artifact' : null,
        startCursor: `cursor_${100 + i * 10}`,
        endCursor: `cursor_${110 + i * 10}`,
      },
    });
  }

  // ── Seed extraction costs ──────────────────
  for (let i = 0; i < 6; i += 1) {
    await prisma.extractionCost.create({
      data: {
        userId: demoUser.id,
        repoId: repo.id,
        model: i % 3 === 0 ? 'gpt-4o' : 'claude-sonnet-4',
        inputTokens: 2800 + i * 350,
        outputTokens: 800 + i * 120,
        totalCost: +(0.008 + i * 0.003).toFixed(4),
        batchSize: 1 + (i % 3),
        candidateIds: [`seed-candidate-${i}`],
        extractedAt: daysAgo(i * 5 + 1),
      },
    });
  }

  // ── Summary ────────────────────────────────
  console.log(
    `✅ Seeded: ${seededAdrs} extracted ADRs, ${seededPending} pending candidates, ` +
    `${Object.keys(STAKEHOLDERS).length} stakeholders, ${seededVersions} versioned ADR groups, ` +
    `${syncDates.length} sync operations, 6 extraction cost records`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
    consequences:
      'We gain safer schema evolution and clearer data constraints, but we must maintain migrations and enforce migration discipline across branches. Query performance tuning becomes a first-class engineering responsibility as data volume grows.',
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
    consequences:
      'We gain better structure for nested layouts and future feature slicing. The downside is a steeper learning curve for newer contributors and tighter coupling to current Next.js conventions.',
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
    consequences:
      'We get faster UI iteration and lower styling drift. We accept larger class strings in JSX and a requirement to maintain Tailwind conventions/documentation.',
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
    consequences:
      'We move faster with less DevOps toil and simpler previews. We trade away some infrastructure flexibility and may revisit this if traffic patterns or compliance constraints change.',
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
    consequences:
      'We gain maintainability and safer refactors, but we need to watch query plans and occasionally drop to raw SQL for advanced cases. Prisma version upgrades become part of routine platform maintenance.',
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
    consequences:
      'We get faster feedback cycles and simpler release coordination. This requires strict CI discipline and smaller PR culture to keep trunk stable.',
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
    consequences:
      'Potential upside is lower request latency and cleaner extensibility. Downside is added operational complexity for queue observability, retries, and dead-letter handling.',
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
    consequences:
      'We gain controlled rollout and faster rollback paths. We incur vendor cost and need governance to prevent stale flags from accumulating.',
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
    consequences:
      'Improved least-privilege controls and auditability are expected. Migration will touch many routes and require thorough regression tests.',
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
    consequences:
      'Potential gains include shared tooling and coherent versioning. Potential costs include larger CI complexity and repository onboarding overhead.',
  },
  {
    title: 'Migrate from REST to GraphQL for mobile API',
    status: 'deprecated',
    tags: ['backend', 'architecture', 'deprecated'],
    stakeholders: [STAKEHOLDERS.sarah, STAKEHOLDERS.priya],
    impact: { performance: 'medium', security: 'medium', developerExperience: 'low', cost: 'medium' },
    context:
      'A previous plan proposed a GraphQL gateway for mobile clients to reduce endpoint churn. During implementation planning, we found schema governance and caching strategy would materially increase near-term complexity. Mobile requirements also stabilized enough to avoid urgent API shape changes.',
    decision:
      'We are deprecating the GraphQL migration proposal for now and continuing with focused REST improvements. This keeps delivery scope manageable while preserving optionality for future graph needs.',
    consequences:
      'Short-term complexity is reduced and current roadmap remains intact. We lose GraphQL-specific ergonomics until a stronger product need emerges.',
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
    consequences:
      'We reduce infrastructure dependencies and keep auth implementation lean. Immediate revocation controls are weaker than fully stateful session stores.',
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
    consequences:
      'Database and extraction costs stay predictable. Rare edge cases may lose deep context for very large decisions and require fetching full diff on demand.',
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
    consequences:
      'Token usage is reduced and extraction quality improves. There is risk of false negatives for subtle architectural changes, requiring periodic threshold calibration.',
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
    consequences:
      'Cost risk is significantly reduced and reporting improves. Users may see delayed extraction for large repos when budgets are temporarily exhausted.',
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
    consequences:
      'Authorization flows become more predictable and secure. Middleware mistakes can affect broad navigation paths, so regression coverage is essential.',
  },
];

function monthsAgo(months, day = 1) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(day);
  d.setHours(12, 0, 0, 0);
  return d;
}

function personName(stakeholder) {
  return stakeholder.split(' — ')[0];
}

async function main() {
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

  const repo = await prisma.repo.upsert({
    where: { fullName: 'decisionlog/demo-architecture' },
    update: { enabled: true, defaultBranch: 'main', userId: demoUser.id, syncStatus: 'idle' },
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
    },
  });

  let seededAdrs = 0;
  let seededVersions = 0;

  for (let i = 0; i < ADRS.length; i += 1) {
    const adr = ADRS[i];
    const authoredAt = monthsAgo(5 - (i % 6), (i % 25) + 1);
    const updatedAt = monthsAgo(i % 3, ((i + 7) % 25) + 1);

    const artifact = await prisma.artifact.upsert({
      where: {
        repoId_githubId_type: {
          repoId: repo.id,
          githubId: 92000000 + i,
          type: 'pr',
        },
      },
      update: {
        title: adr.title,
        authoredAt,
        mergedAt: authoredAt,
        body: `ADR seed: ${adr.title}`,
      },
      create: {
        repoId: repo.id,
        githubId: 92000000 + i,
        type: 'pr',
        url: `https://github.com/decisionlog/demo-architecture/pull/${100 + i}`,
        branch: 'main',
        title: adr.title,
        author: personName(adr.stakeholders[0]),
        authoredAt,
        mergedAt: authoredAt,
        body: `ADR seed: ${adr.title}`,
        diff: 'Seeded diff placeholder (trimmed by design).',
        filesChanged: 6 + (i % 6),
        additions: 60 + i * 7,
        deletions: 8 + i,
      },
    });

    const candidate = await prisma.candidate.upsert({
      where: { artifactId: artifact.id },
      update: {
        sieveScore: 0.7 + (i % 5) * 0.05,
        status: 'extracted',
        extractedAt: updatedAt,
      },
      create: {
        repoId: repo.id,
        artifactId: artifact.id,
        userId: demoUser.id,
        sieveScore: 0.7 + (i % 5) * 0.05,
        scoreBreakdown: {
          commitScore: 0.68,
          prScore: 0.8,
          diffScore: 0.72,
          details: `Seeded candidate for ${adr.status}`,
        },
        status: 'extracted',
        extractedAt: updatedAt,
      },
    });

    await prisma.decision.upsert({
      where: { candidateId: candidate.id },
      update: {
        title: adr.title,
        context: adr.context,
        decision: adr.decision,
        consequences: adr.consequences,
        tags: [...adr.tags, `status:${adr.status}`],
        significance: 0.7 + (i % 5) * 0.05,
        extractedBy: 'seed-script',
      },
      create: {
        repoId: repo.id,
        candidateId: candidate.id,
        userId: demoUser.id,
        title: adr.title,
        context: adr.context,
        decision: adr.decision,
        reasoning: `Tradeoff review was led by ${personName(adr.stakeholders[0])} and ${personName(
          adr.stakeholders[1]
        )}, with delivery constraints from ${personName(adr.stakeholders[2] || adr.stakeholders[0])}.`,
        consequences: adr.consequences,
        alternatives: 'Documented alternatives are represented in rawResponse.versionNotes and rationale metadata.',
        tags: [...adr.tags, `status:${adr.status}`],
        significance: 0.7 + (i % 5) * 0.05,
        extractedBy: 'seed-script',
        rawResponse: {
          status: adr.status,
          stakeholders: adr.stakeholders,
          impactAssessment: adr.impact,
          versionNotes: adr.versions || [],
        },
      },
    });

    seededAdrs += 1;
    if (adr.versions && adr.versions.length > 1) seededVersions += 1;
  }

  console.log(`Seeded ${seededAdrs} ADRs, ${Object.keys(STAKEHOLDERS).length} stakeholders, ${seededVersions} versioned ADR groups`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

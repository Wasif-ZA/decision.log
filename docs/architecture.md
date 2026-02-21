# Architecture

## Overview

DecisionLog is a full-stack Next.js application using the App Router pattern with server components for rendering and client components for interactivity. The current implementation uses Prisma as the data access layer over PostgreSQL, with route handlers under `code/app/api/*` handling backend operations. GitHub OAuth is used for authentication today, and session state is maintained with signed JWT cookies.

## System Diagram

```mermaid
graph TD
    Browser[Browser / Client] --> NextJS[Next.js App Router]
    NextJS --> ServerComponents[Server Components - Rendering]
    NextJS --> ClientComponents[Client Components - Interactivity]
    NextJS --> APIRoutes[API Routes - /api/*]
    ServerComponents --> Prisma[Prisma ORM]
    APIRoutes --> Prisma
    Prisma --> Postgres[(PostgreSQL)]
    Browser --> AuthRoutes[Auth Routes (/api/auth/*)]
    AuthRoutes --> GitHub[GitHub OAuth API]
    AuthRoutes --> JWT[JWT Session Cookie]
```

## Key Design Decisions

### Server Components for Data Fetching
UI routes are built on the App Router and rely on API endpoints for data reads/mutations from client components. Shared layout and navigation are composed with route groups and app-level shell components.

### Prisma as the Data Layer
All persisted entities (users, repos, artifacts, candidates, decisions, extraction costs, sync operations) are modeled in Prisma. Route handlers use `db.*` Prisma client calls for reads/writes, with schema-driven relations and indexed query paths.

### Search Implementation
Search in `GET /api/repos/[id]/decisions` is implemented with case-insensitive `contains` filters in Prisma across `title`, `context`, and `decision` fields (an `OR` clause), plus optional tag filtering. This is application-level substring matching rather than PostgreSQL full-text or trigram search.

### Version History
There is no separate `versions` table in the Prisma schema. Version-like history is represented by timeline ordering (`Decision.createdAt`) and, in seeded/demo data, optional version notes stored inside `Decision.rawResponse` JSON. Candidate and artifact provenance also provide history context for extracted decisions.

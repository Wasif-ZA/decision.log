# decision.log Test Suite

Comprehensive testing infrastructure based on the decision.log Test Plan v2.0.

## Quick Start

```bash
# Install dependencies
npm install

# Run all unit tests
npm run test:unit

# Run all integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test:all

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Test Structure

```
tests/
├── unit/                     # Unit tests (fast, isolated)
│   └── lib/                  # Tests for utility functions
│       ├── jwt.test.ts       # JWT signing, verification, renewal
│       ├── apiFetch.test.ts  # API fetch wrapper, retry logic
│       └── debugLog.test.ts  # Debug event logging
├── integration/              # Integration tests (medium speed)
│   └── api/                  # API route tests
│       └── auth.test.ts      # Authentication endpoints
├── e2e/                      # End-to-end tests (slow)
│   └── critical-paths.spec.ts # Critical user journeys
├── fixtures/                 # Test data
│   └── index.ts              # Mock data for all tests
├── utils/                    # Test utilities
│   └── helpers.ts            # Common test helpers
└── setup.ts                  # Global test setup

```

## Test Types

### Unit Tests

Fast, isolated tests for pure functions and utilities.

**Location:** `tests/unit/`

**Run:** `npm run test:unit`

**Coverage:**
- JWT utilities (sign, verify, renew)
- API fetch wrapper (retry, error handling)
- Debug logging (event buffer, clipboard)

**Example:**
```typescript
import { signJWT, verifyJWT } from '@/lib/jwt'

describe('JWT Utilities', () => {
  it('should create and verify a valid token', async () => {
    const payload = { sub: 'user-123', login: 'testuser' }
    const token = await signJWT(payload)
    const decoded = await verifyJWT(token)

    expect(decoded?.sub).toBe('user-123')
  })
})
```

### Integration Tests

Test multiple components working together, including API routes and database.

**Location:** `tests/integration/`

**Run:** `npm run test:integration`

**Coverage:**
- API endpoints
- Database operations (when implemented)
- Authentication flow
- Data isolation

**Status:** ⚠️ Most integration tests are marked `.skip` until database is implemented.

**Example:**
```typescript
describe('Authentication API', () => {
  it('should create user on OAuth callback', async () => {
    // Test OAuth flow with mocked GitHub API
    // Verify user created in database
    // Verify session token set
  })
})
```

### E2E Tests

Full user journey tests using Playwright.

**Location:** `tests/e2e/`

**Run:** `npm run test:e2e`

**Coverage:**
- Complete onboarding flow
- Sync and review candidates
- Dismiss candidate with reason
- Data isolation between users
- Decision detail views
- Error handling
- Responsive design

**Status:** ⚠️ E2E tests are marked `.skip` until OAuth and sync are fully implemented.

**Example:**
```typescript
test('should complete full onboarding', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /sign in/i }).click()
  // ... complete OAuth flow ...
  await expect(page).toHaveURL(/\/timeline/)
})
```

## Test Fixtures

Comprehensive test data is available in `tests/fixtures/index.ts`:

```typescript
import { FIXTURES } from '../fixtures'

// Use pre-defined test data
const user = FIXTURES.users.testUserA
const repo = FIXTURES.repos.testTiny
const pr = FIXTURES.artifacts.architecturalPR
```

**Available Fixtures:**
- Users (testUserA, testUserB)
- Repositories (testTiny, testMedium, testNoisy, testAdversarial, testEmpty)
- Artifacts (PRs with different characteristics)
- Decisions
- Candidates
- GitHub API responses
- Error responses

## Test Utilities

Common helpers in `tests/utils/helpers.ts`:

```typescript
import {
  generateTestToken,
  createTestUser,
  successResponse,
  errorResponse,
  waitFor
} from '../utils/helpers'

// Generate a valid JWT for testing
const token = await generateTestToken('user-123')

// Create a mock user
const user = createTestUser({ login: 'custom-user' })

// Create API responses
const success = successResponse({ id: 1, name: 'Test' })
const error = errorResponse(404, 'NOT_FOUND', 'Resource not found')

// Wait for condition
await waitFor(() => element.isVisible(), 5000)
```

## Writing Tests

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest'

describe('Component/Function Name', () => {
  beforeEach(() => {
    // Setup before each test
  })

  describe('Feature/Method', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test'

      // Act
      const result = functionUnderTest(input)

      // Assert
      expect(result).toBe('expected')
    })
  })
})
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest'

describe('API Endpoint', () => {
  beforeEach(async () => {
    // Clean database
    // Setup test data
  })

  it('should handle request correctly', async () => {
    // Make API request
    const response = await fetch('/api/endpoint')
    const data = await response.json()

    // Verify response
    expect(response.status).toBe(200)
    expect(data).toMatchObject({ success: true })
  })
})
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test'

test.describe('User Journey', () => {
  test('should complete flow', async ({ page }) => {
    await page.goto('/')

    // Interact with UI
    await page.getByRole('button', { name: /submit/i }).click()

    // Verify outcome
    await expect(page.getByText(/success/i)).toBeVisible()
  })
})
```

## Coverage Goals

| Layer | Line Coverage | Branch Coverage | Critical Path |
|-------|---------------|-----------------|---------------|
| `lib/` | 90% | 85% | 100% |
| `app/api/` | 80% | 75% | 100% |
| `components/` | 70% | 60% | 100% |

**View coverage report:**
```bash
npm run test:coverage
# Open coverage/index.html in browser
```

## Continuous Integration

Tests run automatically on:
- Push to `main` branch
- Push to `claude/**` branches
- Pull requests to `main`

**GitHub Actions Workflow:** `.github/workflows/test.yml`

**Jobs:**
1. Unit Tests - Fast, runs first
2. Integration Tests - Requires database
3. E2E Tests - Full application
4. Lint & Type Check - Code quality
5. Security Audit - Dependency vulnerabilities

## Test Data Strategy

### Test Repositories

The test plan defines several test repositories for different scenarios:

- **test-tiny** - 10 commits, 3 PRs (happy path testing)
- **test-medium** - 500 commits, 50 PRs (performance baseline)
- **test-noisy** - All dependency updates (sieve filtering)
- **test-adversarial** - Prompt injection attempts (security)
- **test-empty** - 0 commits (empty state)

### Fixture Categories

1. **Minimal Valid** - Basic happy path data
2. **Architectural** - High-significance decisions
3. **Noise** - Low-significance updates (should be filtered)
4. **Security** - Malicious inputs (XSS, prompt injection)
5. **Edge Cases** - Unicode, large diffs, empty data

## Debugging Tests

### Run specific test file

```bash
npm run test -- tests/unit/lib/jwt.test.ts
```

### Run tests matching pattern

```bash
npm run test -- -t "should verify token"
```

### Watch mode for development

```bash
npm run test:watch
```

### View Playwright UI

```bash
npm run test:e2e:ui
```

### Debug failed E2E test

```bash
# View trace in Playwright trace viewer
npx playwright show-trace trace.zip
```

## Environment Variables

Tests use the following environment variables (set in `tests/setup.ts`):

```bash
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key-32-characters!!
GITHUB_CLIENT_ID=test-github-client-id
GITHUB_CLIENT_SECRET=test-github-client-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Known Limitations

### Current State (MVP)

- ⚠️ **No database** - Integration tests are skipped
- ⚠️ **No real GitHub OAuth** - E2E tests are skipped
- ⚠️ **No LLM extraction** - Business logic not yet implemented
- ✅ **Unit tests** - Fully functional for utilities
- ✅ **Test infrastructure** - Ready to expand

### Next Steps

1. **Implement database (Prisma)**
   - Uncomment database setup in tests
   - Run migrations in CI
   - Un-skip integration tests

2. **Implement OAuth flow**
   - Add test GitHub OAuth app
   - Mock OAuth in E2E tests
   - Un-skip authentication tests

3. **Implement business logic**
   - Add sieve scoring tests
   - Add extraction quality tests
   - Test idempotency and deduplication

## Best Practices

### ✅ Do

- Write descriptive test names
- Use AAA pattern (Arrange, Act, Assert)
- Test one thing per test
- Use fixtures for test data
- Mock external dependencies
- Clean up after tests
- Test error cases
- Write tests before fixing bugs

### ❌ Don't

- Don't test implementation details
- Don't use real API keys in tests
- Don't rely on test execution order
- Don't write flaky tests
- Don't skip tests without good reason
- Don't hardcode test data

## Troubleshooting

### Tests fail with "Cannot find module"

```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
```

### Playwright tests fail to start

```bash
# Reinstall browsers
npx playwright install --with-deps
```

### Coverage not generating

```bash
# Run with coverage flag
npm run test:coverage
```

### Database connection errors (when implemented)

```bash
# Verify database is running
# Check DATABASE_URL environment variable
# Run migrations
npx prisma migrate deploy
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Test Plan v2.0](../TEST_PLAN.md)

## Support

For questions or issues with tests:
1. Check this README
2. Review test examples in `tests/`
3. Consult the full test plan
4. Ask in team chat

---

**Test Coverage Status:** 🟡 Partial (Unit tests complete, integration/E2E pending database implementation)

**Last Updated:** 2026-01-11

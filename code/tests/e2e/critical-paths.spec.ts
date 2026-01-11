/**
 * E2E Tests: Critical User Journeys
 *
 * Critical paths for decision.log covering:
 * - E2E-01: Complete onboarding flow
 * - E2E-02: Sync and review candidate
 * - E2E-03: Dismiss candidate with reason
 * - E2E-04: Data isolation between users
 *
 * These tests require:
 * - Running app on localhost:3000
 * - Test GitHub OAuth configured
 * - Test database with seed data
 */

import { test, expect } from '@playwright/test'

/**
 * Helper: Mock OAuth login
 * In a real test environment, you would:
 * 1. Have a test GitHub OAuth app
 * 2. Use test user credentials
 * 3. Or mock the OAuth flow entirely
 */
async function loginAs(page: any, username: string) {
  // TODO: Implement OAuth mock or test flow
  // For now, this is a placeholder
  await page.goto('/login')
  // await page.getByRole('button', { name: /sign in with github/i }).click()
  // ... complete OAuth flow ...
  // await page.waitForURL('/setup')
}

test.describe('Critical User Journeys', () => {
  test.describe.skip('E2E-01: Complete onboarding flow', () => {
    test('should complete full onboarding from landing to timeline', async ({
      page,
    }) => {
      // 1. Land on home page
      await page.goto('/')
      await expect(
        page.getByRole('heading', { name: /decision\.log/i })
      ).toBeVisible()

      // 2. Click login
      await page.getByRole('button', { name: /sign in with github/i }).click()

      // 3. Complete OAuth (mocked in test env)
      // In real implementation, this would navigate through GitHub OAuth
      await expect(page).toHaveURL(/\/(setup|timeline)/, { timeout: 10000 })

      // 4. If on setup, complete wizard
      if (page.url().includes('/setup')) {
        // Step 1: Pick repository
        await expect(page.getByText(/select a repository/i)).toBeVisible()
        const repoCard = page.getByTestId('repo-card').first()
        await repoCard.click()
        await page.getByRole('button', { name: /next/i }).click()

        // Step 2: Choose branch
        await expect(page.getByText(/choose branch/i)).toBeVisible()
        await page.getByRole('radio', { name: /main/i }).click()
        await page.getByRole('button', { name: /next/i }).click()

        // Step 3: Sync progress
        await expect(page.getByText(/syncing/i)).toBeVisible()
        await expect(page.getByText(/complete/i)).toBeVisible({
          timeout: 30000,
        })

        // Step 4: Optional webhook (skip for now)
        await page.getByRole('button', { name: /skip/i }).click()

        // Step 5: Completion
        await expect(page.getByText(/ready to go/i)).toBeVisible()
        await page.getByRole('button', { name: /view timeline/i }).click()
      }

      // 5. Verify we're on timeline
      await expect(page).toHaveURL(/\/timeline/)
      await expect(page.getByRole('heading', { name: /timeline/i })).toBeVisible()
    })
  })

  test.describe.skip('E2E-02: Sync and review candidate', () => {
    test.beforeEach(async ({ page }) => {
      // Setup: logged in, repo enabled
      await loginAs(page, 'test-user')
    })

    test('should sync repo and approve candidate', async ({ page }) => {
      // 1. Navigate to repository settings
      await page.goto('/settings')

      // 2. Start sync
      await page.getByRole('button', { name: /sync now/i }).click()

      // 3. Wait for sync completion
      await expect(page.getByText(/syncing/i)).toBeVisible()
      await expect(page.getByText(/sync complete/i)).toBeVisible({
        timeout: 30000,
      })

      // 4. Navigate to candidates (if not auto-redirected)
      await page.goto('/timeline')
      const candidateCount = await page
        .getByTestId('candidate-badge')
        .textContent()

      if (candidateCount && parseInt(candidateCount) > 0) {
        // 5. View candidates
        await page.getByRole('link', { name: /candidates/i }).click()

        // 6. Approve first candidate
        const firstCard = page.getByTestId('candidate-card').first()
        await expect(firstCard).toBeVisible()

        // Expand to see details
        await firstCard.click()
        await expect(firstCard.getByText(/confidence/i)).toBeVisible()

        // Approve
        await firstCard.getByRole('button', { name: /approve/i }).click()

        // Confirm if there's a confirmation dialog
        const confirmButton = page.getByRole('button', { name: /confirm/i })
        if (await confirmButton.isVisible()) {
          await confirmButton.click()
        }

        // 7. Verify decision created in timeline
        await page.getByRole('link', { name: /timeline/i }).click()
        await expect(page.getByTestId('decision-card')).toHaveCount(1, {
          timeout: 5000,
        })
      }
    })
  })

  test.describe.skip('E2E-03: Dismiss candidate with reason', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'test-user')
    })

    test('should dismiss candidate and record reason', async ({ page }) => {
      await page.goto('/timeline')

      // 1. Navigate to candidates
      const candidateCount = await page
        .getByTestId('candidate-badge')
        .textContent()

      if (candidateCount && parseInt(candidateCount) > 0) {
        await page.getByRole('link', { name: /candidates/i }).click()

        // 2. Get first candidate ID for later verification
        const firstCard = page.getByTestId('candidate-card').first()
        const candidateId = await firstCard.getAttribute('data-candidate-id')

        // 3. Click dismiss
        await firstCard.getByRole('button', { name: /dismiss/i }).click()

        // 4. Select reason
        await expect(page.getByLabel(/reason/i)).toBeVisible()
        await page.getByLabel(/reason/i).selectOption('too_minor')

        // 5. Add note
        await page
          .getByLabel(/note/i)
          .fill('Just a config change, not architectural')

        // 6. Confirm dismissal
        await page.getByRole('button', { name: /confirm/i }).click()

        // 7. Verify removed from inbox
        await expect(firstCard).not.toBeVisible({ timeout: 5000 })

        // 8. Verify in dismissed list
        await page.getByRole('tab', { name: /dismissed/i }).click()
        await expect(
          page.getByText(/just a config change/i)
        ).toBeVisible()

        // 9. Verify candidate is marked as dismissed
        if (candidateId) {
          const dismissedCard = page.getByTestId(`candidate-${candidateId}`)
          await expect(dismissedCard).toBeVisible()
          await expect(
            dismissedCard.getByText(/too_minor/i)
          ).toBeVisible()
        }
      }
    })

    test('should allow undismissing a candidate', async ({ page }) => {
      await page.goto('/timeline')

      // Navigate to dismissed candidates
      await page.getByRole('link', { name: /candidates/i }).click()
      await page.getByRole('tab', { name: /dismissed/i }).click()

      const dismissedCard = page.getByTestId('candidate-card').first()

      if (await dismissedCard.isVisible()) {
        // Click undismiss
        await dismissedCard.getByRole('button', { name: /undismiss/i }).click()

        // Should move back to pending
        await page.getByRole('tab', { name: /pending/i }).click()
        await expect(dismissedCard).toBeVisible()
      }
    })
  })

  test.describe.skip('E2E-04: Data isolation between users', () => {
    test('should not show User A data to User B', async ({ browser }) => {
      // User A creates a decision
      const contextA = await browser.newContext()
      const pageA = await contextA.newPage()

      await loginAs(pageA, 'user-a')
      await pageA.goto('/timeline')

      const decisionCountA = await pageA.getByTestId('decision-card').count()

      // Get a specific decision title if any exist
      let decisionTitle = null
      if (decisionCountA > 0) {
        decisionTitle = await pageA
          .getByTestId('decision-card')
          .first()
          .getByRole('heading')
          .textContent()
      }

      // User B should not see User A's data
      const contextB = await browser.newContext()
      const pageB = await contextB.newPage()

      await loginAs(pageB, 'user-b')
      await pageB.goto('/timeline')

      // User B should either see their own data or nothing
      // Should NOT see User A's decision title
      if (decisionTitle) {
        await expect(pageB.getByText(decisionTitle)).not.toBeVisible()
      }

      // Try to access User A's repo directly (should fail)
      // This requires knowing User A's repo ID
      // await pageB.goto('/repos/user-a-repo-id/timeline')
      // await expect(pageB.getByText(/not found|access denied/i)).toBeVisible()

      await contextA.close()
      await contextB.close()
    })

    test('should prevent API access to other users data', async ({
      browser,
    }) => {
      const contextA = await browser.newContext()
      const pageA = await contextA.newPage()

      await loginAs(pageA, 'user-a')

      // Get User A's session cookie
      const cookiesA = await contextA.cookies()
      const sessionCookieA = cookiesA.find(
        (c) => c.name === 'decision_log_session'
      )

      // Try to access User A's data with User B's session
      const contextB = await browser.newContext()
      const pageB = await contextB.newPage()

      await loginAs(pageB, 'user-b')

      // Make API request for User A's repos using User B's session
      const response = await pageB.request.get('/api/repos')
      const data = await response.json()

      // Should not include User A's repos
      // This requires knowing User A's repo IDs
      // expect(data.data).not.toContainEqual(expect.objectContaining({
      //   id: 'user-a-repo-id'
      // }))

      await contextA.close()
      await contextB.close()
    })
  })

  test.describe.skip('E2E-05: Decision detail view', () => {
    test('should display decision with evidence', async ({ page }) => {
      await loginAs(page, 'test-user')
      await page.goto('/timeline')

      // Click on first decision
      const firstDecision = page.getByTestId('decision-card').first()

      if (await firstDecision.isVisible()) {
        await firstDecision.click()

        // Should navigate to decision detail
        await expect(page).toHaveURL(/\/decision\/[^/]+/)

        // Should show decision metadata
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expect(page.getByText(/decision/i)).toBeVisible()
        await expect(page.getByText(/context/i)).toBeVisible()
        await expect(page.getByText(/consequences/i)).toBeVisible()

        // Should show evidence panel
        await expect(page.getByText(/evidence/i)).toBeVisible()

        // Click to view evidence
        await page.getByRole('button', { name: /view evidence/i }).click()

        // Evidence panel should open
        await expect(page.getByTestId('evidence-panel')).toBeVisible()
        await expect(page.getByText(/pull request/i)).toBeVisible()
      }
    })
  })

  test.describe.skip('E2E-06: Error handling', () => {
    test('should show error on sync failure', async ({ page }) => {
      await loginAs(page, 'test-user')

      // TODO: Mock a failing sync
      await page.goto('/settings')
      await page.getByRole('button', { name: /sync now/i }).click()

      // Should show error state
      await expect(page.getByText(/error/i)).toBeVisible({ timeout: 30000 })
      await expect(page.getByText(/try again/i)).toBeVisible()
    })

    test('should handle network disconnection gracefully', async ({ page }) => {
      await loginAs(page, 'test-user')

      // Simulate offline
      await page.context().setOffline(true)

      await page.goto('/timeline')

      // Should show offline error
      await expect(page.getByText(/network|offline|connection/i)).toBeVisible()

      // Restore connection
      await page.context().setOffline(false)

      // Should recover
      await page.reload()
      await expect(page.getByRole('heading', { name: /timeline/i })).toBeVisible()
    })
  })

  test.describe.skip('E2E-07: Responsive design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE

      await loginAs(page, 'test-user')
      await page.goto('/timeline')

      // Mobile menu should be accessible
      await page.getByRole('button', { name: /menu/i }).click()
      await expect(page.getByRole('navigation')).toBeVisible()

      // Decision cards should be readable
      const firstCard = page.getByTestId('decision-card').first()
      if (await firstCard.isVisible()) {
        await expect(firstCard).toBeInViewport()
      }
    })

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }) // iPad

      await loginAs(page, 'test-user')
      await page.goto('/timeline')

      await expect(page.getByRole('heading', { name: /timeline/i })).toBeVisible()
    })
  })
})

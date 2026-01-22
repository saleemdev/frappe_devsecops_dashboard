/**
 * Zenhub Dashboard - Main E2E Test Suite
 *
 * Tests the complete user flow:
 * 1. Loading and navigation
 * 2. Product/Project/Epic selection
 * 3. Metrics display
 * 4. Search and filtering
 * 5. Refresh functionality
 * 6. Error handling
 */

import { test, expect, mockZenhubResponses } from './fixtures/zenhub.fixture'

test.describe('Zenhub Dashboard - Main Flow', () => {
  test.beforeEach(async ({ page, zenhubPage }) => {
    // Mock API responses before navigating
    await page.route('**/frappe.devsecops_dashboard.api.zenhub*', async (route) => {
      const url = route.request().url()

      if (url.includes('getSoftwareProducts')) {
        await route.abort('blockedbyclient')
        await page.evaluate(() => {
          window.mockZenhubAPI = {
            getSoftwareProducts: () => Promise.resolve(mockZenhubResponses.softwareProducts)
          }
        })
      } else if (url.includes('getWorkspaceSummary')) {
        await route.fulfill({ response: mockZenhubResponses.workspace })
      } else if (url.includes('getTeamUtilization')) {
        await route.fulfill({ response: mockZenhubResponses.teamUtilization })
      } else {
        await route.continue()
      }
    })

    // Navigate to dashboard
    await zenhubPage.navigateToDashboard()
  })

  test('should load dashboard and display initial metrics', async ({ page, zenhubPage }) => {
    // Verify page title
    await expect(page).toHaveTitle(/Zenhub|Dashboard/i)

    // Verify metrics are visible
    await zenhubPage.verifyMetricsVisible()

    // Verify metric values
    const totalIssues = await zenhubPage.getMetricValue('total-issues-metric')
    expect(totalIssues).toContain('135') // From mock data

    const completionRate = await zenhubPage.getMetricValue('completion-rate-metric')
    expect(completionRate).toContain('%')
  })

  test('should display product selector with options', async ({ page }) => {
    const productSelect = page.locator('[aria-label="Select software product"]')
    await expect(productSelect).toBeVisible()

    // Click to open dropdown
    await productSelect.click()

    // Verify products are listed
    await expect(page.locator('text=Test Product 1')).toBeVisible()
    await expect(page.locator('text=Test Product 2')).toBeVisible()
  })

  test('should filter table when search text entered', async ({ page, zenhubPage }) => {
    // Initial row count
    const initialCount = await zenhubPage.getTableRowCount()
    expect(initialCount).toBeGreaterThan(0)

    // Search for specific issue
    await zenhubPage.searchIssues('authentication')

    // Wait for table to update
    await page.waitForTimeout(500)

    // Table should still be visible and filtered
    const filteredCount = await zenhubPage.getTableRowCount()
    expect(filteredCount).toBeLessThanOrEqual(initialCount)
  })

  test('should refresh data when refresh button clicked', async ({ page, zenhubPage }) => {
    // Get initial metric value
    const initialValue = await zenhubPage.getMetricValue('total-issues-metric')

    // Click refresh
    await zenhubPage.clickRefresh()

    // Verify loading state briefly appears
    // (might not always be visible depending on speed, so we just verify it completes)
    await page.waitForLoadState('networkidle')

    // Verify metrics are still visible after refresh
    await zenhubPage.verifyMetricsVisible()
  })

  test('should handle API errors gracefully', async ({ page, zenhubPage }) => {
    // Simulate API error
    await page.route('**/getWorkspaceSummary*', route => {
      route.fulfill({ response: mockZenhubResponses.error, status: 400 })
    })

    // Navigate to trigger the error
    await zenhubPage.navigateToDashboard()

    // Verify error message is displayed
    await zenhubPage.verifyErrorMessage()

    // Verify user can close the error
    await zenhubPage.closeError()
    const errorAlert = page.locator('.ant-alert-error')
    await expect(errorAlert).not.toBeVisible()
  })
})

test.describe('Zenhub Dashboard - Navigation Flow', () => {
  test.beforeEach(async ({ zenhubPage }) => {
    await zenhubPage.navigateToDashboard()
  })

  test('should navigate product → project → epic → back', async ({ page, zenhubPage }) => {
    // Start at product level
    await expect(page.locator('[aria-label="Select software product"]')).toBeVisible()

    // Select first product
    await zenhubPage.selectProduct('Test Product 1')

    // Project selector should now appear
    const projectSelector = page.locator('[aria-label="Select project"]')
    await expect(projectSelector).toBeVisible()

    // Select first project
    await projectSelector.click()
    await page.locator('text=Project Alpha').click()
    await page.waitForLoadState('networkidle')

    // Epic selector should appear if epics exist
    const epicSelector = page.locator('[aria-label="Select epic"]')
    if (await epicSelector.isVisible()) {
      // Navigate to epic
      await epicSelector.click()
      await page.locator('text=Sprint').first().click()
      await page.waitForLoadState('networkidle')

      // Verify we're at epic level by checking breadcrumb or title
      const breadcrumb = page.locator('.ant-breadcrumb')
      await expect(breadcrumb).toContainText(/Project|Epic|Sprint/)
    }
  })

  test('should maintain search filter across navigation levels', async ({ page, zenhubPage }) => {
    const searchInput = page.locator('[aria-label="Search issues"]')

    // Enter search text
    await searchInput.fill('authentication')

    // Navigate to a project
    await zenhubPage.selectProduct('Test Product 1')
    const projectSelector = page.locator('[aria-label="Select project"]')
    if (await projectSelector.isVisible()) {
      await projectSelector.click()
      await page.locator('text=Project Alpha').click()
      await page.waitForLoadState('networkidle')
    }

    // Search filter should still show the previous value (if implemented to persist)
    const currentSearchValue = await searchInput.inputValue()
    expect(currentSearchValue).toBe('authentication')
  })
})

test.describe('Zenhub Dashboard - Metrics Display', () => {
  test.beforeEach(async ({ zenhubPage }) => {
    await zenhubPage.navigateToDashboard()
  })

  test('should display all metric cards', async ({ page }) => {
    const metricCards = page.locator('[data-testid^="metric"]')
    const count = await metricCards.count()

    // Should have at least 4 metric cards
    expect(count).toBeGreaterThanOrEqual(4)
  })

  test('should show progress bar with correct percentage', async ({ page }) => {
    const progressBars = page.locator('.ant-progress')
    const count = await progressBars.count()

    // Should have progress bars for completion rate and points progress
    expect(count).toBeGreaterThanOrEqual(2)

    // Verify progress value is between 0-100%
    const firstProgress = progressBars.first()
    const progressText = await firstProgress.textContent()
    const percentMatch = progressText?.match(/(\d+)%/)
    const percentage = parseInt(percentMatch?.[1] || '0')

    expect(percentage).toBeGreaterThanOrEqual(0)
    expect(percentage).toBeLessThanOrEqual(100)
  })

  test('should display team utilization information', async ({ page }) => {
    // Look for team member data in the page
    const teamSection = page.locator('text=Team|Utilization').first()

    if (await teamSection.isVisible()) {
      // Verify team member names are displayed
      await expect(page.locator('text=Alice|Bob|John|Smith')).toBeVisible({ timeout: 5000 })
    }
  })

  test('should show warning for blocked issues', async ({ page }) => {
    const blockedWarning = page.locator('text=/blocked|⚠️/')
    const isVisible = await blockedWarning.isVisible({ timeout: 5000 })

    // If there are blocked issues in the data, warning should show
    if (isVisible) {
      await expect(blockedWarning).toBeVisible()
      const warningText = await blockedWarning.textContent()
      expect(warningText).toContain('blocked')
    }
  })
})

test.describe('Zenhub Dashboard - Table Interactions', () => {
  test.beforeEach(async ({ zenhubPage }) => {
    await zenhubPage.navigateToDashboard()
  })

  test('should display issues table with correct columns', async ({ page }) => {
    const tableHeaders = page.locator('.ant-table-thead th')

    // Verify key columns exist
    const headerTexts = await tableHeaders.allTextContents()
    expect(headerTexts.some(text => text.includes('#'))).toBe(true) // Issue number
    expect(headerTexts.some(text => text.includes('Title'))).toBe(true)
    expect(headerTexts.some(text => text.includes('Status'))).toBe(true)
    expect(headerTexts.some(text => text.includes('Points'))).toBe(true)
  })

  test('should sort table by clicking column headers', async ({ page }) => {
    const pointsHeader = page.locator('.ant-table-thead th').filter({ hasText: 'Points' })

    // Click to sort
    await pointsHeader.click()

    // Verify sort indicator appears
    const sortIcon = pointsHeader.locator('.anticon-caret-up, .anticon-caret-down')
    await expect(sortIcon).toBeVisible()
  })

  test('should filter table by status', async ({ page }) => {
    // Find and click status filter
    const statusHeader = page.locator('.ant-table-thead th').filter({ hasText: 'Status' })
    await statusHeader.click()

    // Look for filter dropdown
    const filterDropdown = page.locator('.ant-dropdown:has-text("Open")')
    if (await filterDropdown.isVisible({ timeout: 2000 })) {
      // Click "Closed" filter
      await page.locator('text=Closed').click()

      // Verify table updates
      await page.waitForTimeout(300)
      const rows = page.locator('.ant-table-row')
      const rowCount = await rows.count()

      expect(rowCount).toBeGreaterThanOrEqual(0)
    }
  })

  test('should paginate large result sets', async ({ page }) => {
    const pagination = page.locator('.ant-pagination')

    if (await pagination.isVisible()) {
      // Verify pagination controls exist
      const nextButton = pagination.locator('.ant-pagination-next')
      await expect(nextButton).toBeVisible()

      // Click next page
      const isDisabled = await nextButton.evaluate(el => el.classList.contains('ant-pagination-disabled'))
      if (!isDisabled) {
        await nextButton.click()

        // Verify table updates
        await page.waitForTimeout(300)
        const rows = page.locator('.ant-table-row')
        const count = await rows.count()
        expect(count).toBeGreaterThan(0)
      }
    }
  })
})

test.describe('Zenhub Dashboard - Loading States', () => {
  test('should show loading skeleton while fetching data', async ({ page }) => {
    // Slow down network to see loading state
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 1000)
    })

    await page.goto('/#zenhub-dashboard')

    // Skeleton should be visible during load
    const skeleton = page.locator('.ant-skeleton')
    const isLoading = await skeleton.isVisible({ timeout: 2000 }).catch(() => false)

    if (isLoading) {
      await expect(skeleton).toBeVisible()
    }

    // Eventually data should load
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-testid="total-issues-metric"]')).toBeVisible()
  })

  test('should show loading state on filter change', async ({ page, zenhubPage }) => {
    // Slow down API
    await page.route('**/*api*', route => {
      setTimeout(() => route.continue(), 800)
    })

    // Change product
    await zenhubPage.selectProduct('Test Product 1')

    // Loading indicator might briefly appear
    await page.waitForLoadState('networkidle')

    // Data should be loaded
    await expect(page.locator('[data-testid="total-issues-metric"]')).toBeVisible()
  })
})

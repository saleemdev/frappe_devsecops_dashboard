import { test, expect } from '@playwright/test'

/**
 * Wiki Feature E2E Tests
 * 
 * Tests cover the complete Wiki feature flow:
 * - WikiHome: List spaces, create space, search
 * - WikiSpaceDetail: List pages, create page, delete page
 * - WikiPageView: View content, edit, save, cancel, delete
 */

test.describe('Wiki Feature - End to End', () => {
  let testSpaceName: string
  let testPageTitle: string

  test.beforeEach(async ({ page }) => {
    // Generate unique names for this test run
    const timestamp = Date.now()
    testSpaceName = `Test Space ${timestamp}`
    testPageTitle = `Test Page ${timestamp}`

    // Navigate to Wiki home
    await page.goto('/#wiki')
    await expect(page.getByRole('heading', { name: /wiki documentation/i })).toBeVisible()
  })

  test('A1: Load WikiHome and display spaces list', async ({ page }) => {
    // Verify page title and description
    await expect(page.getByRole('heading', { name: /wiki documentation/i })).toBeVisible()
    await expect(page.getByText(/use wiki spaces to group documentation/i)).toBeVisible()

    // Verify search input and create button
    await expect(page.getByPlaceholder(/search wiki spaces/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /new wiki space/i })).toBeVisible()
  })

  test('A2: Create new Wiki Space', async ({ page }) => {
    // Click create button
    await page.getByRole('button', { name: /new wiki space/i }).click()

    // Fill form
    await page.getByLabel(/space name/i).fill(testSpaceName)
    await page.getByLabel(/route/i).fill(`test-space-${Date.now()}`)
    await page.getByLabel(/description/i).fill('Test space description')

    // Submit
    await page.getByRole('button', { name: /create space/i }).click()

    // Verify success and navigation
    await expect(page.getByText(/wiki space created successfully/i)).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: testSpaceName })).toBeVisible()
  })

  test('A3: Search Wiki Spaces', async ({ page }) => {
    // Type in search
    const searchInput = page.getByPlaceholder(/search wiki spaces/i)
    await searchInput.fill('nonexistent')

    // Verify empty state
    await expect(page.getByText(/no wiki spaces found/i)).toBeVisible()

    // Clear search
    await searchInput.clear()

    // Verify spaces reappear
    await expect(page.getByText(/wiki spaces/i)).toBeVisible()
  })

  test('B1: Load WikiSpaceDetail and display pages', async ({ page }) => {
    // Create a space first
    await page.getByRole('button', { name: /new wiki space/i }).click()
    await page.getByLabel(/space name/i).fill(testSpaceName)
    await page.getByLabel(/route/i).fill(`test-space-${Date.now()}`)
    await page.getByRole('button', { name: /create space/i }).click()

    // Verify space detail page
    await expect(page.getByRole('heading', { level: 2, name: testSpaceName })).toBeVisible()
    await expect(page.getByText(/0 pages/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /new page/i })).toBeVisible()
  })

  test('B2: Create Wiki Page in Space', async ({ page }) => {
    // Create space
    await page.getByRole('button', { name: /new wiki space/i }).click()
    await page.getByLabel(/space name/i).fill(testSpaceName)
    await page.getByLabel(/route/i).fill(`test-space-${Date.now()}`)
    await page.getByRole('button', { name: /create space/i }).click()

    // Create page
    await page.getByRole('button', { name: /new page/i }).click()
    await page.getByLabel(/page title/i).fill(testPageTitle)
    await page.getByLabel(/route/i).fill(`test-page-${Date.now()}`)
    await page.getByRole('button', { name: /create page/i }).click()

    // Verify success
    await expect(page.getByText(/wiki page created successfully/i)).toBeVisible()
    await expect(page.getByText(testPageTitle)).toBeVisible()
  })

  test('C1: View Wiki Page Content', async ({ page }) => {
    // Create space and page
    await page.getByRole('button', { name: /new wiki space/i }).click()
    await page.getByLabel(/space name/i).fill(testSpaceName)
    await page.getByLabel(/route/i).fill(`test-space-${Date.now()}`)
    await page.getByRole('button', { name: /create space/i }).click()

    await page.getByRole('button', { name: /new page/i }).click()
    await page.getByLabel(/page title/i).fill(testPageTitle)
    await page.getByLabel(/route/i).fill(`test-page-${Date.now()}`)
    await page.getByRole('button', { name: /create page/i }).click()

    // Click to view page
    await page.getByText(testPageTitle).click()

    // Verify page view
    await expect(page.getByRole('heading', { level: 2, name: testPageTitle })).toBeVisible()
    await expect(page.getByRole('button', { name: /edit/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /delete/i })).toBeVisible()
  })

  test('C2: Edit and Save Wiki Page', async ({ page }) => {
    // Navigate to page view (simplified - assumes page exists)
    await page.goto('/#wiki')
    
    // Create space and page
    await page.getByRole('button', { name: /new wiki space/i }).click()
    await page.getByLabel(/space name/i).fill(testSpaceName)
    await page.getByLabel(/route/i).fill(`test-space-${Date.now()}`)
    await page.getByRole('button', { name: /create space/i }).click()

    await page.getByRole('button', { name: /new page/i }).click()
    await page.getByLabel(/page title/i).fill(testPageTitle)
    await page.getByLabel(/route/i).fill(`test-page-${Date.now()}`)
    await page.getByRole('button', { name: /create page/i }).click()

    await page.getByText(testPageTitle).click()

    // Edit page
    await page.getByRole('button', { name: /edit/i }).click()
    const titleInput = page.getByPlaceholder(/page title/i)
    await titleInput.fill(testPageTitle + ' Updated')

    // Save
    await page.getByRole('button', { name: /save/i }).click()

    // Verify
    await expect(page.getByText(/page saved successfully/i)).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: testPageTitle + ' Updated' })).toBeVisible()
  })

  test('C3: Cancel Edit without Saving', async ({ page }) => {
    // Create and navigate to page
    await page.getByRole('button', { name: /new wiki space/i }).click()
    await page.getByLabel(/space name/i).fill(testSpaceName)
    await page.getByLabel(/route/i).fill(`test-space-${Date.now()}`)
    await page.getByRole('button', { name: /create space/i }).click()

    await page.getByRole('button', { name: /new page/i }).click()
    await page.getByLabel(/page title/i).fill(testPageTitle)
    await page.getByLabel(/route/i).fill(`test-page-${Date.now()}`)
    await page.getByRole('button', { name: /create page/i }).click()

    await page.getByText(testPageTitle).click()

    // Edit and cancel
    await page.getByRole('button', { name: /edit/i }).click()
    const titleInput = page.getByPlaceholder(/page title/i)
    await titleInput.fill('Should Not Persist')

    await page.getByRole('button', { name: /cancel/i }).click()

    // Verify original title
    await expect(page.getByRole('heading', { level: 2, name: testPageTitle })).toBeVisible()
  })

  test('C4: Delete Wiki Page', async ({ page }) => {
    // Create space and page
    await page.getByRole('button', { name: /new wiki space/i }).click()
    await page.getByLabel(/space name/i).fill(testSpaceName)
    await page.getByLabel(/route/i).fill(`test-space-${Date.now()}`)
    await page.getByRole('button', { name: /create space/i }).click()

    await page.getByRole('button', { name: /new page/i }).click()
    await page.getByLabel(/page title/i).fill(testPageTitle)
    await page.getByLabel(/route/i).fill(`test-page-${Date.now()}`)
    await page.getByRole('button', { name: /create page/i }).click()

    await page.getByText(testPageTitle).click()

    // Delete
    await page.getByRole('button', { name: /delete/i }).click()
    await page.getByRole('button', { name: /yes/i }).click()

    // Verify redirect and deletion
    await expect(page.getByText(/page deleted successfully/i)).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: testSpaceName })).toBeVisible()
  })

  test('Back Navigation from Page to Space', async ({ page }) => {
    // Create space and page
    await page.getByRole('button', { name: /new wiki space/i }).click()
    await page.getByLabel(/space name/i).fill(testSpaceName)
    await page.getByLabel(/route/i).fill(`test-space-${Date.now()}`)
    await page.getByRole('button', { name: /create space/i }).click()

    await page.getByRole('button', { name: /new page/i }).click()
    await page.getByLabel(/page title/i).fill(testPageTitle)
    await page.getByLabel(/route/i).fill(`test-page-${Date.now()}`)
    await page.getByRole('button', { name: /create page/i }).click()

    await page.getByText(testPageTitle).click()

    // Click back
    await page.getByRole('button', { name: /back/i }).click()

    // Verify we're back at space
    await expect(page.getByRole('heading', { level: 2, name: testSpaceName })).toBeVisible()
  })
})


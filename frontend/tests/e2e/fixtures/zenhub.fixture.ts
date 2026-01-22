import { test as base, expect } from '@playwright/test'

/**
 * Zenhub Dashboard E2E Test Fixtures
 *
 * Provides fixtures for:
 * - Mock Zenhub API responses
 * - Navigation helpers
 * - Data fixtures for testing
 * - Common assertions
 */

export const mockZenhubResponses = {
  softwareProducts: {
    success: true,
    products: [
      {
        name: 'Test Product 1',
        zenhub_workspace_id: 'ws_123_test',
        description: 'Test workspace'
      },
      {
        name: 'Test Product 2',
        zenhub_workspace_id: 'ws_456_test',
        description: 'Another test workspace'
      }
    ]
  },

  workspace: {
    success: true,
    workspace: {
      id: 'ws_123_test',
      name: 'Test Workspace',
      projects: [
        {
          id: 'proj_1',
          title: 'Project Alpha',
          number: 1,
          state: 'OPEN'
        },
        {
          id: 'proj_2',
          title: 'Project Beta',
          number: 2,
          state: 'OPEN'
        }
      ],
      sprints: [
        {
          id: 'sprint_1',
          name: 'Sprint 1: Jan 1-14',
          startAt: '2026-01-01',
          endAt: '2026-01-14'
        }
      ],
      kanban_statuses: {
        'OPEN': 45,
        'IN_PROGRESS': 12,
        'CLOSED': 78
      },
      team_members: [
        { id: 'tm_1', name: 'Alice Johnson' },
        { id: 'tm_2', name: 'Bob Smith' }
      ],
      summary: {
        total_issues: 135,
        total_story_points: 450,
        completion_rate: 57.8
      }
    }
  },

  projectIssues: {
    success: true,
    issues: [
      {
        id: 'issue_1',
        number: 1,
        title: 'Build authentication module',
        state: 'CLOSED',
        estimate: { value: 5 },
        assignees: { nodes: [{ id: 'tm_1', name: 'Alice Johnson' }] },
        blockingItems: { nodes: [] }
      },
      {
        id: 'issue_2',
        number: 2,
        title: 'Implement dashboard metrics',
        state: 'IN_PROGRESS',
        estimate: { value: 8 },
        assignees: { nodes: [{ id: 'tm_2', name: 'Bob Smith' }] },
        blockingItems: { nodes: [] }
      },
      {
        id: 'issue_3',
        number: 3,
        title: 'Refactor API endpoints',
        state: 'OPEN',
        estimate: { value: 13 },
        assignees: { nodes: [] },
        blockingItems: { nodes: [{ id: 'issue_1', title: 'Build authentication module' }] }
      }
    ]
  },

  teamUtilization: {
    success: true,
    team_members: [
      {
        id: 'tm_1',
        name: 'Alice Johnson',
        task_count: 12,
        story_points: 45,
        completed_points: 32,
        completed_tasks: 8,
        utilization_percentage: 71.11,
        task_completion_percentage: 66.67
      },
      {
        id: 'tm_2',
        name: 'Bob Smith',
        task_count: 10,
        story_points: 38,
        completed_points: 25,
        completed_tasks: 6,
        utilization_percentage: 65.79,
        task_completion_percentage: 60.0
      }
    ],
    total_members: 2,
    average_utilization: 68.45
  },

  error: {
    success: false,
    error: 'API Error: Failed to fetch workspace data'
  }
}

export type ZenhubTestFixtures = {
  zenhubPage: ZenhubPage
}

export class ZenhubPage {
  constructor(private page: any) {}

  async navigateToDashboard() {
    await this.page.goto('/#zenhub-dashboard')
    await this.page.waitForLoadState('networkidle')
  }

  async selectProduct(productName: string) {
    await this.page.click('[aria-label="Select software product"]')
    await this.page.click(`text=${productName}`)
    await this.page.waitForLoadState('networkidle')
  }

  async selectProject(projectName: string) {
    await this.page.click('[aria-label="Select project"]')
    await this.page.click(`text=${projectName}`)
    await this.page.waitForLoadState('networkidle')
  }

  async searchIssues(searchText: string) {
    await this.page.fill('[aria-label="Search issues"]', searchText)
    await this.page.waitForTimeout(500)
  }

  async clickRefresh() {
    await this.page.click('[aria-label="Refresh dashboard data"]')
    await this.page.waitForLoadState('networkidle')
  }

  async verifyMetricsVisible() {
    await expect(this.page.locator('[data-testid="total-issues-metric"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="completion-rate-metric"]')).toBeVisible()
  }

  async verifyErrorMessage() {
    await expect(this.page.locator('.ant-alert-error')).toBeVisible()
  }

  async verifyLoadingState() {
    await expect(this.page.locator('.ant-skeleton')).toBeVisible()
  }

  async getMetricValue(testId: string): Promise<string> {
    return await this.page.textContent(`[data-testid="${testId}"]`)
  }

  async getTableRowCount(): Promise<number> {
    return await this.page.locator('.ant-table-row').count()
  }

  async closeError() {
    await this.page.click('.ant-alert-close-icon')
  }
}

export const test = base.extend<ZenhubTestFixtures>({
  zenhubPage: async ({ page }, use) => {
    const zenhubPage = new ZenhubPage(page)
    await use(zenhubPage)
  }
})

export { expect }

import React from 'react'
import Dashboard from '../../src/components/Dashboard.jsx'
import api from '../../src/services/api'

const minimalData = {
  success: true,
  metrics: { activeProjects: 1, totalTasks: 3, teamCapacity: 85, completionRate: 50, totalProjects: 1, averageCompletion: 50 },
  projects: [
    { id: 'proj-001', name: 'Alpha', project_status: 'Active', client: 'Client A', progress: 50, task_count: 3, completed_tasks: 1, current_phase: 'Development' }
  ],
  deliveryLifecycle: ['Planning', 'Development', 'Testing']
}

const groupsUnordered = [
  { name: 'Development', taskType: 'Development', custom_priority: 4, total: 2, completed: 1, completionRate: '1/2', percent: 50, color: 'gold' },
  { name: 'Planning', taskType: 'Planning', custom_priority: 1, total: 1, completed: 1, completionRate: '1/1', percent: 100, color: 'green' },
  { name: 'Testing', taskType: 'Testing', custom_priority: 6, total: 0, completed: 0, completionRate: '0/0', percent: 0, color: 'red' }
]

const tasksForDev = [
  { id: 'T-004', subject: 'API endpoints v1', status: 'In Progress', assigned_to: 'John Smith', due_date: '2024-02-05', priority: 'High', task_type: 'Development' },
  { id: 'T-006', subject: 'Unit tests core', status: 'In Progress', assigned_to: 'Mike Chen', due_date: '2024-02-12', priority: 'Medium', task_type: 'Testing' }
]

describe('Dashboard Task Type Steps (component)', () => {
  beforeEach(() => {
    cy.stub(api.projects, 'getTaskTypeSummary').resolves({ success: true, data: groupsUnordered })
    cy.stub(api.projects, 'getTasksByType').resolves({ success: true, data: tasksForDev })
  })

  it('renders steps ordered by custom_priority and opens modal on click', () => {
    cy.mount(<Dashboard viewMode="projects" initialDashboardData={minimalData} />)

    // Expand the project card (it starts collapsed)
    cy.contains('[data-testid="project-card-Alpha"] .ant-collapse-header', 'Alpha').click({ force: true })

    // Ensure summary API called
    cy.wrap(api.projects.getTaskTypeSummary).should('have.been.calledWith', 'proj-001')

    // Steps should be visible
    cy.get('[data-testid="task-type-steps"]').should('be.visible')

    // Verify order: Planning, Development, Testing
    cy.get('[data-testid="task-type-steps"] .ant-steps-item').eq(0).should('contain', 'Planning')
    cy.get('[data-testid="task-type-steps"] .ant-steps-item').eq(1).should('contain', 'Development')
    cy.get('[data-testid="task-type-steps"] .ant-steps-item').eq(2).should('contain', 'Testing')

    // Click on Development step to open modal
    cy.get('[data-testid="task-type-steps"] .ant-steps-item').eq(1).click()

    // Modal should show tasks table
    cy.get('.ant-modal').should('be.visible')
    cy.get('.ant-modal .ant-table').should('be.visible')
    cy.get('.ant-modal .ant-table').within(() => {
      cy.contains('th', 'Task').should('exist')
      cy.contains('th', 'Assigned To').should('exist')
      cy.contains('th', 'Due').should('exist')
      cy.contains('th', 'Priority').should('exist')
      cy.contains('th', 'Status').should('exist')
    })
  })

  it('works on mobile viewport', () => {
    cy.viewport(375, 667)
    cy.mount(<Dashboard viewMode="projects" initialDashboardData={minimalData} />)
    cy.contains('[data-testid="project-card-Alpha"] .ant-collapse-header', 'Alpha').click({ force: true })
    cy.get('[data-testid="task-type-steps"]').should('be.visible')
  })
})


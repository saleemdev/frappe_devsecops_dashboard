// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to visit the DevSecOps Dashboard
Cypress.Commands.add('visitDashboard', () => {
  cy.visit('/frontend')
  cy.wait(2000) // Wait for initial load
})

// Custom command to wait for API response
Cypress.Commands.add('waitForProjectsAPI', () => {
  cy.intercept('GET', '/api/method/frappe_avaza.api.projects.get_projects_with_tasks').as('getProjects')
  cy.wait('@getProjects', { timeout: 15000 })
})

// Custom command to check accessibility
Cypress.Commands.add('checkA11y', (context = null, options = null) => {
  cy.injectAxe()
  cy.checkA11y(context, options)
})

// Custom command to test responsive behavior
Cypress.Commands.add('testResponsive', (callback) => {
  const viewports = [
    { width: 320, height: 568, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1280, height: 720, name: 'desktop' }
  ]
  
  viewports.forEach(viewport => {
    cy.viewport(viewport.width, viewport.height)
    cy.log(`Testing on ${viewport.name} (${viewport.width}x${viewport.height})`)
    callback(viewport)
  })
})

// Custom command to search projects
Cypress.Commands.add('searchProjects', (searchTerm) => {
  cy.get('[data-testid="search-input"]').clear().type(searchTerm)
  cy.wait(500) // Wait for debounced search
})

// Custom command to verify project card structure
Cypress.Commands.add('verifyProjectCard', (projectName) => {
  cy.get(`[data-testid="project-card-${projectName}"]`).within(() => {
    cy.get('[data-testid="project-name"]').should('be.visible')
    cy.get('[data-testid="project-status"]').should('be.visible')
    cy.get('[data-testid="project-client"]').should('be.visible')
    cy.get('[data-testid="sprint-report-button"]').should('be.visible')
    cy.get('[data-testid="delivery-phases"]').should('be.visible')
  })
})

// Custom command to open sprint report modal
Cypress.Commands.add('openSprintReport', (projectName) => {
  cy.get(`[data-testid="project-card-${projectName}"]`)
    .find('[data-testid="sprint-report-button"]')
    .click()
  cy.get('[data-testid="sprint-report-modal"]').should('be.visible')
})

// Custom command to close modal
Cypress.Commands.add('closeModal', () => {
  cy.get('.ant-modal-close').click()
  cy.get('.ant-modal').should('not.exist')
})

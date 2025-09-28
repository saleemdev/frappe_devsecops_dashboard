/**
 * Project App Routing E2E Tests
 * Tests the enhanced project application routing functionality
 */

describe('Project App Routing Enhancement', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('/devsecops-ui')
    
    // Wait for the application to load
    cy.contains('DevSecOps Dashboard', { timeout: 10000 }).should('be.visible')
  })

  it('should navigate to project apps page', () => {
    // Click on project apps menu item
    cy.contains('Project Apps').click()
    
    // Check URL hash
    cy.url().should('include', '#project-apps')
    
    // Check project apps page is displayed
    cy.contains('Project Applications').should('be.visible')
    cy.contains('Add Application').should('be.visible')
  })

  it('should display application cards', () => {
    // Navigate to project apps
    cy.contains('Project Apps').click()
    cy.contains('Project Applications').should('be.visible')
    
    // Check application cards are displayed
    cy.contains('ePrescription API').should('be.visible')
    cy.contains('Patient Portal').should('be.visible')
    cy.contains('Medical Records System').should('be.visible')
    
    // Check card details
    cy.contains('RESTful API for electronic prescription management').should('be.visible')
    cy.contains('Node.js').should('be.visible')
    cy.contains('DEPLOYED').should('be.visible')
  })

  it('should make application cards clickable', () => {
    // Navigate to project apps
    cy.contains('Project Apps').click()
    cy.contains('Project Applications').should('be.visible')
    
    // Click on first application card
    cy.contains('ePrescription API').closest('.ant-card').click()
    
    // Check URL hash is updated for app detail
    cy.url().should('include', '#project-apps/app-001')
    
    // Check app detail view is displayed
    cy.contains('Loading application details...').should('be.visible')
  })

  it('should display application detail view', () => {
    // Navigate directly to app detail
    cy.visit('/devsecops-ui#project-apps/app-001')
    
    // Wait for app detail to load
    cy.contains('ePrescription API', { timeout: 10000 }).should('be.visible')
    
    // Check header elements
    cy.contains('Back to Project Apps').should('be.visible')
    cy.contains('Repository').should('be.visible')
    cy.contains('Live App').should('be.visible')
    cy.contains('Active').should('be.visible')
  })

  it('should display overview metrics in app detail', () => {
    // Navigate to app detail
    cy.visit('/devsecops-ui#project-apps/app-001')
    cy.contains('ePrescription API', { timeout: 10000 }).should('be.visible')
    
    // Check metric cards
    cy.contains('95%').should('be.visible') // Health Score
    cy.contains('88%').should('be.visible') // Security Score
    cy.contains('99.9%').should('be.visible') // Uptime
    cy.contains('145ms').should('be.visible') // Response Time
    
    // Check metric labels
    cy.contains('Health Score').should('be.visible')
    cy.contains('Security Score').should('be.visible')
    cy.contains('Uptime').should('be.visible')
    cy.contains('Avg Response').should('be.visible')
  })

  it('should navigate back from app detail to project apps', () => {
    // Navigate to app detail
    cy.visit('/devsecops-ui#project-apps/app-001')
    cy.contains('ePrescription API', { timeout: 10000 }).should('be.visible')
    
    // Click back button
    cy.contains('Back to Project Apps').click()
    
    // Check navigation back to project apps
    cy.url().should('include', '#project-apps')
    cy.contains('Project Applications').should('be.visible')
  })

  it('should display correct breadcrumb navigation for app detail', () => {
    // Navigate to app detail
    cy.visit('/devsecops-ui#project-apps/app-001')
    cy.contains('ePrescription API', { timeout: 10000 }).should('be.visible')
    
    // Check breadcrumb
    cy.get('.ant-breadcrumb').should('contain', 'Project Apps')
    cy.get('.ant-breadcrumb').should('contain', 'app-001')
  })

  it('should display application information in overview tab', () => {
    // Navigate to app detail
    cy.visit('/devsecops-ui#project-apps/app-001')
    cy.contains('ePrescription API', { timeout: 10000 }).should('be.visible')
    
    // Check overview tab is active by default
    cy.contains('Application Information').should('be.visible')
    cy.contains('ePrescription').should('be.visible') // Project name
    cy.contains('Node.js').should('be.visible') // Technology
    cy.contains('Express.js').should('be.visible') // Framework
    cy.contains('PostgreSQL').should('be.visible') // Database
    cy.contains('v2.1.3').should('be.visible') // Version
    cy.contains('Production').should('be.visible') // Environment
  })

  it('should display environment variables in configuration tab', () => {
    // Navigate to app detail
    cy.visit('/devsecops-ui#project-apps/app-001')
    cy.contains('ePrescription API', { timeout: 10000 }).should('be.visible')
    
    // Click configuration tab
    cy.contains('Configuration').click()
    
    // Check environment variables table
    cy.contains('Environment Variables').should('be.visible')
    cy.contains('NODE_ENV').should('be.visible')
    cy.contains('production').should('be.visible')
    cy.contains('DATABASE_URL').should('be.visible')
    cy.contains('***REDACTED***').should('be.visible')
    
    // Check sensitive column
    cy.contains('Sensitive').should('be.visible')
  })

  it('should display deployment history in deployment tab', () => {
    // Navigate to app detail
    cy.visit('/devsecops-ui#project-apps/app-001')
    cy.contains('ePrescription API', { timeout: 10000 }).should('be.visible')
    
    // Click deployment history tab
    cy.contains('Deployment History').click()
    
    // Check deployment history table
    cy.contains('v2.1.3').should('be.visible')
    cy.contains('v2.1.2').should('be.visible')
    cy.contains('v2.1.1').should('be.visible')
    cy.contains('Sarah Johnson').should('be.visible')
    cy.contains('John Smith').should('be.visible')
    cy.contains('Success').should('be.visible')
    cy.contains('Failed').should('be.visible')
  })

  it('should display security scans in security tab', () => {
    // Navigate to app detail
    cy.visit('/devsecops-ui#project-apps/app-001')
    cy.contains('ePrescription API', { timeout: 10000 }).should('be.visible')
    
    // Click security scans tab
    cy.contains('Security Scans').click()
    
    // Check compliance status alert
    cy.contains('Security Compliance Status').should('be.visible')
    cy.contains('Application is compliant with DOD security standards').should('be.visible')
    
    // Check security scans table
    cy.contains('SAST').should('be.visible')
    cy.contains('DAST').should('be.visible')
    cy.contains('Dependency Scan').should('be.visible')
    cy.contains('Passed').should('be.visible')
    cy.contains('Warning').should('be.visible')
  })

  it('should display team members in team tab', () => {
    // Navigate to app detail
    cy.visit('/devsecops-ui#project-apps/app-001')
    cy.contains('ePrescription API', { timeout: 10000 }).should('be.visible')
    
    // Click team & access tab
    cy.contains('Team & Access').click()
    
    // Check team members
    cy.contains('Team Members').should('be.visible')
    cy.contains('John Smith').should('be.visible')
    cy.contains('Lead Developer').should('be.visible')
    cy.contains('Sarah Johnson').should('be.visible')
    cy.contains('DevOps Engineer').should('be.visible')
    cy.contains('Mike Davis').should('be.visible')
    cy.contains('Security Analyst').should('be.visible')
  })

  it('should prevent card navigation when clicking action buttons', () => {
    // Navigate to project apps
    cy.contains('Project Apps').click()
    cy.contains('Project Applications').should('be.visible')
    
    // Click edit button (should not navigate to app detail)
    cy.get('.anticon-edit').first().click()
    
    // Should open edit modal instead of navigating
    cy.contains('Edit Application').should('be.visible')
    cy.url().should('include', '#project-apps')
    cy.url().should('not.include', 'app-001')
  })

  it('should handle invalid app ID gracefully', () => {
    // Navigate to invalid app detail
    cy.visit('/devsecops-ui#project-apps/invalid-app')
    
    // Should show not found state
    cy.contains('Application not found', { timeout: 10000 }).should('be.visible')
    cy.contains('Back to Project Apps').should('be.visible')
  })

  it('should work on mobile devices', () => {
    // Set mobile viewport
    cy.viewport(375, 667)
    
    // Navigate to project apps via mobile menu
    cy.get('.anticon-menu').click()
    cy.contains('Project Apps').click()
    
    // Check project apps page loads
    cy.contains('Project Applications').should('be.visible')
    
    // Click on app card
    cy.contains('ePrescription API').closest('.ant-card').click()
    
    // Check app detail view loads
    cy.contains('Loading application details...').should('be.visible')
    cy.url().should('include', '#project-apps/app-001')
  })

  it('should handle external links correctly', () => {
    // Navigate to app detail
    cy.visit('/devsecops-ui#project-apps/app-001')
    cy.contains('ePrescription API', { timeout: 10000 }).should('be.visible')
    
    // Check repository and live app links exist
    cy.contains('Repository').should('be.visible')
    cy.contains('Live App').should('be.visible')
    
    // Check links have correct attributes
    cy.contains('Repository').should('have.attr', 'href')
    cy.contains('Live App').should('have.attr', 'href')
  })

  it('should display performance metrics correctly', () => {
    // Navigate to app detail
    cy.visit('/devsecops-ui#project-apps/app-001')
    cy.contains('ePrescription API', { timeout: 10000 }).should('be.visible')
    
    // Check performance metrics in overview
    cy.contains('Performance Metrics').should('be.visible')
    cy.contains('0.02%').should('be.visible') // Error Rate
    cy.contains('1250 req/min').should('be.visible') // Throughput
  })

  it('should navigate between multiple apps correctly', () => {
    // Navigate to project apps
    cy.contains('Project Apps').click()
    cy.contains('Project Applications').should('be.visible')
    
    // Click first app
    cy.contains('ePrescription API').closest('.ant-card').click()
    cy.url().should('include', '#project-apps/app-001')
    
    // Go back to project apps
    cy.contains('Back to Project Apps').click()
    cy.contains('Project Applications').should('be.visible')
    
    // Click second app
    cy.contains('Patient Portal').closest('.ant-card').click()
    cy.url().should('include', '#project-apps/app-002')
  })

  it('should maintain state when navigating between routes', () => {
    // Navigate to app detail
    cy.visit('/devsecops-ui#project-apps/app-001')
    cy.contains('ePrescription API', { timeout: 10000 }).should('be.visible')
    
    // Navigate to incidents
    cy.contains('Incidents').click()
    cy.contains('Security Incidents').should('be.visible')
    cy.url().should('include', '#incidents')
    
    // Navigate back to project apps
    cy.contains('Project Apps').click()
    cy.contains('Project Applications').should('be.visible')
    cy.url().should('include', '#project-apps')
    cy.url().should('not.include', 'app-001')
  })
})

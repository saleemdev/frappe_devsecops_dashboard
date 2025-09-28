/**
 * Incidents Management E2E Tests
 * Tests the incident management system functionality
 */

describe('Incidents Management', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('/devsecops-ui')
    
    // Wait for the application to load
    cy.contains('DevSecOps Dashboard', { timeout: 10000 }).should('be.visible')
  })

  it('should display incidents menu item in navigation', () => {
    // Check that incidents menu item exists
    cy.contains('Incidents').should('be.visible')
  })

  it('should navigate to incidents page', () => {
    // Click on incidents menu item
    cy.contains('Incidents').click()
    
    // Check URL hash
    cy.url().should('include', '#incidents')
    
    // Check incidents page is displayed
    cy.contains('Security Incidents').should('be.visible')
    cy.contains('Add Incident').should('be.visible')
    cy.contains('Refresh').should('be.visible')
  })

  it('should display incidents table with data', () => {
    // Navigate to incidents
    cy.contains('Incidents').click()
    cy.contains('Security Incidents').should('be.visible')
    
    // Check table headers
    cy.contains('ID').should('be.visible')
    cy.contains('Title').should('be.visible')
    cy.contains('Severity').should('be.visible')
    cy.contains('Status').should('be.visible')
    cy.contains('Created Date').should('be.visible')
    cy.contains('Assigned To').should('be.visible')
    cy.contains('Actions').should('be.visible')
    
    // Check sample data is displayed
    cy.contains('INC-001').should('be.visible')
    cy.contains('SQL Injection Vulnerability').should('be.visible')
    cy.contains('Critical').should('be.visible')
    cy.contains('John Smith').should('be.visible')
  })

  it('should open add incident modal', () => {
    // Navigate to incidents
    cy.contains('Incidents').click()
    cy.contains('Security Incidents').should('be.visible')
    
    // Click add incident button
    cy.contains('Add Incident').click()
    
    // Check modal is open
    cy.contains('Add New Incident').should('be.visible')
    
    // Check form fields
    cy.get('input[placeholder="Enter incident title"]').should('be.visible')
    cy.get('textarea[placeholder="Describe the incident in detail"]').should('be.visible')
    cy.contains('Severity').should('be.visible')
    cy.contains('Category').should('be.visible')
    cy.get('input[placeholder="Enter assigned user name"]').should('be.visible')
  })

  it('should search incidents', () => {
    // Navigate to incidents
    cy.contains('Incidents').click()
    cy.contains('Security Incidents').should('be.visible')
    
    // Search for specific incident
    cy.get('input[placeholder="Search incidents..."]').type('SQL Injection')
    
    // Check filtered results
    cy.contains('SQL Injection Vulnerability').should('be.visible')
    cy.contains('Unauthorized Access').should('not.exist')
  })

  it('should filter incidents by severity', () => {
    // Navigate to incidents
    cy.contains('Incidents').click()
    cy.contains('Security Incidents').should('be.visible')
    
    // Open severity filter
    cy.get('.ant-select').contains('All Severity').click()
    cy.contains('Critical').click()
    
    // Check only critical incidents are shown
    cy.contains('SQL Injection Vulnerability').should('be.visible')
    cy.contains('Unauthorized Access').should('not.exist')
  })

  it('should filter incidents by status', () => {
    // Navigate to incidents
    cy.contains('Incidents').click()
    cy.contains('Security Incidents').should('be.visible')
    
    // Open status filter
    cy.get('.ant-select').contains('All Status').click()
    cy.contains('Closed').click()
    
    // Check only closed incidents are shown
    cy.contains('Compliance Audit Finding').should('be.visible')
    cy.contains('SQL Injection Vulnerability').should('not.exist')
  })

  it('should view incident details', () => {
    // Navigate to incidents
    cy.contains('Incidents').click()
    cy.contains('Security Incidents').should('be.visible')
    
    // Click view details button (eye icon)
    cy.get('.anticon-eye').first().click()
    
    // Check details modal
    cy.contains('Incident Details - INC-001').should('be.visible')
    cy.contains('SQL Injection Vulnerability').should('be.visible')
    cy.contains('Critical').should('be.visible')
    cy.contains('Security').should('be.visible')
  })

  it('should edit incident', () => {
    // Navigate to incidents
    cy.contains('Incidents').click()
    cy.contains('Security Incidents').should('be.visible')
    
    // Click edit button (edit icon)
    cy.get('.anticon-edit').first().click()
    
    // Check edit modal
    cy.contains('Edit Incident').should('be.visible')
    
    // Check pre-filled data
    cy.get('input[value*="SQL Injection"]').should('be.visible')
  })

  it('should mark incident as closed', () => {
    // Navigate to incidents
    cy.contains('Incidents').click()
    cy.contains('Security Incidents').should('be.visible')
    
    // Click mark as closed button (check circle icon)
    cy.get('.anticon-check-circle').first().click()
    
    // Confirm the action
    cy.contains('Mark this incident as closed?').should('be.visible')
    cy.contains('Yes').click()
    
    // Check success message
    cy.contains('Incident marked as closed').should('be.visible')
  })

  it('should validate required fields in add incident form', () => {
    // Navigate to incidents
    cy.contains('Incidents').click()
    cy.contains('Security Incidents').should('be.visible')
    
    // Open add incident modal
    cy.contains('Add Incident').click()
    cy.contains('Add New Incident').should('be.visible')
    
    // Try to submit without filling required fields
    cy.contains('Create Incident').click()
    
    // Check validation messages
    cy.contains('Please enter incident title').should('be.visible')
    cy.contains('Please enter incident description').should('be.visible')
    cy.contains('Please select severity').should('be.visible')
    cy.contains('Please select category').should('be.visible')
    cy.contains('Please enter assigned user').should('be.visible')
  })

  it('should create new incident successfully', () => {
    // Navigate to incidents
    cy.contains('Incidents').click()
    cy.contains('Security Incidents').should('be.visible')
    
    // Open add incident modal
    cy.contains('Add Incident').click()
    cy.contains('Add New Incident').should('be.visible')
    
    // Fill form fields
    cy.get('input[placeholder="Enter incident title"]').type('Test Incident')
    cy.get('textarea[placeholder="Describe the incident in detail"]').type('Test incident description')
    
    // Select severity
    cy.get('.ant-select').contains('Select severity').click()
    cy.contains('High').click()
    
    // Select category
    cy.get('.ant-select').contains('Select category').click()
    cy.contains('Security').click()
    
    cy.get('input[placeholder="Enter assigned user name"]').type('Test User')
    
    // Submit form
    cy.contains('Create Incident').click()
    
    // Check success message
    cy.contains('Incident created successfully').should('be.visible')
  })

  it('should refresh incidents list', () => {
    // Navigate to incidents
    cy.contains('Incidents').click()
    cy.contains('Security Incidents').should('be.visible')
    
    // Click refresh button
    cy.contains('Refresh').click()
    
    // Check loading state appears briefly
    cy.get('.ant-btn-loading').should('exist')
  })

  it('should display correct breadcrumb navigation', () => {
    // Navigate to incidents
    cy.contains('Incidents').click()
    cy.contains('Security Incidents').should('be.visible')
    
    // Check breadcrumb
    cy.get('.ant-breadcrumb').should('contain', 'Incidents')
  })

  it('should work on mobile devices', () => {
    // Set mobile viewport
    cy.viewport(375, 667)
    
    // Open mobile menu
    cy.get('.anticon-menu').click()
    
    // Check incidents is in mobile menu
    cy.contains('Incidents').should('be.visible')
    
    // Click incidents in mobile menu
    cy.contains('Incidents').click()
    
    // Check mobile menu closes and incidents page loads
    cy.contains('Security Incidents').should('be.visible')
    cy.url().should('include', '#incidents')
  })

  it('should handle direct URL navigation to incidents', () => {
    // Navigate directly to incidents URL
    cy.visit('/devsecops-ui#incidents')
    
    // Check incidents page loads directly
    cy.contains('Security Incidents', { timeout: 10000 }).should('be.visible')
    cy.contains('Add Incident').should('be.visible')
  })

  it('should display pagination correctly', () => {
    // Navigate to incidents
    cy.contains('Incidents').click()
    cy.contains('Security Incidents').should('be.visible')
    
    // Check pagination info
    cy.contains(/1-5 of 5 incidents/).should('be.visible')
  })

  it('should sort incidents by columns', () => {
    // Navigate to incidents
    cy.contains('Incidents').click()
    cy.contains('Security Incidents').should('be.visible')
    
    // Click on ID column header to sort
    cy.contains('th', 'ID').click()
    
    // Check table is still displayed (sorting functionality)
    cy.contains('INC-001').should('be.visible')
  })

  it('should clear search filter', () => {
    // Navigate to incidents
    cy.contains('Incidents').click()
    cy.contains('Security Incidents').should('be.visible')
    
    // Search for specific incident
    cy.get('input[placeholder="Search incidents..."]').type('SQL Injection')
    
    // Clear search
    cy.get('.anticon-close-circle').click()
    
    // Check all incidents are shown again
    cy.contains('SQL Injection Vulnerability').should('be.visible')
    cy.contains('Unauthorized Access').should('be.visible')
  })
})

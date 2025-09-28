describe('DevSecOps Dashboard - Responsive Design', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/method/frappe_avaza.api.projects.get_projects_with_tasks', {
      fixture: 'projects.json'
    }).as('getProjects')
  })

  describe('Mobile Viewport (320px)', () => {
    beforeEach(() => {
      cy.viewport(320, 568)
      cy.visitDashboard()
      cy.waitForProjectsAPI()
    })

    it('should display correctly on mobile devices', () => {
      // Check search container is responsive
      cy.get('[data-testid="search-container"]').should('be.visible')
      cy.get('[data-testid="search-input"]').should('be.visible')
      
      // Check projects grid adapts to mobile
      cy.get('[data-testid="projects-grid"]').should('be.visible')
      cy.get('[data-testid="project-card-Test Project Alpha"]').should('be.visible')
      
      // Check project cards stack vertically
      cy.get('[data-testid="projects-grid"]').should('have.css', 'display', 'grid')
    })

    it('should have readable text on mobile', () => {
      cy.get('[data-testid="project-card-Test Project Alpha"]').within(() => {
        cy.get('[data-testid="project-name"]').should('be.visible')
        cy.get('[data-testid="project-status"]').should('be.visible')
        cy.get('[data-testid="project-client"]').should('be.visible')
      })
    })

    it('should have accessible buttons on mobile', () => {
      cy.get('[data-testid="sprint-report-button"]').first().should('be.visible')
      cy.get('[data-testid="sprint-report-button"]').first().should('have.css', 'min-height')
    })

    it('should handle search on mobile', () => {
      cy.searchProjects('Alpha')
      cy.get('[data-testid="project-card-Test Project Alpha"]').should('be.visible')
      cy.get('[data-testid="project-card-Test Project Beta"]').should('not.exist')
    })
  })

  describe('Tablet Viewport (768px)', () => {
    beforeEach(() => {
      cy.viewport(768, 1024)
      cy.visitDashboard()
      cy.waitForProjectsAPI()
    })

    it('should display correctly on tablet devices', () => {
      cy.get('[data-testid="search-container"]').should('be.visible')
      cy.get('[data-testid="projects-grid"]').should('be.visible')
      
      // Check if cards can fit side by side on tablet
      cy.get('[data-testid="project-card-Test Project Alpha"]').should('be.visible')
      cy.get('[data-testid="project-card-Test Project Beta"]').should('be.visible')
    })

    it('should maintain proper spacing on tablet', () => {
      cy.get('[data-testid="projects-grid"]').should('have.css', 'gap')
      cy.get('[data-testid="search-container"]').should('have.css', 'padding')
    })

    it('should show delivery phases clearly on tablet', () => {
      cy.get('[data-testid="project-card-Test Project Alpha"]').within(() => {
        cy.get('[data-testid="delivery-phases"]').should('be.visible')
        cy.get('[data-testid="delivery-phases"] .ant-steps-item').should('have.length', 3)
      })
    })
  })

  describe('Desktop Viewport (1280px)', () => {
    beforeEach(() => {
      cy.viewport(1280, 720)
      cy.visitDashboard()
      cy.waitForProjectsAPI()
    })

    it('should display optimally on desktop', () => {
      cy.get('[data-testid="search-container"]').should('be.visible')
      cy.get('[data-testid="projects-grid"]').should('be.visible')
      
      // Check full layout is visible
      cy.get('[data-testid="project-card-Test Project Alpha"]').should('be.visible')
      cy.get('[data-testid="project-card-Test Project Beta"]').should('be.visible')
    })

    it('should utilize full width on desktop', () => {
      cy.get('[data-testid="dashboard-container"]').should('have.css', 'max-width')
      cy.get('[data-testid="projects-grid"]').should('have.css', 'grid-template-columns')
    })

    it('should show all project details clearly', () => {
      cy.get('[data-testid="project-card-Test Project Alpha"]').within(() => {
        cy.get('[data-testid="project-name"]').should('be.visible')
        cy.get('[data-testid="project-status"]').should('be.visible')
        cy.get('[data-testid="project-client"]').should('be.visible')
        cy.get('[data-testid="task-count"]').should('be.visible')
        cy.get('[data-testid="completion-rate"]').should('be.visible')
        cy.get('[data-testid="delivery-phases"]').should('be.visible')
        cy.get('[data-testid="sprint-report-button"]').should('be.visible')
      })
    })
  })

  describe('Cross-Viewport Functionality', () => {
    it('should maintain search functionality across all viewports', () => {
      cy.testResponsive((viewport) => {
        cy.visitDashboard()
        cy.waitForProjectsAPI()
        
        cy.searchProjects('Alpha')
        cy.get('[data-testid="project-card-Test Project Alpha"]').should('be.visible')
        cy.get('[data-testid="project-card-Test Project Beta"]').should('not.exist')
        
        cy.get('[data-testid="search-input"]').clear()
        cy.get('[data-testid="project-card-Test Project Alpha"]').should('be.visible')
        cy.get('[data-testid="project-card-Test Project Beta"]').should('be.visible')
      })
    })

    it('should maintain modal functionality across all viewports', () => {
      cy.testResponsive((viewport) => {
        cy.visitDashboard()
        cy.waitForProjectsAPI()
        
        cy.openSprintReport('Test Project Alpha')
        cy.get('[data-testid="sprint-report-modal"]').should('be.visible')
        
        // Check modal is properly sized for viewport
        cy.get('[data-testid="sprint-report-modal"]').should('be.visible')
        
        cy.closeModal()
        cy.get('[data-testid="sprint-report-modal"]').should('not.exist')
      })
    })
  })

  describe('Touch and Interaction', () => {
    beforeEach(() => {
      cy.viewport(320, 568) // Mobile viewport for touch testing
      cy.visitDashboard()
      cy.waitForProjectsAPI()
    })

    it('should handle touch interactions on mobile', () => {
      // Test touch on search input
      cy.get('[data-testid="search-input"]').click()
      cy.get('[data-testid="search-input"]').should('be.focused')
      
      // Test touch on buttons
      cy.get('[data-testid="sprint-report-button"]').first().click()
      cy.get('[data-testid="sprint-report-modal"]').should('be.visible')
      
      cy.closeModal()
    })

    it('should have proper touch targets', () => {
      // Check minimum touch target size (44px recommended)
      cy.get('[data-testid="sprint-report-button"]').first()
        .should('have.css', 'min-height')
        .and('match', /\d+px/)
    })
  })
})

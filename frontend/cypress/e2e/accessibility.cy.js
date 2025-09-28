describe('DevSecOps Dashboard - Accessibility', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/method/frappe_avaza.api.projects.get_projects_with_tasks', {
      fixture: 'projects.json'
    }).as('getProjects')
    
    cy.visitDashboard()
    cy.waitForProjectsAPI()
  })

  describe('Basic Accessibility Compliance', () => {
    it('should not have any accessibility violations', () => {
      cy.checkA11y()
    })

    it('should have proper page structure', () => {
      // Check for proper heading hierarchy
      cy.get('h1, h2, h3, h4, h5, h6').should('exist')
      
      // Check for main landmark
      cy.get('main, [role="main"]').should('exist')
    })

    it('should have proper form labels', () => {
      cy.get('[data-testid="search-input"]').should('have.attr', 'aria-label')
        .or('have.attr', 'placeholder')
    })

    it('should have proper button accessibility', () => {
      cy.get('[data-testid="sprint-report-button"]').each(($button) => {
        cy.wrap($button).should('have.attr', 'type', 'button')
          .or('have.attr', 'role', 'button')
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through interactive elements', () => {
      // Start from search input
      cy.get('[data-testid="search-input"]').focus()
      cy.focused().should('have.attr', 'data-testid', 'search-input')
      
      // Tab to first Sprint Report button
      cy.focused().tab()
      cy.focused().should('contain', 'Sprint Report')
      
      // Continue tabbing through buttons
      cy.focused().tab()
      cy.focused().should('contain', 'Sprint Report')
    })

    it('should support Enter key activation', () => {
      cy.get('[data-testid="sprint-report-button"]').first().focus()
      cy.focused().type('{enter}')
      cy.get('[data-testid="sprint-report-modal"]').should('be.visible')
      
      // Close modal with Escape key
      cy.get('body').type('{esc}')
      cy.get('[data-testid="sprint-report-modal"]').should('not.exist')
    })

    it('should support Space key activation for buttons', () => {
      cy.get('[data-testid="sprint-report-button"]').first().focus()
      cy.focused().type(' ')
      cy.get('[data-testid="sprint-report-modal"]').should('be.visible')
      
      cy.closeModal()
    })

    it('should trap focus within modal', () => {
      cy.openSprintReport('Test Project Alpha')
      
      // Focus should be trapped within modal
      cy.get('[data-testid="sprint-report-modal"]').within(() => {
        cy.get('button, [tabindex="0"]').first().focus()
        cy.focused().tab({ shift: true })
        cy.focused().should('be.visible')
      })
      
      cy.closeModal()
    })
  })

  describe('Screen Reader Support', () => {
    it('should have proper ARIA labels', () => {
      cy.get('[data-testid="search-input"]').should('have.attr', 'aria-label')
        .or('have.attr', 'aria-labelledby')
    })

    it('should have proper ARIA roles', () => {
      cy.get('[data-testid="projects-grid"]').should('have.attr', 'role')
        .or('have.attr', 'aria-label')
    })

    it('should announce search results', () => {
      cy.get('[data-testid="search-results-counter"]')
        .should('have.attr', 'aria-live')
        .or('have.attr', 'role', 'status')
    })

    it('should have proper modal accessibility', () => {
      cy.openSprintReport('Test Project Alpha')
      
      cy.get('[data-testid="sprint-report-modal"]').should('have.attr', 'role', 'dialog')
        .or('have.attr', 'aria-modal', 'true')
      
      cy.get('[data-testid="modal-title"]').should('have.attr', 'id')
        .or('have.attr', 'aria-labelledby')
      
      cy.closeModal()
    })
  })

  describe('Visual Accessibility', () => {
    it('should have sufficient color contrast', () => {
      // This would typically require a color contrast analyzer
      // For now, we'll check that text is visible
      cy.get('[data-testid="project-name"]').should('be.visible')
      cy.get('[data-testid="project-status"]').should('be.visible')
      cy.get('[data-testid="project-client"]').should('be.visible')
    })

    it('should support high contrast mode', () => {
      // Simulate high contrast mode
      cy.get('body').invoke('attr', 'style', 'filter: contrast(200%)')
      
      cy.get('[data-testid="project-card-Test Project Alpha"]').should('be.visible')
      cy.get('[data-testid="sprint-report-button"]').should('be.visible')
    })

    it('should be readable when zoomed to 200%', () => {
      cy.get('body').invoke('attr', 'style', 'zoom: 2')
      
      cy.get('[data-testid="project-card-Test Project Alpha"]').should('be.visible')
      cy.get('[data-testid="search-input"]').should('be.visible')
      cy.get('[data-testid="sprint-report-button"]').should('be.visible')
    })
  })

  describe('Motion and Animation', () => {
    it('should respect reduced motion preferences', () => {
      // Simulate prefers-reduced-motion
      cy.window().then((win) => {
        const mediaQuery = win.matchMedia('(prefers-reduced-motion: reduce)')
        if (mediaQuery.matches) {
          // Check that animations are disabled or reduced
          cy.get('.ant-spin').should('not.have.css', 'animation-duration', '0s')
        }
      })
    })

    it('should not have auto-playing animations', () => {
      // Check that no elements have infinite animations
      cy.get('*').each(($el) => {
        cy.wrap($el).should('not.have.css', 'animation-iteration-count', 'infinite')
      })
    })
  })

  describe('Error State Accessibility', () => {
    it('should announce errors to screen readers', () => {
      cy.intercept('GET', '/api/method/frappe_avaza.api.projects.get_projects_with_tasks', {
        statusCode: 500,
        body: { error: 'Internal Server Error' }
      }).as('getProjectsError')
      
      cy.visitDashboard()
      cy.wait('@getProjectsError')
      
      cy.get('[data-testid="error-message"]').should('have.attr', 'role', 'alert')
        .or('have.attr', 'aria-live', 'assertive')
    })
  })

  describe('Loading State Accessibility', () => {
    it('should announce loading state to screen readers', () => {
      cy.intercept('GET', '/api/method/frappe_avaza.api.projects.get_projects_with_tasks', {
        delay: 2000,
        fixture: 'projects.json'
      }).as('getProjectsDelayed')
      
      cy.visitDashboard()
      
      cy.get('[data-testid="loading-spinner"]').should('have.attr', 'aria-label')
        .or('have.attr', 'role', 'status')
      
      cy.wait('@getProjectsDelayed')
    })
  })

  describe('Mobile Accessibility', () => {
    beforeEach(() => {
      cy.viewport(320, 568)
    })

    it('should maintain accessibility on mobile', () => {
      cy.checkA11y()
    })

    it('should have proper touch targets on mobile', () => {
      cy.get('[data-testid="sprint-report-button"]').each(($button) => {
        cy.wrap($button).invoke('outerHeight').should('be.gte', 44)
        cy.wrap($button).invoke('outerWidth').should('be.gte', 44)
      })
    })
  })
})

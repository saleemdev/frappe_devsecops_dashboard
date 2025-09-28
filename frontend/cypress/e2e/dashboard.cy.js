describe('DevSecOps Dashboard', () => {
  beforeEach(() => {
    // Intercept API calls and provide mock data
    cy.intercept('GET', '/api/method/frappe_avaza.api.projects.get_projects_with_tasks', {
      fixture: 'projects.json'
    }).as('getProjects')
    
    cy.visitDashboard()
  })

  describe('Page Load and Initial State', () => {
    it('should load the dashboard without errors', () => {
      cy.waitForProjectsAPI()
      cy.get('[data-testid="dashboard-container"]').should('be.visible')
      cy.get('[data-testid="search-container"]').should('be.visible')
      cy.get('[data-testid="projects-grid"]').should('be.visible')
    })

    it('should display the correct page title', () => {
      cy.title().should('contain', 'DevSecOps Dashboard')
    })

    it('should not have any console errors', () => {
      cy.window().then((win) => {
        cy.spy(win.console, 'error').as('consoleError')
      })
      cy.waitForProjectsAPI()
      cy.get('@consoleError').should('not.have.been.called')
    })
  })

  describe('Project Cards Display', () => {
    it('should display project cards with correct data', () => {
      cy.waitForProjectsAPI()
      
      // Check first project card
      cy.get('[data-testid="project-card-Test Project Alpha"]').within(() => {
        cy.get('[data-testid="project-name"]').should('contain', 'Test Project Alpha')
        cy.get('[data-testid="project-status"]').should('contain', 'Active')
        cy.get('[data-testid="project-client"]').should('contain', 'Test Client A')
        cy.get('[data-testid="task-count"]').should('contain', '8')
        cy.get('[data-testid="completion-rate"]').should('contain', '75.5%')
      })

      // Check second project card
      cy.get('[data-testid="project-card-Test Project Beta"]').within(() => {
        cy.get('[data-testid="project-name"]').should('contain', 'Test Project Beta')
        cy.get('[data-testid="project-status"]').should('contain', 'On Hold')
        cy.get('[data-testid="project-client"]').should('contain', 'Test Client B')
        cy.get('[data-testid="task-count"]').should('contain', '12')
        cy.get('[data-testid="completion-rate"]').should('contain', '45.2%')
      })
    })

    it('should display delivery phases correctly', () => {
      cy.waitForProjectsAPI()
      
      cy.get('[data-testid="project-card-Test Project Alpha"]').within(() => {
        cy.get('[data-testid="delivery-phases"]').should('be.visible')
        cy.get('[data-testid="phase-Planning"]').should('have.class', 'complete')
        cy.get('[data-testid="phase-Development"]').should('have.class', 'in_progress')
        cy.get('[data-testid="phase-Testing"]').should('have.class', 'pending')
      })
    })

    it('should have Sprint Report buttons on each project card', () => {
      cy.waitForProjectsAPI()
      
      cy.get('[data-testid="project-card-Test Project Alpha"]')
        .find('[data-testid="sprint-report-button"]')
        .should('be.visible')
        .should('contain', 'Sprint Report')

      cy.get('[data-testid="project-card-Test Project Beta"]')
        .find('[data-testid="sprint-report-button"]')
        .should('be.visible')
        .should('contain', 'Sprint Report')
    })
  })

  describe('Search Functionality', () => {
    it('should filter projects based on search input', () => {
      cy.waitForProjectsAPI()
      
      // Initially both projects should be visible
      cy.get('[data-testid="project-card-Test Project Alpha"]').should('be.visible')
      cy.get('[data-testid="project-card-Test Project Beta"]').should('be.visible')
      
      // Search for "Alpha"
      cy.searchProjects('Alpha')
      cy.get('[data-testid="project-card-Test Project Alpha"]').should('be.visible')
      cy.get('[data-testid="project-card-Test Project Beta"]').should('not.exist')
      
      // Clear search
      cy.get('[data-testid="search-input"]').clear()
      cy.get('[data-testid="project-card-Test Project Alpha"]').should('be.visible')
      cy.get('[data-testid="project-card-Test Project Beta"]').should('be.visible')
    })

    it('should show search results counter', () => {
      cy.waitForProjectsAPI()
      
      cy.get('[data-testid="search-results-counter"]').should('contain', '2 projects found')
      
      cy.searchProjects('Alpha')
      cy.get('[data-testid="search-results-counter"]').should('contain', '1 project found')
      
      cy.searchProjects('NonExistent')
      cy.get('[data-testid="search-results-counter"]').should('contain', '0 projects found')
    })

    it('should handle empty search gracefully', () => {
      cy.waitForProjectsAPI()
      
      cy.searchProjects('NonExistentProject')
      cy.get('[data-testid="no-projects-message"]').should('be.visible')
      cy.get('[data-testid="no-projects-message"]').should('contain', 'No projects found')
    })
  })

  describe('Sprint Report Modal', () => {
    it('should open Sprint Report modal when button is clicked', () => {
      cy.waitForProjectsAPI()
      
      cy.openSprintReport('Test Project Alpha')
      cy.get('[data-testid="sprint-report-modal"]').should('be.visible')
      cy.get('[data-testid="modal-title"]').should('contain', 'Sprint Report - Test Project Alpha')
    })

    it('should display project information in the modal', () => {
      cy.waitForProjectsAPI()
      
      cy.openSprintReport('Test Project Alpha')
      cy.get('[data-testid="sprint-report-modal"]').within(() => {
        cy.get('[data-testid="modal-project-name"]').should('contain', 'Test Project Alpha')
        cy.get('[data-testid="modal-project-status"]').should('contain', 'Active')
        cy.get('[data-testid="modal-project-client"]').should('contain', 'Test Client A')
        cy.get('[data-testid="modal-task-count"]').should('contain', '8')
        cy.get('[data-testid="modal-completion-rate"]').should('contain', '75.5%')
      })
    })

    it('should close modal when close button is clicked', () => {
      cy.waitForProjectsAPI()
      
      cy.openSprintReport('Test Project Alpha')
      cy.get('[data-testid="sprint-report-modal"]').should('be.visible')
      
      cy.closeModal()
      cy.get('[data-testid="sprint-report-modal"]').should('not.exist')
    })

    it('should close modal when clicking outside', () => {
      cy.waitForProjectsAPI()
      
      cy.openSprintReport('Test Project Alpha')
      cy.get('[data-testid="sprint-report-modal"]').should('be.visible')
      
      cy.get('.ant-modal-mask').click({ force: true })
      cy.get('[data-testid="sprint-report-modal"]').should('not.exist')
    })
  })

  describe('Delivery Lifecycle Stepper', () => {
    it('should not trigger dialogs when stepper items are clicked', () => {
      cy.waitForProjectsAPI()

      cy.get('[data-testid="project-card-Test Project Alpha"]').within(() => {
        cy.get('[data-testid="phase-Planning"]').click()
        cy.get('[data-testid="phase-Development"]').click()
        cy.get('[data-testid="phase-Testing"]').click()
      })

      // Ensure no modal is opened
      cy.get('[data-testid="sprint-report-modal"]').should('not.exist')
      cy.get('.ant-modal').should('not.exist')
    })

    it('should display phases in correct order', () => {
      cy.waitForProjectsAPI()

      cy.get('[data-testid="project-card-Test Project Alpha"]').within(() => {
        cy.get('[data-testid="delivery-phases"] .ant-steps-item').should('have.length', 3)
        cy.get('[data-testid="delivery-phases"] .ant-steps-item').first().should('contain', 'Planning')
        cy.get('[data-testid="delivery-phases"] .ant-steps-item').eq(1).should('contain', 'Development')
        cy.get('[data-testid="delivery-phases"] .ant-steps-item').last().should('contain', 'Testing')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      cy.intercept('GET', '/api/method/frappe_avaza.api.projects.get_projects_with_tasks', {
        statusCode: 500,
        body: { error: 'Internal Server Error' }
      }).as('getProjectsError')

      cy.visitDashboard()
      cy.wait('@getProjectsError')

      cy.get('[data-testid="error-message"]').should('be.visible')
      cy.get('[data-testid="error-message"]').should('contain', 'Error loading projects')
    })

    it('should handle network errors', () => {
      cy.intercept('GET', '/api/method/frappe_avaza.api.projects.get_projects_with_tasks', {
        forceNetworkError: true
      }).as('getProjectsNetworkError')

      cy.visitDashboard()
      cy.wait('@getProjectsNetworkError')

      cy.get('[data-testid="error-message"]').should('be.visible')
    })
  })

  describe('Loading States', () => {
    it('should show loading spinner while fetching data', () => {
      cy.intercept('GET', '/api/method/frappe_avaza.api.projects.get_projects_with_tasks', {
        delay: 2000,
        fixture: 'projects.json'
      }).as('getProjectsDelayed')

      cy.visitDashboard()
      cy.get('[data-testid="loading-spinner"]').should('be.visible')

      cy.wait('@getProjectsDelayed')
      cy.get('[data-testid="loading-spinner"]').should('not.exist')
      cy.get('[data-testid="projects-grid"]').should('be.visible')
    })
  })
})

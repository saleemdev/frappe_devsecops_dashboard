describe('Basic DevSecOps Dashboard Test', () => {
  it('should load the dashboard page', () => {
    cy.visit('/frontend')
    cy.get('body').should('be.visible')
    cy.title().should('contain', 'DevSecOps Dashboard')
  })

  it('should have the root element', () => {
    cy.visit('/frontend')
    cy.get('#root').should('exist')
  })
})

describe('Test search functionality', () => {
    before(() => {
        cy.login('gabriel@torus-digital.com');
    });
    beforeEach(() => {
        cy.visit('http://localhost:3000');
    });

    describe('search for a contact', () => {
        it('should display existing contacts', () => {
            cy.get('#search-input')
            .type('gab')
            .should('have.value', 'gab')
            .type('{enter}')
            .wait(100)
            cy.url().should('eq', 'http://localhost:3000/?query=gab')
            cy.get('#contact-list').children().should('have.length', 1)
            cy.get('#contact-list').find('#Gabriel-Kay').should('exist')
            cy.get('#Gabriel-Kay').click()
            .wait(100)
            cy.url().should('include', 'http://localhost:3000/contacts/')
        });
    });

    describe('search for a chat', () => {
        it('should display existing contacts', () => {
            cy.get('#search-input')
            .type('como estas')
            .should('have.value', 'como estas')
            .type('{enter}')
            .wait(100)
            cy.url().should('eq', 'http://localhost:3000/?query=como+estas')
            cy.get('#contact-list').children().should('have.length', 1)
            cy.get('#contact-list').find('#Gabriel-Kay').should('exist')
        });
    });
});
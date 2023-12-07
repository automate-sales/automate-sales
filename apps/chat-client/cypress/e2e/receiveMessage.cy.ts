describe('Test receiving messages', () => {
    beforeEach(() => {
        cy.login('gabriel@torus-digital.com');
        cy.get('#Gabriel-Kay').click()
    });
    describe('receive a text message', () => {
        it('should display a new incoming text message', () => {
            console.log('message received')
        });
    });
});
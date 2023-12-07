describe('Test sending messages', () => {
    beforeEach(() => {
        cy.login('gabriel@torus-digital.com');
        cy.get('#Gabriel-Kay').click();
    });
    describe('send a text message', () => {
        it('should display a new outgoing text message', () => {
            console.log('message sent')
        });
    });
});
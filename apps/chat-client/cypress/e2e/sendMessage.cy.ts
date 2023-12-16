describe('Test sending messages', () => {
    beforeEach(() => {
        cy.login('gabriel@torus-digital.com');
        cy.get('#Gabriel-Kay').click();
    });
    describe('send a text message', () => {
        it('should display a new outgoing text message', () => {
            const text = 'hola esto es una prueba.'
            cy.get('#message-input').click().type(text).should('have.value', text);
            cy.get('#submit-button').should('be.visible').should('be.enabled').click().wait(1000);
            cy.get('.message-box').last().scrollIntoView().then(lastMessageBox => {
                cy.wrap(lastMessageBox).should('have.class', 'outgoing');
                cy.wrap(lastMessageBox).should('contain', text);
                cy.wrap(lastMessageBox).find('.date').should('be.visible');
            });
        });
    });

    describe('send an audio message', () => {
        it('should display a new outgoing audio message', () => {
        });
    });

    describe('send an image message', () => {
        it('should display a new outgoing image message', () => {
            const fileName = 'test-media/image.jpg';
            
            cy.get('#attachments-button').click();
            cy.get('#attachments-menu').should('be.visible');
            // Set file to the input and trigger change event
            cy.get('input[type="file"]#file').should('exist').selectFile(fileName, { force: true });
            // Perform the upload action
            cy.get('#submit-button').should('be.visible').click().wait(4000);
            // Assert that the new outgoing image message is displayed
            cy.get('.message-box').last().scrollIntoView().should('have.class', 'outgoing');
            cy.get('.message-box').last().find('img').should('be.visible');
            // Add more assertions as needed
        });
    });

    describe('send a video message', () => {
        it('should display a new outgoing video message', () => {
           
        });
    });
});
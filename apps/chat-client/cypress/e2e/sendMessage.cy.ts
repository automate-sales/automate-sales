describe('Test sending messages', () => {
    before(() => {
        cy.login('gabriel@torus-digital.com');
        // get the url and save the url as a constant
        cy.visit('http://localhost:3000').wait(1000)
        cy.get('#Gabriel-Kay').click().click().wait(2000);
        cy.url().then(currentUrl => {
            this.contactUrl = currentUrl
        });
    });
    beforeEach(() => {
        cy.log('before each ', this.contactUrl)
        cy.visit(this.contactUrl);
        cy.wait(300);
    });
    describe('send a text message', () => {
        it('should display a new outgoing text message', () => {
            const text = 'hola esto es una prueba.'
            cy.get('#message-input').click().type(text).should('have.value', text);
            cy.get('#submit-button').should('be.visible').should('be.enabled').click().wait(200);
            cy.get('.message-box').last().scrollIntoView().then(lastMessageBox => {
                cy.wrap(lastMessageBox).should('have.class', 'outgoing');
                cy.wrap(lastMessageBox).should('contain', text);
                cy.wrap(lastMessageBox).find('.date').should('be.visible');
            });
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
            cy.get('#submit-button').should('be.visible').click().wait(300);
            // Assert that the new outgoing image message is displayed
            cy.get('.message-box').last().scrollIntoView().should('have.class', 'outgoing');
            cy.get('.message-box').last().find('img').should('be.visible');
        });
    });

    describe('send a video message', () => {
        it('should display a new outgoing video message', () => {
            const fileName = 'test-media/video.mp4';
            cy.get('#attachments-button').click();
            cy.get('#attachments-menu').should('be.visible');
            // Set file to the input and trigger change event
            cy.get('input[type="file"]#file').should('exist').selectFile(fileName, { force: true });
            // Perform the upload action
            cy.get('#submit-button').should('be.visible').click().wait(100);
            // Assert that the new outgoing image message is displayed
            cy.get('.message-box').last().scrollIntoView().should('have.class', 'outgoing');
            cy.get('.message-box').last().find('video').scrollIntoView().should('be.visible');
            // Add more assertions as needed
            // video should be playable
        });
    });

    describe('send a document message', () => {
        it('should display a new outgoing document message', () => {
            const fileName = 'test-media/document.pdf';
            cy.get('#attachments-button').click();
            cy.get('#attachments-menu').should('be.visible');
            // Set file to the input and trigger change event
            cy.get('input[type="file"]#file').should('exist').selectFile(fileName, { force: true });
            // Perform the upload action
            cy.get('#submit-button').should('be.visible').click().wait(100);
            // Assert that the new outgoing image message is displayed
            cy.get('.message-box').last().scrollIntoView().should('have.class', 'outgoing');
            cy.get('[data-cy="icon-message"]').should('exist')
            // Add more assertions as needed
        });
    });

    describe('send an sticker message', () => {
        it('should display a new outgoing sticker message', () => {
            const fileName = 'test-media/sticker.webp';
            
            cy.get('#attachments-button').click();
            cy.get('#attachments-menu').should('be.visible');
            // Set file to the input and trigger change event
            cy.get('input[type="file"]#sticker').should('exist').selectFile(fileName, { force: true });
            // Perform the upload action
            cy.get('#submit-button').should('be.visible').click().wait(300);
            // Assert that the new outgoing image message is displayed
            cy.get('.message-box').last().scrollIntoView().should('have.class', 'outgoing');
            cy.get('.message-box').last().find('img').should('be.visible');
        });
    });

    describe('send an audio message', () => {
        it('should display a new outgoing audio message', () => {
            // Trigger the start of recording
            cy.get('[data-cy="audio-record-button"]').click();
    
            // Check if the button's state indicates that recording has started
            // Adjust the selector to match your button when it is recording
            cy.get('[data-cy="audio-record-button"]').should('have.class', 'bg-red-600')
            .wait(500)
            // Trigger the stop of recording
            cy.get('[data-cy="audio-record-button"]').click();
            
            // should display playback and check and x buttons
            cy.get('[data-cy="audio-playback"]').should('be.visible')
            cy.get('[data-cy="audio-cancel-button"]').should('be.visible')
            cy.get('[data-cy="audio-confirm-button"]').should('be.visible')
            
            // click the audio confirm button
            cy.get('[data-cy="audio-confirm-button"]').click();

            cy.get('#submit-button').should('be.visible').should('be.enabled').click().wait(100);
    
            // Assert that the new outgoing audio message is displayed
            cy.get('.message-box').last().should('have.class', 'outgoing');
            // Add more assertions as needed
        });
    });

    describe('send a camera message', () => {
        it('should display a new outgoing image message', () => {
            // Mock navigator.mediaDevices.getUserMedia
            cy.stub(navigator.mediaDevices, 'getUserMedia').callsFake(() => {
                // Create a fake stream object
                const fakeStream = {
                    getTracks: () => {
                        return [{
                            stop: () => {}
                        }];
                    }
                };
                return Promise.resolve(fakeStream);
            });
            
            cy.get('#attachments-button').click();
            cy.get('#attachments-menu').should('be.visible');
    
            // Trigger the start of the camera
            cy.get('[data-cy="camera-start-button"]').click();
    
            // Check if the video element is now visible
            cy.get('video').should('be.visible');
    
            // Mock the picture-taking process
            // You might need to trigger any UI changes that occur when a picture is taken
            cy.get('[data-cy="capture-button"]').click();
    
            // Check if the UI has changed to show the captured picture options (confirm or cancel)
            cy.get('[data-cy="confirm-upload-button"]').should('be.visible');
            cy.get('[data-cy="cancel-button"]').should('be.visible');
    
            // Choose to confirm or cancel the upload
            // For example, let's confirm the upload
            cy.get('[data-cy="confirm-upload-button"]').click();
    
            // Assert that the new outgoing camera message is displayed
            // This depends on how your app displays a sent camera message
            cy.get('.message-box').last().should('have.class', 'outgoing');
            // Add more assertions as needed
        });
    });
    

});
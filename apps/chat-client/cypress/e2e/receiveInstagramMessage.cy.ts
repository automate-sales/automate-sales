const bucketName = `automation-media`
const MEDIA_BASE_URL = Cypress.env('MEDIA_BASE_URL') || 'http://localhost:9000'
const SERVER_URL = Cypress.env('SERVER_URL') || 'http://localhost:8000'
import { v4 } from 'uuid';

const textMsgId = `m_${v4()}`;

const getBody = (message: any) => {
    return {
        object: "instagram",
        entry: [
          {
            "time": 1707888706444,
            "id": "0",
            "messaging": [
              {
                "sender": {
                  "id": "12334"
                },
                "recipient": {
                  "id": "23245"
                },
                "timestamp": "1527459824",
                "message": message
              }
            ]
          }
        ]
    }
}

const receiveMessage = (body: any) => {
    cy.request({
      method: 'POST',
      url: `${SERVER_URL}/instagram/webhook`,
      body: body,
      headers: {
        'Content-Type': 'application/json'
      },
    });
};

describe('Test receiving messages', () => {
    let contactUrl = ''
    before(() => {
        cy.log(`SERVER_URL: ${SERVER_URL}`)
        cy.log(`MEDIA_BASE_URL: ${MEDIA_BASE_URL}`)
        cy.login('gabriel@torus-digital.com');
        /* cy.visit('http://localhost:3000')
        cy.get('#Gabriel-Kay').click().wait(500).click().wait(500);
        cy.url().then(url => {
            cy.log('URL: ', url)
            contactUrl = url
         }); */
    });
    beforeEach(() => {
        cy.visit('http://localhost:3000')
        cy.get('#testuser').click().wait(500);
    });

    describe('receive a text message', () => {
        const text = "Buenas que tal";
        const body = getBody({
            "mid": textMsgId,
            "text": text
        });
    
        before(() => {
            receiveMessage(body)
        });
    
        it('should display a new incoming text message', () => {
            cy.wait(500);
            cy.get('.message-box').last().scrollIntoView().should('contain', text).and('be.visible');
            cy.get('.message-box').last().find('.date').should('be.visible');
            cy.get('.message-box').last().find('.exclamation-circle').should('be.visible');
        });
    });

    describe('receive a reply message', () => {
        const text = "Bien y tu?";
        const body = getBody({
            "mid":`m_${v4()}`,
            "text": text,
            "reply_to": {
                "mid": textMsgId
              }
        });
    
        before(() => {
            receiveMessage(body)
        });
    
        it('should display a new incoming reply message', () => {
            cy.wait(500);
            cy.get('.message-box').last().scrollIntoView().should('contain', text).and('be.visible');
            cy.get('.message-box').last().find('.date').should('be.visible');
            cy.get('.message-box').last().find('.exclamation-circle').should('be.visible');
        });
    });

    describe('receive an image message', () => {
        const body = getBody({
            "mid": `m_${v4()}`,
            "attachments": [
              {
                "type": "image",
                "payload": {
                  "url": `${MEDIA_BASE_URL}/${bucketName}/media/test/image.jpg`
                }
              }
            ]
          })
        before(() => {
            receiveMessage(body)
        });
    
        it('should display a new incoming image message', () => {
            cy.wait(1000);
            cy.get('.message-box').last().scrollIntoView().within(() => {
                cy.get('[data-cy="image-message"]').should('exist')
                cy.get('img').should('be.visible');
            });
        });
    });

    
    describe('receive a video message', () => {
        const body = getBody({
            "mid": `m_${v4()}`,
            "attachments": [
              {
                "type": "video",
                "payload": {
                  "url": `${MEDIA_BASE_URL}/${bucketName}/media/test/video.mp4`
                }
              }
            ]
          })

        before(() => {
            receiveMessage(body)
        });
    
        it('should display a new incoming video message', () => {
            cy.wait(500);
            cy.get('.message-box').last().scrollIntoView().within(() => {
                cy.get('[data-cy="video-message"]').should('exist')
                cy.get('video').should('be.visible');
                // video should be playable
            });
        });

    });

    describe('receive an audio message', () => {
        const body = getBody({
            "mid": `m_${v4()}`,
            "attachments": [
              {
                "type": "audio",
                "payload": {
                  "url": `${MEDIA_BASE_URL}/${bucketName}/media/test/audio.ogg`
                }
              }
            ]
          })
        before(() => {
            receiveMessage(body)
        });
    
        it('should display a new incoming audio message and play audio', () => {
            cy.wait(500);
            cy.get('.message-box').last().scrollIntoView().within(() => {
                cy.get('[data-cy="audio-message"]').should('exist');
                cy.get('[data-cy="toggle-audio"]').click().then(($button) => {
                    expect($button.find('svg')).to.have.class('pauseIcon');
                });
            });
        });
    });

    describe('receive a link message', () => {
        const text = "https://logflare.app/";
        const body = getBody({
            "mid": `m_${v4()}`,
            "text": text
        })
        before(() => {
            receiveMessage(body)
        });
        it('should display a new incoming link message', () => {
            cy.wait(1000);
            cy.get('.message-box').last().scrollIntoView().within(() => {
                cy.get('[data-cy="link-message"]').should('exist');
                cy.get('[data-cy="link-image"]').should('exist');
                cy.get('img').should('be.visible');
                cy.get('[data-cy="link-description"]')
                  .should('exist')
                  .invoke('text').should('have.length.greaterThan', 0);
            });
        });
    });

    describe('receive a document message', () => {
        const body = getBody({
            "mid": `m_${v4()}`,
            "attachments": [
              {
                "type": "file",
                "payload": {
                  "url": `${MEDIA_BASE_URL}/${bucketName}/media/test/document.pdf`
                }
              }
            ]
          })
        before(() => {
            receiveMessage(body)
        });
    
        it('should display a new incoming document message', () => {
            cy.wait(500); 
            cy.get('.message-box').last().within(() => {
                cy.get('[data-cy="icon-message"]').should('exist').scrollIntoView();
            });
        });
    });

    /* describe('receive a sticker message', () => {
        const body = getBody(
            {
                "from": "50767474627",
                "id": `wamid.${v4()}`,
                "timestamp": "1702452438",
                "type": "sticker",
                "sticker": {
                    "mime_type": "image/webp",
                    "sha256": "TiMJqfww1+ip8+Yy0q9zXM6xYgwmobOmaE0ebDGwuGY=",
                    "id": "1072271867234478",
                    "animated": false,
                    "url": `${MEDIA_BASE_URL}/${bucketName}/media/test/sticker.webp`
                }
            })
            before(() => {
                receiveMessage(body)
            });
        
            it('should display a new incoming sticker message', () => {
                cy.wait(1000); // Adjust the wait time as needed
                cy.get('.message-box').last().scrollIntoView().within(() => {
                    cy.get('[data-cy="image-message"]').should('exist');
                    cy.get('img').should('be.visible');
                });
            });
    }); */

    describe('receive an other message', () => {
        it('should display a new incoming other message', () => {
            console.log('other message received');
            // check there isnt any error
            // check that there are messages
            // check that the last message is of the given type
        });
    });

});

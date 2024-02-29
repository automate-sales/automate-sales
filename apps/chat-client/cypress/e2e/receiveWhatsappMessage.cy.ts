const bucketName = `automation-media`
const MEDIA_BASE_URL = Cypress.env('MEDIA_BASE_URL') || 'http://localhost:9000'
const SERVER_URL = Cypress.env('SERVER_URL') || 'http://localhost:8000'
import { v4 } from 'uuid';

const getBody = (message: any) => {
    return {
        object: "whatsapp_business_account",
        entry: [
            {
                "id": "109451195532926",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "15550814416",
                                "phone_number_id": "102033866282874"
                            },
                            "contacts": [
                                {
                                    "profile": {
                                        "name": "K"
                                    },
                                    "wa_id": "50766776677"
                                }
                            ],
                            "messages": [
                                message
                            ]
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }
}

const receiveMessage = (body: any) => {
    cy.request({
      method: 'POST',
      url: `${SERVER_URL}/whatsapp/webhook`,
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
        cy.login('test@torus-digital.com');
        /* cy.visit('http://localhost:3000')
        cy.get('#Gabriel-Kay').click().wait(500).click().wait(500);
        cy.url().then(url => {
            cy.log('URL: ', url)
            contactUrl = url
         }); */
    });
    beforeEach(() => {
        cy.visit('http://localhost:3000')
        cy.get('#Gabriel-Kay').click().wait(500);
    });
    describe('receive a text message', () => {
        const text = "Buenas que tal";
        const body = getBody({
            "from": "50766776677",
            "id": `wamid.${v4()}`,
            "timestamp": "1702446247",
            "text": {
                "body": text
            },
            "type": "text"
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

    describe('receive an image message', () => {
        const body = getBody({
            "from": "50766776677",
            "id": `wamid.${v4()}`,
            "timestamp": "1702450103",
            "type": "image",
            "image": {
                "mime_type": "image/jpeg",
                "sha256": "q5Ar2XXHP3ufqejUxPLQ3UzyMiipdb4Gy3INCxxhA9g=",
                "id": "738267184813182",
                "url": `${MEDIA_BASE_URL}/${bucketName}/media/test/image.jpg`
            }
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
            "from": "50766776677",
            "id": `wamid.${v4()}`,
            "timestamp": "1702450661",
            "type": "video",
            "video": {
                "mime_type": "video/mp4",
                "sha256": "IsuyVqru1+WnRDKhbSIGAVY0S4cuDP+knsGM01x4YEU=",
                "id": "815125033635331",
                "url": `${MEDIA_BASE_URL}/${bucketName}/media/test/video.mp4`
            }
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
            "from": "50766776677",
            "id": `wamid.${v4()}`,
            "timestamp": "1702449217",
            "type": "audio",
            "audio": {
                "mime_type": "audio/ogg; codecs=opus",
                "sha256": "5d/0cJu9xLLR0cFhUvEdCVYLo6Mtrnr5QUpmB/hgLPw=",
                "id": "672626484860429",
                "voice": true,
                "url": `${MEDIA_BASE_URL}/${bucketName}/media/test/audio.ogg`
            }
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

    describe('receive a contact message', () => {
        const body = getBody({
            "from": "50766776677",
            "id": `wamid.${v4()}`,
            "timestamp": "1702451588",
            "type": "contacts",
            "contacts": [
                {
                    "name": {
                        "first_name": "Lucas",
                        "formatted_name": "Lucas"
                    },
                    "phones": [
                        {
                            "phone": "+507 6303-3030",
                            "wa_id": "50763033030",
                            "type": "CELL"
                        }
                    ]
                }
            ]
        })
        before(() => {
            receiveMessage(body)
        });
        it('should display a new incoming contact message', () => {
            cy.wait(500); 
            cy.get('.message-box').last().scrollIntoView().within(() => {
                cy.get('[data-cy="contact-message"]').should('exist');
                cy.get('[data-cy="contact-link"]')
                .should('exist')
                .and('have.attr', 'href').and('include', 'tel:');
            });
        });
    });

    describe('receive a location message', () => {
        const body = getBody({
            "from": "50766776677",
            "id": `wamid.${v4()}`,
            "timestamp": "1702451765",
            "location": {
                "address": "Cinta Costera, Panama City, Panamá",
                "latitude": 8.9878625869751,
                "longitude": -79.525970458984,
                "name": "Miramar Intercontinental",
                "url": "https://foursquare.com/v/56d8796a498ec4f889823b54"
            },
            "type": "location"
        })
        before(() => {
            receiveMessage(body)
        });
        it('should display a new incoming location message', () => {
            cy.wait(500); 
            cy.get('.message-box').last().scrollIntoView().within(() => {
                cy.get('[data-cy="location-message"]').should('exist');
                cy.get('[data-cy="google-maps-link"]')
                  .should('exist')
                  .and('have.attr', 'href').and('include', 'https://www.google.com/maps');
            });
        });
    });

    describe('receive a link message', () => {
        const body = getBody({
            "from": "50766776677",
            "id": `wamid.${v4()}`,
            "timestamp": "1702451886",
            "text": {
                "body": "https://logflare.app/"
            },
            "type": "text"
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
            "from": "50766776677",
            "id": `wamid.${v4()}`,
            "timestamp": "1702452354",
            "type": "document",
            "document": {
                "filename": "2023 12 11_Why-do-organizations-have-COOs.pdf",
                "mime_type": "application/pdf",
                "sha256": "wo9EG3RA0uRR/mCrLQttaNPwTso3ICotqN5WXdx8vyM=",
                "id": "871319194632522",
                "url": `${MEDIA_BASE_URL}/${bucketName}/media/test/document.pdf`
            }
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

    describe('receive a sticker message', () => {
        const body = getBody(
            {
                "from": "50766776677",
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
    });

    describe('receive an other message', () => {
        it('should display a new incoming other message', () => {
            console.log('other message received');
            // check there isnt any error
            // check that there are messages
            // check that the last message is of the given type
        });
    });

});

const { v4 } = require('uuid');

const getStatusBody = (
    status: "sent" | "delivered" | "read" | "failed",
    id: string
) => {
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
                "statuses": [
                    {
                    "id": id,
                    "status": status,
                    "timestamp": "1702492286",
                    "recipient_id": "50767474627",
                    "conversation": {
                        "id": "920d2d6909b84b6a811a5652063deb74",
                        "origin": {
                            "type": "marketing"
                        }
                    },
                    "pricing": {
                        "billable": true,
                        "pricing_model": "CBP",
                        "category": "marketing"
                    }
                    }
                ]
                },
                "field": "messages"
            }
            ]
        }
        ]
    }
}

const receiveStatus = async (body: any) => {
    cy.request({
        method: 'POST',
        url: 'http://localhost:8000/whatsapp/webhook',
        body: body,
        headers: {
            'Content-Type': 'application/json'
        },
    });
};

describe('Test receiving status updates', () => {
    const text = "status update test"
    const waId = `wamid.${v4()}`
    let contactUrl = ''
    before(() => {
        cy.login('gabriel@torus-digital.com');
        cy.visit('http://localhost:3000');
        cy.get('#Gabriel-Kay').click().wait(500)
        cy.url().then((url:string) => {
            cy.log('url: ', url)
            contactUrl = url
            cy.request({
                method: 'POST',
                url: 'http://localhost:8000/whatsapp/message',
                body: {
                    whatsapp_id: waId,
                    name: "status test",
                    type: "text",
                    direction: "outgoing",
                    chatDate: new Date(),
                    text: text,
                    contact_id: url.split('/').pop()
                },
                headers: {
                  'Content-Type': 'application/json'
                },
            });
        })
    });
    beforeEach(() => {
        cy.visit(contactUrl);
    });
    describe('process a sent status update', () => {
        before(() => {
            receiveStatus(getStatusBody("sent", waId))
        });
        it('should display a single green check mark', () => {
            cy.wait(100);
            cy.get('.message-box').last().scrollIntoView()
            .should('contain', text).and('be.visible')
            cy.get('.message-box').last().find('.green-check').should('be.visible');
        });
    });

    describe('process a delivered status update', () => {
        before(() => {
            receiveStatus(getStatusBody("delivered", waId))
        });
        it('should display a green circle with checkmark', () => {
            cy.wait(100);
            cy.get('.message-box').last().scrollIntoView()
            .should('contain', text).and('be.visible')
            cy.get('.message-box').last().find('.green-check-circle').should('be.visible');
        });
    });

    describe('process a read status update', () => {
        before(() => {
            receiveStatus(getStatusBody("read", waId))
        });
        it('should display a blue circle with checkmark', () => {
            cy.wait(100);
            cy.get('.message-box').last().scrollIntoView()
            .should('contain', text).and('be.visible')
            cy.get('.message-box').last().find('.blue-check-circle').should('be.visible');
        });
    });

    describe('process simulatneous unordered status updates', () => {
        before(() => {
            receiveStatus(getStatusBody("delivered", waId))
            cy.wait(200).then(() => {
                receiveStatus(getStatusBody("sent", waId))
            })
        });
        
        it('should display a delivered status even when the delivered status update is recieved before sent', () => {
            cy.wait(100);
            cy.get('.message-box').last().scrollIntoView()
            .should('contain', text).and('be.visible')
            cy.get('.message-box').last().find('.green-check-circle').should('be.visible');
        });
    });
    
    describe('process a failed status update', () => {
        before(() => {
            receiveStatus(getStatusBody("failed", waId))
        });
        it('should display a reed circle with an exclamation mark', () => {
            cy.wait(100);
            cy.get('.message-box').last().scrollIntoView()
            .should('contain', text).and('be.visible')
            cy.get('.message-box').last().find('.red-x-circle').should('be.visible');
        });
    });
})
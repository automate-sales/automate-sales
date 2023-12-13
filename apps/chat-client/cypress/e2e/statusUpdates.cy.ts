const statusUpdate = {
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
                "id": "wamid.HBgLNTA3Njc0NzQ2MjcVAgARGBJFMTRFOENFREE0M0EzMEFDMEYA",
                "status": "sent" || "delivered" || "read" || "failed",
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

describe('Test status update on messages', () => {
    beforeEach(() => {
        cy.login('gabriel@torus-digital.com');
        cy.get('#Gabriel-Kay').click();
    });
    describe('process a sent status update', () => {
        it('should display a single green checkmark', () => {
            console.log('status update processed')
        });
    });
    describe('process a delivered status update', () => {
        it('should display a green circle with checkmark', () => {
            console.log('status update processed')
        });
    });
    describe('process a read status update', () => {
        it('should display a blue circle with checkmark', () => {
            console.log('status update processed')
        });
    });
    describe('process simulatneous status updates', () => {
        it('should display a delivered status even when the delivered status update is recieved before sent', () => {
            console.log('status update processed')
        });
    });
    describe('process a failed status update', () => {
        it('should display a reed circle with an exclamation mark', () => {
            console.log('status update processed')
        });
    });
});
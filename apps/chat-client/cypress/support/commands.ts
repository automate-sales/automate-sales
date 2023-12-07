/// <reference types="cypress" />

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }

export {}

declare global {
    namespace Cypress {
      interface Chainable {
        login(email: string): Chainable<Element>
      }
    }
}

Cypress.Commands.add('login', (email: string) => {
    cy.clearAllCookies()
    cy.visit('localhost:3000/api/auth/signin')
    .wait(1000)
    cy.get('#input-email-for-email-provider')
    .type(email)
    .should('have.value', email)
    .type('{enter}')
    .wait(1000)
    cy.task('getLastEmail', email).then((email:{body:string, html:string}) => {
        let body = email.body.toString()
        let url = body.slice(body.indexOf('http'))
        expect(url).to.not.be.empty
        cy.visit({url: url, method: 'POST'})
    })
});
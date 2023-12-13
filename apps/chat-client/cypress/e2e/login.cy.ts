//existing user sign in from a login page
describe('An existing user signs in from the login page', () => {
    //const email_confirmation_msg = 'Te hemos enviado un correo. Confirmalo para iniciar sesión.'
    //const sign_in_success_msg = 'Ha iniciado sesión'
    //const logout_success_msg = 'Ha cerrado su sesión'
    it('Is succesfull', () => {
      cy.clearAllCookies()
      cy.visit('localhost:3000/api/auth/signin')
      .wait(1000)
      cy.get('#input-email-for-email-provider')
      .type('gabriel@torus-digital.com')
      .should('have.value', 'gabriel@torus-digital.com')
      .type('{enter}')
      .wait(1000)
      cy.task('getLastEmail', 'gabriel@torus-digital.com').then((email:{body:string, html:string})=> {
        cy.log('EMAIl FOUND: ', email)
        let body = email.body.toString()
        let url = body.slice(body.indexOf('http'))
        expect(url).to.not.be.empty
        cy.visit({url: url, method: 'POST'})
        .wait(1000)
        cy.url().should('eq', 'http://localhost:3000/')
      })
    })
})
import { defineConfig } from "cypress";
import ms from 'smtp-tester'
//import lighthouse from 'lighthouse';
//import {launch} from 'chrome-launcher';

type Device = 'desktop' | 'mobile'
export default defineConfig({
  chromeWebSecurity: false,
  viewportWidth: 1030,
  viewportHeight: 660,
  video: false,
  e2e: {
    testIsolation: false,
    setupNodeEvents(on, config) {
      //require("cypress-localstorage-commands/plugin")(on, config);
      console.log(process.env.EMAIL_HOST)
      const port = 7777
      const mailServer = ms.init(port)
      console.log('mail server at port %d', port)
      let lastEmail = {}
      mailServer.bind((
        addr, 
        id, 
        email
      ) => {
        console.log('--- email to %s ---', email.headers.to)
        console.log(email.body)
        console.log('--- end ---')
        lastEmail[String(email.headers.to)] = {
            body: email.body,
            html: email.html,
        }
      })
      on('task', {
        /* async lighthouse(device:Device='mobile'){
          const chrome = await launch({chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage']})
          const defaultConfig = {
            logLevel: 'info', 
            output: 'html', 
            onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'], 
            port: chrome.port,
          }
          const options = device==='desktop' ? {
            ...defaultConfig,
            formFactor: 'desktop',
            screenEmulation: {
              mobile: false
            }
          } : {
            ...defaultConfig,
            formFactor: 'mobile'
          }
          const runnerResult = await lighthouse('http://localhost:3000', options)
          await chrome.kill();
          const reportSummary = {
            performance: (runnerResult?.lhr.categories.performance.score ?? 0) * 100,
            accessibility: (runnerResult?.lhr.categories.accessibility.score ?? 0) * 100,
            bestPractices: (runnerResult?.lhr.categories['best-practices'].score ?? 0) * 100,
            seo: (runnerResult?.lhr.categories.seo.score ?? 0) * 100,
          }
          console.log('Lighthouse report summary: ', reportSummary)
          return reportSummary
        }, */
        resetEmails(email) {
          console.log('reset all emails')
          if (email) {
            delete lastEmail[email]
          } else {
            lastEmail = {}
          }
          return null
        },
        getLastEmail(email) {
          // cy.task cannot return undefined
          // thus we return null as a fallback
          return lastEmail[email] || null
        },
        login() {
          
        }
      })
      return config;
    }
  }
});

// const puppeteer = require('puppeteer');
const fs = require('fs');
require('dotenv').config(); // Load environment variables from .env file

// Utility function to introduce delay
function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

// (async () => {
//   const browser = await puppeteer.launch({ headless: false }); // Set headless to false to see the browser
//   const page = await browser.newPage();

//   // Read job URLs from JSON file
//   const jobLinks = JSON.parse(
//     fs.readFileSync('cypress/fixtures/internalSiteJobs.json')
//   );

//   // Load credentials and job search parameters from environment variables
//   const username = process.env.NAUKRI_USERNAME;
//   const password = process.env.NAUKRI_PASSWORD;

//   // Log in to Naukri
//   await page.goto('https://www.naukri.com/');
//   await page.click('a[data-ga-track="Main Navigation LogIn"]');
//   await page.type(
//     'input[placeholder="Enter your active Email ID / Username"]',
//     username
//   );
//   await page.type('input[placeholder="Enter your password"]', password);
//   await page.click('button[type="submit"]');

//   // Wait for login to complete
//   await delay(10000);

//  // ...existing code...

//  for (const jobLink of jobLinks) {
//    try {
//      await page.goto(jobLink, {
//        waitUntil: 'networkidle2'
//      });
//      console.log(`Visited job link: ${jobLink}`);

//      // Wait for the apply button to be visible
//      const [applyButton] = await page.$x("//button[contains(., 'Apply')]");
//      if (applyButton) {
//        await applyButton.click();
//        console.log(`Applied for job: ${jobLink}`);
//        await delay(2000);
//      } else {
//        console.log(`Apply button not found for job: ${jobLink}`);
//      }
//    } catch (error) {
//      console.error(`Failed to apply for job: ${jobLink}`, error);
//      await page.screenshot({
//        path: `error_screenshot_${Date.now()}.png`
//      });
//    }
//  }

// // ...existing code...

//   await browser.close();
// })();

// ...existing code...
describe('Apply jobs using Cypress (no Puppeteer)', () => {
  before(() => {
    Cypress.on('uncaught:exception', () => false);
  });

  it('logs in and tries to apply to jobs from fixture', () => {
    const username = Cypress.env('NAUKRI_USERNAME');
    const password = Cypress.env('NAUKRI_PASSWORD');

    // login
    cy.visit('https://www.naukri.com/');
    cy.get('#login_Layer').should('be.visible').click();
    cy.get('input[placeholder="Enter your active Email ID / Username"]', {
        timeout: 10000
      })
      .type(username, {
        force: true
      });
    cy.get('input[placeholder="Enter your password"]').type(password, {
      force: true
    });
    cy.get('button[type="submit"]').click();

    // wait for a logged-in indicator (adjust selector)
    cy.get('body', {
      timeout: 15000
    }).should('exist');

    // iterate links from fixture
    cy.fixture('internalSiteJobs').then((links) => {
      const externalApplyLinks = [];
      cy.wrap(links).each((link) => {
        cy.visit(link, {
          failOnStatusCode: false
        });
        cy.wait(1500);

        cy.get('body').then(($body) => {
          // prefer explicit id/class you added, fallback to any button containing "apply"
          if ($body.find('#apply-button, .apply-button').length) {
            cy.get('#apply-button, .apply-button').first().click({
              force: true
            });
            cy.log(`Clicked Apply button on ${link}`);
            cy.get('.apply-status-header .apply-message', { timeout: 10000 }).then(
              ($msg) => {
                if ($msg && $msg.length) {
                  cy.log(`Redirect notice found for ${link}`);
                  // record this job's external apply link for later writing
                  cy.then(() => {
                    externalApplyLinks.push(link);
                  });
                  // add any further modal/form handling here if needed
                } else {
                  cy.log(`No redirect notice present (immediate) for ${link}`);
                }
              },
              () => {
                // timed out waiting for the redirect message — continue without failing
                cy.log(`No redirect notice appeared within timeout for ${link}`);
              }
            );            
            // handle apply modal/form here
          } else if ($body.find('button').filter((i, el) => /apply/i.test(el.innerText)).length) {
            cy.contains('button', /apply/i).click({
              force: true
            });
            cy.log(`Clicked Apply button on ${link}`);
          } else if ($body.find('a').filter((i, el) => /apply/i.test(el.innerText)).length) {
            cy.get('a').contains(/apply/i).then(($a) => {
              const href = $a.prop('href');
              if (href && href.trim()) {
                cy.log(`Found external apply href for ${link}: ${href}`);
                // push into the array within Cypress chain
                cy.then(() => {
                  externalApplyLinks.push(href);
                });
              } else {
                cy.log(`Apply anchor has no href on ${link}`);
              }
            });
          } else {
            cy.log(`No Apply control found on ${link}`);
          }
        });

        cy.wait(1000);
      }).then(() => {
        // after processing all links, write collected external apply links to fixture
        cy.then(() => {
          cy.writeFile('cypress/fixtures/externalApplyLinks.json', externalApplyLinks);
          cy.log(`Saved ${externalApplyLinks.length} external apply links to cypress/fixtures/externalApplyLinks.json`);
        });
      });

      // links.forEach((link) => {
      //   // visit job page
      //   cy.visit(link, { failOnStatusCode: false });
      //   cy.wait(1500);

      //   // try to click an in-page Apply button or follow Apply anchor
      //   cy.get('body').then(($body) => {
      //     if ($body.find('#apply-button, .apply-button').length) {
      //     cy.get('#apply-button, .apply-button').first().click({ force: true });
      //     cy.log(`Clicked Apply button on ${link}`);
      //     // handle apply modal/form here
      //   } else if ($body.find('a:contains("Apply")').length) {
      //       cy.get('a').contains('Apply', { matchCase: false }).then(($a) => {
      //         const href = $a.prop('href');
      //         if (href && href.trim()) {
      //           <button id="company-site-button" class="styles_company-site-button__C_2YK company-site-button">Apply on company site</button>
      //           // follow the apply link (may go to external site)
      //           cy.visit(href, { failOnStatusCode: false });
      //           cy.log(`Visited Apply link href for ${link}`);
      //           // try clicking any Apply on that page as well
      //           cy.get('body').then(($b2) => {
      //             if ($b2.find('button:contains("Apply")').length) {
      //               cy.contains('button', 'Apply', { matchCase: false }).click({ force: true });
      //             }
      //           });
      //         } else {
      //           cy.log(`Apply anchor has no href on ${link}`);
      //         }
      //       });
      //     } else {
      //       cy.log(`No Apply control found on ${link}`);
      //     }
      //   });

      //   // small pause between pages
      //   cy.wait(1000);
      // });
    });
  });
});
// ...existing code...
const fs = require('fs');
require('dotenv').config(); // Load environment variables from .env file
import cfg from '../fixtures/searchConfig.json';
describe('Fetch Job Links from Naukri', () => {
  // const username = process.env.NAUKRI_USERNAME;
  // const password = process.env.NAUKRI_PASSWORD;
  // const keywords = process.env.JOB_KEYWORDS;
  // const location = process.env.JOB_LOCATION;
  const username = Cypress.env('NAUKRI_USERNAME');
  const password = Cypress.env('NAUKRI_PASSWORD');
  const keywords = Cypress.env('JOB_KEYWORDS');
  const location = Cypress.env('JOB_LOCATION');
  before(() => {
    // Catch and ignore uncaught exceptions
    Cypress.on('uncaught:exception', (err, runnable) => {
      return false;
    });

    // Increase default timeout
    Cypress.config('defaultCommandTimeout', 60000);
    Cypress.config('pageLoadTimeout', 60000);
  });

  it('logs in to Naukri and performs a job search', () => {
    cy.log('Username:', username);
    cy.log('Password:', password);
    cy.log('Keywords:', keywords);
    cy.log('Location:', location);
    // const keywords = Array.isArray(cfg.keywords) ? cfg.keywords.join(', ') : cfg.keywords;
    // const location = Array.isArray(cfg.locations) ? cfg.locations.join(', ') : cfg.locations;
    const experience = cfg.experience || '3 years';
    const salaryRanges = cfg.salaryRanges || [];
    const freshness = cfg.freshnessDays || 7;
    const sliderClientX = cfg.sliderClientXForExperience || 150;

    cy.log('Using config:', cfg);
    // Intercept network requests
    cy.intercept('GET', '**/').as('naukriHome');

    // Visit Naukri.com homepage
    cy.visit('https://www.naukri.com', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      },
    });
    cy.wait('@naukriHome');
    cy.log('Visited Naukri Homepage');

    // Click on the login button
    cy.contains('Login').click();
    cy.log('Clicked Login');

    // Enter username
    cy.get('input[placeholder="Enter your active Email ID / Username"]').type(
      username
    );
    cy.log('Entered Username');

    // Enter password
    cy.get('input[placeholder="Enter your password"]').type(password);
    cy.log('Entered Password');

    // Submit the login form
    cy.get('button[type="submit"]').click();
    cy.log('Submitted Login Form');

    // Wait for login to complete
    cy.wait(3000);

    // Perform job search
    cy.get('.nI-gNb-sb__main').click();
    cy.log('Clicked on Search Bar');

    // Wait for 3 seconds
    cy.wait(3000);

    // Enter keywords for search
    cy.get(
      '.nI-gNb-sb__keywords > .nI-gNb-sugg > .suggestor-wrapper > .suggestor-box > .suggestor-input'
    )
      .type(keywords)
      .log('Entered Keywords');

    // Enter location for search
    cy.get(
      '.nI-gNb-sb__locations > .nI-gNb-sugg > .suggestor-wrapper > .suggestor-box > .suggestor-input'
    )
      .type(location)
      .log('Entered Location');

    // Set experience using dropdown before search
    cy.get('input#experienceDD')
    .click({ force: true })
    .clear()
      .type('3 years', { force: true });
    cy.contains('3 years').click({ force: true });
    cy.wait(5000);

    // Click on search button and wait for listings
    cy.get('.nI-gNb-sb__icon-wrapper').click();
    cy.wait(5000);
    cy.log('Performed Job Search');

    // Set experience to 3 years (slider)
    cy.get('input#experienceDD').click({
      force: true
    }).clear().type(`${experience}{enter}`, {
      force: true
    });
    cy.wait(2000);
    cy.get('.experiencecontainer .rc-slider .handle').trigger('mousedown', {
      which: 1
    });
    cy.get('.experiencecontainer .rc-slider').trigger('mousemove', {
      clientX: sliderClientX
    }).trigger('mouseup', {
      force: true
    });

    cy.wait(5000);

    // set salary ranges from config
    salaryRanges.forEach((sr) => {
      // map human label to checkbox id used on page (adjust if necessary)
      const id = `input[id="chk-${sr}-ctcFilter-"]`;
      cy.get('body').then(($b) => {
        if ($b.find(id).length) cy.get(id).check({
          force: true
        });
      });
      cy.wait(3000);
    });

    // Set freshness filter
    cy.get('button#filter-freshness').click({ force: true });
    const freshnessId = `filter-freshness-${freshness}`;

    cy.get(`ul[data-filter-id="freshness"] li a[data-id="${freshnessId}"]`).click({ force: true });
    cy.wait(5000);

    // Extract job links from all pagination pages, including lazy-loaded pages
    const internalSiteJobs = [];
    const externalSiteJobs = [];

    function extractLinks() {
      cy.get('[class="srp-jobtuple-wrapper"] a').each(($el) => {
        let link = $el.attr('href');
        if (link && !link.startsWith('http')) {
          link = `https://www.naukri.com${link}`;
        }
        cy.log('Extracted link: ' + link);
        if (link && link.includes('naukri.com')) {
          internalSiteJobs.push(link);
        } else if (link) {
          externalSiteJobs.push(link);
        }
      });
    }

    function visitAllPages() {
      extractLinks();
      cy.get('.styles_btn-secondary__2AsIP span').contains('Next').parent().then(($nextBtn) => {
        if (!$nextBtn.attr('disabled')) {
          cy.wrap($nextBtn).click({ force: true });
          cy.wait(3000);
          visitAllPages();
        }
      });
    }

    visitAllPages();

    // After all pages are visited, save the job links
    cy.then(() => {
      cy.writeFile(
        'cypress/fixtures/internalSiteJobs.json',
        internalSiteJobs
      );
      cy.writeFile(
        'cypress/fixtures/externalSiteJobs.json',
        externalSiteJobs
      );
      cy.log('Saved internal job links to internalSiteJobs.json');
      cy.log('Saved external job links to externalSiteJobs.json');
    });
  });
});

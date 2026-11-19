import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeWebhookJobPayload } from '../controllers/employerWebhookController.js';
import Job from '../models/Job.js';
import {
  extractSchemaJobPostings,
  getCareerPageFallbackUrls,
  isAllowedCrawlerHost,
  isCareerJobUrl,
  normalizeSchemaJobPosting,
  parseCrawlerTargets,
} from '../services/careerScraperService.js';
import {
  isWorldwideOnly,
  normalizeRemoteJob,
} from '../services/remoteApiIngestor.js';
import {
  MYJOBMAG_TARGETS,
  normalizeMyJobMagListing,
  parseMyJobMagListings,
} from '../services/localAggregatorScraper.js';
import {
  extractHubstaffResultsHtml,
  normalizeHubstaffTalentListing,
  parseHubstaffTalentListings,
} from '../services/hubstaffTalentScraper.js';
import { cleanHtmlDescription, cleanHtmlSnippet } from '../utils/sanitizer.js';

const employer = {
  _id: '64c000000000000000000001',
  companyName: 'Example Company',
  email: 'jobs@example.com',
};

test('normalizes Greenhouse-style webhook payloads and links them to the employer', () => {
  const job = normalizeWebhookJobPayload({
    id: 456,
    title: 'Senior Engineer',
    content: '<p>Build reliable systems.</p><script>ignore this</script>',
    location: { name: 'Remote - Africa' },
    departments: [{ name: 'Engineering' }],
    employment_type: 'Full-time',
    absolute_url: 'https://jobs.example.com/jobs/456',
    datePosted: 1781200000,
    integration: 'greenhouse',
  }, employer);

  assert.equal(job.title, 'Senior Engineer');
  assert.equal(job.description, 'Build reliable systems.');
  assert.equal(job.workplaceType, 'remote');
  assert.equal(job.department, 'Engineering');
  assert.equal(job.sourceProvider, 'greenhouse');
  assert.equal(job.source, 'employer');
  assert.equal(job.isDirectPosting, true);
  assert.equal(job.postedBy, employer._id);
  assert.equal(job.company, employer._id);
  assert.equal(job.applicationLink, 'https://jobs.example.com/jobs/456');
  assert.equal(job.pubDate.toISOString(), new Date(1781200000000).toISOString());
  assert.equal(job.expiryDate, null);
});

test('allows jobs without an application deadline', () => {
  const job = new Job({
    title: 'No-deadline role',
    companyName: 'Example Company',
    location: 'Remote',
    description: 'Apply while the role is available.',
  });

  assert.equal(job.expiryDate, null);
  assert.equal(job.validateSync(), undefined);
});

test('normalizes Lever categories and rejects unsafe application URLs', () => {
  const job = normalizeWebhookJobPayload({
    id: 'lever-1',
    text: 'Product Engineer',
    descriptionPlain: 'Build product features',
    categories: { team: 'Product', location: 'London', commitment: 'Part-time' },
    hostedUrl: 'https://jobs.lever.co/example/lever-1',
  }, employer);

  assert.equal(job.department, 'Product');
  assert.equal(job.location, 'London');
  assert.equal(job.jobType, 'Part-Time');
  assert.throws(() => normalizeWebhookJobPayload({
    title: 'Unsafe',
    description: 'Job description',
    location: 'Remote',
    applicationLink: 'javascript:alert(1)',
  }, employer), /HTTP or HTTPS/);
});

test('normalizes nested Workday job-posting payloads', () => {
  const job = normalizeWebhookJobPayload({
    jobRequisitionId: 'WD-42',
    jobPostingInfo: {
      title: 'Operations Associate',
      jobDescription: '<p>Support operations.</p>',
      workplaceType: 'Hybrid',
      timeType: 'Part-time',
      startDate: '2026-05-01',
      endDate: '2026-12-31',
    },
    locations: [{ descriptor: 'Lagos, Nigeria' }],
    jobFamily: 'Operations',
    externalUrl: 'https://careers.example.com/jobs/WD-42',
    integration: 'workday',
  }, employer);

  assert.equal(job.title, 'Operations Associate');
  assert.equal(job.description, 'Support operations.');
  assert.equal(job.location, 'Lagos, Nigeria');
  assert.equal(job.workplaceType, 'hybrid');
  assert.equal(job.jobType, 'Part-Time');
  assert.equal(job.department, 'Operations');
  assert.equal(job.sourceProvider, 'workday');
  assert.equal(job.expiryDate.toISOString(), '2026-12-31T00:00:00.000Z');
});

test('extracts JobPosting JSON-LD from arrays and graphs, then normalizes it for the Job model', () => {
  const postings = extractSchemaJobPostings(`
    <html><head><script type="application/ld+json">
      {"@context":"https://schema.org","@graph":[
        {"@type":"Organization","name":"Example Company"},
        {"@type":["JobPosting","Thing"],"title":"Remote Designer",
         "description":"<p>Design accessible products.</p>",
         "datePosted":"2026-08-01","validThrough":"2026-12-01",
         "employmentType":["FULL_TIME","CONTRACT"],"jobLocationType":"TELECOMMUTE",
         "jobLocation":[{"address":{"addressLocality":"Lagos","addressCountry":"NG"}}],
         "hiringOrganization":{"name":"Example Company"},
         "baseSalary":{"currency":"USD","value":{"minValue":90000,"maxValue":110000}},
         "url":"https://careers.example.com/jobs/remote-designer"}
      ]}
    </script></head><body></body></html>
  `, 'https://careers.example.com/jobs/remote-designer');

  assert.equal(postings.length, 1);
  assert.equal(postings[0].title, 'Remote Designer');
  assert.equal(postings[0].description, 'Design accessible products.');
  assert.equal(postings[0].employmentType, 'FULL_TIME, CONTRACT');
  assert.match(postings[0].salary, /USD/);
  assert.match(postings[0].salary, /110000/);
  assert.match(postings[0].location, /Lagos/);
  assert.match(postings[0].location, /NG/);
  assert.equal(postings[0].workplaceType, 'remote');
  assert.equal(postings[0].validThrough.toISOString(), '2026-12-01T00:00:00.000Z');
  assert.equal(postings[0].applicationUrl, 'https://careers.example.com/jobs/remote-designer');

  const crawledAt = new Date('2026-10-12T00:00:00.000Z');
  const normalized = normalizeSchemaJobPosting(
    postings[0],
    'https://careers.example.com',
    crawledAt,
  );
  const normalizedAgain = normalizeSchemaJobPosting(
    postings[0],
    'https://careers.example.com',
    new Date('2026-10-13T00:00:00.000Z'),
  );
  assert.equal(normalized.sourceKey, normalizedAgain.sourceKey);
  assert.equal(normalized.companyName, 'Example Company');
  assert.equal(normalized.sourceProvider, 'career-crawler:careers.example.com');
  assert.equal(normalized.source, 'aggregated');
  assert.equal(normalized.isDirectPosting, false);
  assert.equal(normalized.jobType, 'Remote');
  assert.equal(normalized.salaryRange, postings[0].salary);
  assert.equal(normalized.expiryDate.toISOString(), '2026-12-01T00:00:00.000Z');
  const modelJob = new Job(normalized);
  assert.equal(modelJob.validateSync(), undefined);
  assert.equal(modelJob.source, 'aggregated');
  assert.equal(modelJob.department, '');

  const withoutDeadline = normalizeSchemaJobPosting(
    { ...postings[0], validThrough: null },
    'https://careers.example.com',
    crawledAt,
  );
  assert.equal(withoutDeadline.expiryDate, null);
  assert.equal(new Job(withoutDeadline).validateSync(), undefined);
});

test('discovers configured domains without requiring sitemap URLs', () => {
  assert.deepEqual(parseCrawlerTargets('careers.example.com, https://jobs.example.org/'), [
    { url: 'https://careers.example.com' },
    { url: 'https://jobs.example.org' },
  ]);
  assert.deepEqual(parseCrawlerTargets(
    '[{"url":"https://example.com","companyName":"Example"},{"domain":"example.com"}]',
  ), [{ url: 'https://example.com', companyName: 'Example' }]);
  assert.deepEqual(parseCrawlerTargets('https://job-boards.greenhouse.io/acme'), [
    { url: 'https://job-boards.greenhouse.io/acme' },
  ]);
  assert.deepEqual(parseCrawlerTargets(
    '[{"domain":"https://job-boards.greenhouse.io","companySlug":"acme","companyName":"Acme"}]',
  ), [{ url: 'https://job-boards.greenhouse.io/acme', companyName: 'Acme' }]);
  assert.deepEqual(parseCrawlerTargets('https://job-boards.greenhouse.io'), [
    { url: 'https://job-boards.greenhouse.io/paystack' },
  ]);
  assert.deepEqual(parseCrawlerTargets('job-boards.greenhouse.io/'), [
    { url: 'https://job-boards.greenhouse.io/paystack' },
  ]);
  assert.deepEqual(parseCrawlerTargets('https://job-boards.greenhouse.io/paystack/'), [
    { url: 'https://job-boards.greenhouse.io/paystack' },
  ]);
  assert.deepEqual(parseCrawlerTargets('https://apply.workable.com/paystack/'), [
    { url: 'https://apply.workable.com/paystack' },
  ]);
  assert.deepEqual(parseCrawlerTargets('https://acme.bamboohr.com/careers/'), [
    { url: 'https://acme.bamboohr.com/careers' },
  ]);
  assert.deepEqual(parseCrawlerTargets(
    '[{"domain":"https://apply.workable.com","companyHandle":"acme"},{"url":"https://acme.bamboohr.com/jobs/"}]',
  ), [
    { url: 'https://apply.workable.com/acme' },
    { url: 'https://acme.bamboohr.com/jobs' },
  ]);
  assert.throws(() => parseCrawlerTargets('http://example.com'), /HTTPS/);
  assert.throws(() => parseCrawlerTargets('https://127.0.0.1'), /public DNS hostname/);
  assert.equal(isCareerJobUrl('https://example.com/careers'), true);
  assert.equal(isCareerJobUrl('https://example.com/jobs/remote-designer'), true);
  assert.equal(isCareerJobUrl('https://example.com/company/about'), false);
});

test('allows target domains and ATS redirect hosts without opening redirects generally', () => {
  assert.equal(isAllowedCrawlerHost('www.whytecleon.com', 'whytecleon.com'), true);
  assert.equal(isAllowedCrawlerHost('boards.greenhouse.io', 'whytecleon.com'), true);
  assert.equal(isAllowedCrawlerHost('jobs.lever.co', 'workforcegroup.com'), true);
  assert.equal(isAllowedCrawlerHost('careers.myworkdayjobs.com', 'workforcegroup.com'), true);
  assert.equal(isAllowedCrawlerHost('untrusted.example', 'whytecleon.com'), false);
});

test('provides direct career-page URLs when a domain sitemap is missing', () => {
  assert.deepEqual(getCareerPageFallbackUrls('https://whytecleon.com'), [
    'https://whytecleon.com/careers/',
    'https://whytecleon.com/jobs/',
  ]);
  assert.deepEqual(getCareerPageFallbackUrls('https://workforcegroup.com/careers/openings'), [
    'https://workforcegroup.com/careers/openings',
    'https://workforcegroup.com/careers/',
    'https://workforcegroup.com/jobs/',
  ]);
});

test('accepts only worldwide or unrestricted remote locations for remote API ingestion', () => {
  for (const location of [
    '',
    'Worldwide',
    'Worldwide only',
    'Anywhere',
    'Global',
    'Remote',
    'Remote only',
    'Fully remote',
    'Remote - Worldwide',
  ]) {
    assert.equal(isWorldwideOnly(location), true, `${location} should be accepted`);
  }

  for (const location of [
    'US-only',
    'United States',
    'Remote - UK only',
    'Europe only',
    'Canada',
    'Australia',
    'Remote - Worldwide except Nigeria',
    'EMEA',
  ]) {
    assert.equal(isWorldwideOnly(location), false, `${location} should be rejected`);
  }
});

test('normalizes remote API jobs with provider attribution and validates the Job model', () => {
  const applyUrl = 'https://company.example/apply/role-42';
  const listingUrl = 'https://himalayas.app/jobs/role-42';
  const normalized = normalizeRemoteJob('Himalayas', {
    id: 'role-42',
    company_name: 'Example Company',
    company_slug: 'example-company',
    title: 'Senior React Engineer',
    description: 'Build accessible products for a global team.',
    locationRestrictions: 'Worldwide',
    url: listingUrl,
    applicationLink: applyUrl,
    publication_date: new Date().toISOString(),
    categories: ['Engineering'],
  });

  assert.ok(normalized);
  assert.equal(normalized.source, 'aggregated');
  assert.equal(normalized.sourceProvider, 'himalayas');
  assert.equal(normalized.sourceName, 'Himalayas');
  assert.equal(normalized.sourceUrl, listingUrl);
  assert.equal(normalized.expiryDate, null);
  assert.equal(normalized.applicationLink, applyUrl);
  assert.equal(normalized.isDirectPosting, false);
  assert.equal(normalized.isWorldwideRemote, true);
  assert.equal(normalized.jobType, 'Full-Time');

  const modelJob = new Job(normalized);
  assert.equal(modelJob.validateSync(), undefined);
  assert.equal(modelJob.sourceName, 'Himalayas');
  assert.equal(modelJob.sourceUrl, listingUrl);

  assert.equal(normalizeRemoteJob('Remotive', {
    company_name: 'Restricted Company',
    title: 'Engineer',
    description: 'Not globally available.',
    candidate_required_location: 'United States',
    url: 'https://remotive.com/remote-jobs/restricted-role',
  }), null);

  assert.equal(normalizeRemoteJob('Remotive', null), null);
  assert.equal(normalizeRemoteJob('Remotive', undefined), null);
  assert.equal(new Job().jobType, 'Full-Time');
  assert.equal(new Job({ source: 'remotive' }).source, 'remotive');
  assert.ok(Job.schema.path('source').enumValues.includes('remotive'));
  assert.equal(Job.schema.path('workplaceType').defaultValue.call(null), 'on-site');
  assert.equal(Job.schema.path('isDirectPosting').defaultValue.call(null), true);
  assert.equal(Job.schema.path('isRemote').defaultValue.call(null), false);
});

test('cleans raw HTML, style markup, and encoded entities from job text', () => {
  assert.equal(
    cleanHtmlSnippet('<p style="color:red">Senior &amp; <strong>skilled</strong></p><style>.x{color:red}</style>'),
    'Senior & skilled',
  );
  assert.equal(
    cleanHtmlSnippet('&lt;p style=&quot;color:red&quot;&gt;Encoded &amp; safe&lt;/p&gt;'),
    'Encoded & safe',
  );

  const normalizedRemote = normalizeRemoteJob('Remotive', {
    company_name: 'Example Co',
    title: 'Engineer',
    description: '<p style="font-size:12px">Build &amp; maintain <b>services</b>.</p>',
    location: 'Worldwide',
    url: 'https://remotive.com/remote-jobs/example-engineer',
  });

  test('preserves full job-description sections and removes unsafe markup', () => {
    const description = cleanHtmlDescription(
      '<h2>Responsibilities</h2><ul><li>Own delivery.</li><li>Support customers.</li></ul><script>unsafe()</script>',
    );
    assert.equal(description, 'Responsibilities\nOwn delivery.\nSupport customers.');
    assert.equal(cleanHtmlDescription(`<p>${'Full description. '.repeat(400)}</p>`).length > 5000, true);
  });
  assert.equal(normalizedRemote.description, 'Build & maintain services.');
  assert.equal(normalizedRemote.excerpt, 'Build & maintain services.');
});

test('parses MyJobMag agency listings and normalizes attribution for the Job model', () => {
  const html = `
    <main class="jobs">
      <li class="job-list-li">
        <div class="job-info">
          <h2><a href="/job/senior-accountant-123">Senior Accountant</a></h2>
          <div class="company-name">Acme Recruitment</div>
          <span class="job-location">Lagos, Nigeria</span>
          <p class="job-desc">Manage financial reporting and monthly accounts.</p>
        </div>
      </li>
      <li class="job-list-li">
        <div class="job-info">
          <h2><a href="/job/operations-manager-456">Operations Manager</a></h2>
          <div class="company">at Bridge Talent Partners</div>
          <div class="job-details"><span>Abuja, Nigeria</span></div>
          <p>Lead day-to-day operations across the business.</p>
        </div>
      </li>
      <li class="job-list-li">
        <div class="job-info">
          <h2><a href="/job/consultant-789">Consultant</a></h2>
          <span>at Generic Agency in Ibadan</span>
          <div class="job-details"><span>Ibadan, Nigeria</span></div>
          <p class="job-desc">Advise clients on business transformation.</p>
        </div>
      </li>
      <a href="/job/senior-accountant-123">Duplicate listing link</a>
    </main>
  `;
  const listings = parseMyJobMagListings(html);
  assert.equal(listings.length, 3);
  assert.deepEqual(listings[0], {
    title: 'Senior Accountant',
    companyName: 'Acme Recruitment',
    location: 'Lagos, Nigeria',
    description: 'Manage financial reporting and monthly accounts.',
    detailUrl: 'https://www.myjobmag.com/job/senior-accountant-123',
  });
  assert.deepEqual(MYJOBMAG_TARGETS.map(({ url }) => url), [
    'https://www.myjobmag.com/jobs-by-title/outsourcing',
    'https://www.myjobmag.com/jobs-by-industry/consulting-specialized-services',
  ]);
  assert.equal(listings[1].companyName, 'Bridge Talent Partners');
  assert.equal(listings[1].location, 'Abuja, Nigeria');
  assert.equal(listings[1].description, 'Lead day-to-day operations across the business.');
  assert.equal(listings[2].companyName, 'Generic Agency');
  assert.equal(listings[2].location, 'Ibadan, Nigeria');

  const normalized = normalizeMyJobMagListing(listings[0]);
  assert.equal(normalized.source, 'aggregated');
  assert.equal(normalized.sourceName, 'MyJobMag');
  assert.equal(normalized.sourceProvider, 'myjobmag');
  assert.equal(normalized.sourceUrl, listings[0].detailUrl);
  assert.equal(normalized.applicationLink, listings[0].detailUrl);
  assert.equal(normalized.location, 'Lagos, Nigeria');
  assert.equal(normalized.expiryDate, null);
  const modelJob = new Job(normalized);
  assert.equal(modelJob.validateSync(), undefined);
});

test('parses Hubstaff Talent remote jobs and normalizes them for the Job model', () => {
  const resultHtml = `
    <div class="search-result">
      <div class="main-details">
        <a class="name" href="/jobs/remote-product-designer">Remote Product Designer</a>
        <span class="label label-hourly">hourly</span>
        <div class="pay-rate">$25/hr</div>
        <div class="job-company">
          <a class="job-agency">Example Client</a>
          <i class="hi-remote"></i>
          <span class="a-tooltip" data-original-title="November 15, 2026 at 11:24 am">5 hrs ago</span>
        </div>
        <div class="profil-bio">Design and maintain accessible product interfaces.</div>
        <div class="list-inline"><a class="tag">Figma</a><a class="tag">Product Design</a></div>
      </div>
    </div>
    <div class="search-result">
      <div class="main-details">
        <a class="name" href="/jobs/fixed-price-developer">Fixed-price Developer</a>
        <span class="label label-fixed_price">fixed price</span>
        <div class="budget">$1,200</div>
        <div class="job-company"><a class="job-agency">Another Client</a><i class="hi-remote"></i></div>
        <div class="profil-bio">Build an integration for the client platform.</div>
      </div>
    </div>
    <div class="search-result">
      <div class="main-details">
        <a class="name" href="https://example.com/jobs/not-hubstaff">Not a Hubstaff listing</a>
        <a class="job-agency">Unknown</a>
        <div class="profil-bio">This listing must be rejected.</div>
        <i class="hi-remote"></i>
      </div>
    </div>
  `;
  const jsResponse = `$('#results').html(${JSON.stringify(resultHtml).replace(/\$/g, '\\$')});`;
  const parsedHtml = extractHubstaffResultsHtml(jsResponse);
  const listings = parseHubstaffTalentListings(parsedHtml);

  assert.equal(listings.length, 2);
  assert.deepEqual(listings[0], {
    title: 'Remote Product Designer',
    companyName: 'Example Client',
    description: 'Design and maintain accessible product interfaces.',
    sourceUrl: 'https://hubstafftalent.net/jobs/remote-product-designer',
    applicationUrl: 'https://hubstafftalent.net/jobs/remote-product-designer/apply',
    salary: '$25/hr',
    jobType: 'hourly',
    tags: ['Figma', 'Product Design'],
    postedDate: 'November 15, 2026 at 11:24 am',
  });
  assert.equal(listings[1].salary, '$1,200');
  assert.equal(listings[1].jobType, 'fixed price');

  const normalized = normalizeHubstaffTalentListing(listings[0], new Date('2026-11-15T12:00:00Z'));
  const normalizedAgain = normalizeHubstaffTalentListing(listings[0], new Date('2026-11-16T12:00:00Z'));
  assert.equal(normalized.sourceKey, normalizedAgain.sourceKey);
  assert.equal(normalized.source, 'aggregated');
  assert.equal(normalized.sourceProvider, 'hubstafftalent');
  assert.equal(normalized.sourceName, 'Hubstaff Talent');
  assert.equal(normalized.location, 'Remote');
  assert.equal(normalized.workplaceType, 'remote');
  assert.equal(normalized.jobType, 'Contract');
  assert.equal(normalized.salaryRange, '$25/hr');
  assert.equal(normalized.applicationLink, 'https://hubstafftalent.net/jobs/remote-product-designer/apply');
  assert.notEqual(normalized.pubDate.getTime(), new Date('2026-11-15T12:00:00Z').getTime());
  assert.equal(normalized.expiryDate, null);
  assert.deepEqual(normalized.tags, ['Figma', 'Product Design']);

  const modelJob = new Job(normalized);
  assert.equal(modelJob.validateSync(), undefined);

  const normalizedFixedPrice = normalizeHubstaffTalentListing(listings[1]);
  assert.equal(normalizedFixedPrice.jobType, 'Contract');
});

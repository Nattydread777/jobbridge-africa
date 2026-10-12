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
  const modelJob = new Job(normalized);
  assert.equal(modelJob.validateSync(), undefined);
  assert.equal(modelJob.source, 'aggregated');
  assert.equal(modelJob.department, '');
});

test('discovers configured domains without requiring sitemap URLs', () => {
  assert.deepEqual(parseCrawlerTargets('careers.example.com, https://jobs.example.org/'), [
    { url: 'https://careers.example.com' },
    { url: 'https://jobs.example.org' },
  ]);
  assert.deepEqual(parseCrawlerTargets(
    '[{"url":"https://example.com","companyName":"Example"},{"domain":"example.com"}]',
  ), [{ url: 'https://example.com', companyName: 'Example' }]);
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
    employmentType: 'Full-time',
    publication_date: new Date().toISOString(),
    categories: ['Engineering'],
  });

  assert.ok(normalized);
  assert.equal(normalized.source, 'aggregated');
  assert.equal(normalized.sourceProvider, 'himalayas');
  assert.equal(normalized.sourceName, 'Himalayas');
  assert.equal(normalized.sourceUrl, listingUrl);
  assert.equal(normalized.applicationLink, applyUrl);
  assert.equal(normalized.isDirectPosting, false);
  assert.equal(normalized.isWorldwideRemote, true);

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
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeWebhookJobPayload } from '../controllers/employerWebhookController.js';
import {
  extractCareerPageJob,
  isCareerJobUrl,
  parseCareerRssEntries,
} from '../services/careerScraperService.js';

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

test('parses RSS listings and recognizes career page URLs', () => {
  const entries = parseCareerRssEntries(`
    <rss xmlns:content="http://purl.org/rss/1.0/modules/content/"
      xmlns:job="https://example.com/job-fields"><channel><item>
      <title>Data Analyst</title>
      <link>https://careers.example.com/jobs/data-analyst</link>
      <content:encoded><![CDATA[<p>Analyze business data.</p>]]></content:encoded>
      <job:location>Hybrid - Lagos</job:location>
      <category>Analytics</category>
    </item></channel></rss>
  `);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].title, 'Data Analyst');
  assert.equal(entries[0].description, 'Analyze business data.');
  assert.equal(entries[0].location, 'Hybrid - Lagos');
  assert.equal(entries[0].workplaceType, 'hybrid');
  assert.equal(isCareerJobUrl(entries[0].applicationLink), true);
  assert.equal(isCareerJobUrl('https://example.com/careers'), false);
  assert.equal(isCareerJobUrl('https://example.com/company/about'), false);
});

test('extracts Schema.org JobPosting details from a sitemap page', () => {
  const page = extractCareerPageJob(`
    <html><head><script type="application/ld+json">
      {"@type":"JobPosting","title":"Remote Designer","description":"Design accessible products.",
       "datePosted":"2026-08-01","validThrough":"2026-12-01",
       "employmentType":"FULL_TIME","jobLocationType":"TELECOMMUTE",
       "jobLocation":{"address":{"addressLocality":"Africa"}},
       "baseSalary":{"currency":"USD","value":{"minValue":90000,"maxValue":110000}}}
    </script></head><body><h1>Remote Designer</h1></body></html>
  `, new URL('https://careers.example.com/careers/remote-designer'));

  assert.equal(page.title, 'Remote Designer');
  assert.equal(page.description, 'Design accessible products.');
  assert.equal(page.workplaceType, 'remote');
  assert.equal(page.location, 'Africa');
  assert.match(page.salary, /USD/);
});

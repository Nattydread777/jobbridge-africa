import { createHash } from 'node:crypto';
import Job from '../models/Job.js';
import { cleanHtmlSnippet } from '../utils/sanitizer.js';

const HIMALAYAS_API = 'https://himalayas.app/jobs/api';
const PAGE_SIZE = 20;
const REQUEST_DELAY_MS = 100;
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SYNC_RETRY_DELAY_MS = 15 * 60 * 1000;
const ACTIVE_JOB_LOOKBACK_MS = 120 * 24 * 60 * 60 * 1000;
const WORLDWIDE_PATTERN = /\b(worldwide|global(?:ly)?|anywhere|any location|africa)\b/i;

const pause = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const asText = (value) => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(', ');
  if (value && typeof value === 'object') {
    if (value.name || value.country || value.region || value.location || value.value) {
      return [value.name, value.country, value.region, value.location, value.value]
        .map(asText)
        .filter(Boolean)
        .join(', ');
    }
    return [value.minValue, value.maxValue, value.currency, value.period]
      .filter((part) => part !== undefined && part !== null && part !== '')
      .join(' ');
  }
  return '';
};

const asList = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asText(item?.name || item)).filter(Boolean);
};

const normalizeJobType = (value) => {
  const normalized = asText(value).toLowerCase();
  if (normalized.includes('part')) return 'Part-Time';
  if (normalized.includes('contract') || normalized.includes('freelance')) return 'Contract';
  if (normalized.includes('intern')) return 'Internship';
  if (normalized.includes('remote')) return 'Remote';
  return 'Full-Time';
};

const asDate = (value) => {
  if (!value) return null;
  const timestamp = typeof value === 'number'
    || (typeof value === 'string' && /^\d+$/.test(value))
    ? Number(value)
    : null;
  const normalizedValue = timestamp !== null
    ? timestamp < 1e12
      ? timestamp * 1000
      : timestamp
    : value;
  const date = new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeJob = (job) => {
  const companyName = asText(job.companyName || job.company?.name);
  const companySlug = asText(job.companySlug || job.company?.slug)
    || companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const title = asText(job.title);
  const description = cleanHtmlSnippet(job.description || job.excerpt);
  const excerpt = cleanHtmlSnippet(job.excerpt) || description.slice(0, 400);
  const locationRestriction = asText(
    job.locationRestriction || job.locationRestrictions || job.location,
  );
  const restrictionScope = `${locationRestriction} ${asText(job.location)}`;
  const safePubDate = asDate(job.pubDate) || new Date();
  const applicationUrl = asText(job.applicationLink || job.applicationUrl || job.url);
  const externalId = asText(job.slug || job.id);
  const workplaceText = asText(job.workplaceType || job.locationType || job.workplace);
  const workplaceType = /\bhybrid\b/i.test(workplaceText)
    ? 'hybrid'
    : job.remote === false || job.isRemote === false
      || /\b(on[- ]?site|office[- ]based)\b/i.test(workplaceText)
      ? 'on-site'
      : 'remote';

  if (!companyName || !title || !description || !applicationUrl) return null;
  let applicationLink;
  try {
    const parsedApplicationUrl = new URL(applicationUrl);
    if (!['http:', 'https:'].includes(parsedApplicationUrl.protocol)) return null;
    applicationLink = parsedApplicationUrl.toString();
  } catch {
    return null;
  }

  const stableIdentity = externalId || `${companySlug}\u0000${title.toLowerCase()}`;
  const sourceKey = createHash('sha256').update(stableIdentity).digest('hex');
  const salary = asText(job.salary || job.salaryRange);
  const categories = asList(job.categories);
  const tags = asList(job.tags);
  const seniority = asText(job.seniority || job.experienceLevel);
  const expiryDate = asDate(job.expiryDate)
    || new Date(safePubDate.getTime() + 90 * 24 * 60 * 60 * 1000);

  return {
    sourceKey,
    source: 'aggregated',
    sourceProvider: 'himalayas',
    isDirectPosting: false,
    isRemote: workplaceType === 'remote',
    workplaceType,
    isWorldwideRemote: workplaceType === 'remote' && WORLDWIDE_PATTERN.test(restrictionScope),
    title,
    companyName,
    companySlug,
    excerpt,
    description,
    pubDate: safePubDate,
    applicationLink,
    locationRestriction,
    location: locationRestriction || 'Remote',
    jobType: normalizeJobType(job.employmentType || job.jobType),
    seniority,
    salary,
    salaryRange: salary || 'Competitive',
    categories,
    tags,
    expiryDate,
    isApproved: true,
  };
};

const getJobsFromResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.jobs)) return payload.jobs;
  if (Array.isArray(payload?.data)) return payload.data;
  throw new Error('Himalayas API response did not include a jobs array');
};

const seedFallbackJobs = async (reason) => {
  console.warn(`Using clearly labelled sample jobs because the external feed is unavailable: ${reason}`);
  const publishedAt = new Date();
  const expiryDate = new Date(publishedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const samples = [
    {
      title: 'Sample Remote Product Analyst',
      location: 'Africa / Worldwide Remote',
      locationRestriction: 'Africa / Worldwide remote',
      seniority: 'Mid-level',
      categories: ['Product', 'Analytics'],
      tags: ['Sample listing'],
    },
    {
      title: 'Sample Remote Frontend Engineer',
      location: 'Africa / Worldwide Remote',
      locationRestriction: 'Africa / Worldwide remote',
      seniority: 'Mid-level',
      categories: ['Engineering', 'Frontend'],
      tags: ['Sample listing'],
    },
    {
      title: 'Sample Remote Project Manager',
      location: 'Africa / Worldwide Remote',
      locationRestriction: 'Africa / Worldwide remote',
      seniority: 'Senior',
      categories: ['Operations', 'Project Management'],
      tags: ['Sample listing'],
    },
  ];
  let upserted = 0;

  for (const sample of samples) {
    const sourceKey = createHash('sha256')
      .update(`jobbridge-fallback-${sample.title}`)
      .digest('hex');
    const result = await Job.updateOne(
      { sourceKey, source: 'aggregated', sourceProvider: 'jobbridge-fallback' },
      {
        $set: {
          ...sample,
          source: 'aggregated',
          sourceProvider: 'jobbridge-fallback',
          isDirectPosting: false,
          isRemote: true,
          workplaceType: 'remote',
          isWorldwideRemote: true,
          companyName: 'JobBridge Africa (Sample)',
          companySlug: 'jobbridge-africa-sample',
          excerpt: 'Demonstration data shown while the external job feed is unavailable.',
          description: 'This is a sample listing for demonstration only. It is not an active vacancy and cannot accept applications.',
          jobType: 'Remote',
          salaryRange: 'Not provided',
          categories: sample.categories,
          tags: sample.tags,
          pubDate: publishedAt,
          expiryDate,
          isApproved: true,
        },
        $setOnInsert: { sourceKey },
      },
      { upsert: true },
    );
    if (result.upsertedCount || result.modifiedCount) upserted += 1;
  }

  console.info(`Fallback sample jobs ready: ${samples.length} listings (${upserted} inserted or refreshed).`);
  return { pages: 0, fetched: 0, upserted, skipped: 0, fallback: true };
};

export const ingestHimalayasJobs = async () => {
  let cursor;
  let fetched = 0;
  let upserted = 0;
  let skipped = 0;
  let pages = 0;
  let stalePages = 0;
  const seenCursors = new Set();

  do {
    const url = new URL(HIMALAYAS_API);
    url.searchParams.set('limit', String(PAGE_SIZE));
    if (cursor) url.searchParams.set('cursor', cursor);

    let payload;
    let jobs;
    const startedAt = Date.now();
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(30000),
      });
      console.info(`Himalayas API page ${pages + 1}: HTTP ${response.status} (${Date.now() - startedAt} ms).`);
      if (!response.ok) {
        const retryAfter = response.headers.get('retry-after');
        throw new Error(
          `request failed with HTTP ${response.status}${retryAfter ? ` (retry after ${retryAfter})` : ''}`,
        );
      }
      payload = await response.json();
      jobs = getJobsFromResponse(payload);
      console.info(`Himalayas API page ${pages + 1}: parsed ${jobs.length} job records.`);
    } catch (error) {
      console.error(`Himalayas API page ${pages + 1} request or response failed:`, error.message);
      return seedFallbackJobs(error.message);
    }
    pages += 1;
    fetched += jobs.length;
    let pageIsOldAndExpired = jobs.length > 0;

    for (const rawJob of jobs) {
      if (!rawJob || typeof rawJob !== 'object') {
        skipped += 1;
        pageIsOldAndExpired = false;
        continue;
      }
      const normalized = normalizeJob(rawJob);
      if (!normalized) {
        skipped += 1;
        pageIsOldAndExpired = false;
        continue;
      }
      if (normalized.pubDate.getTime() >= Date.now() - ACTIVE_JOB_LOOKBACK_MS
        || normalized.expiryDate >= new Date()) {
        pageIsOldAndExpired = false;
      }
      if (normalized.expiryDate < new Date()) {
        skipped += 1;
        continue;
      }
      const { sourceKey, ...fields } = normalized;
      try {
        const result = await Job.updateOne(
          { sourceKey, source: { $in: ['aggregated', 'himalayas'] } },
          {
            $set: fields,
            $setOnInsert: { sourceKey },
          },
          { upsert: true },
        );
        if (result.upsertedCount || result.modifiedCount) upserted += 1;
      } catch (error) {
        if (error.code !== 11000) throw error;
        const conflictingListing = await Job.exists({
          sourceKey,
          source: { $nin: ['aggregated', 'himalayas'] },
        });
        if (!conflictingListing) throw error;
        skipped += 1;
      }
    }

    stalePages = pageIsOldAndExpired ? stalePages + 1 : 0;
    const nextCursor = payload?.nextCursor;
    if (stalePages >= 2 || nextCursor === null || nextCursor === undefined || nextCursor === '') {
      cursor = null;
    } else {
      cursor = String(nextCursor);
      if (seenCursors.has(cursor)) {
        return seedFallbackJobs('the API returned a repeated pagination cursor');
      }
      seenCursors.add(cursor);
      await pause(REQUEST_DELAY_MS);
    }
  } while (cursor);

  console.info(`Global job sync complete: ${pages} pages, fetched ${fetched}, upserted ${upserted}, skipped ${skipped}`);
  const removedFallbacks = await Job.deleteMany({ sourceProvider: 'jobbridge-fallback' });
  if (removedFallbacks.deletedCount) {
    console.info(`Removed ${removedFallbacks.deletedCount} sample fallback listings after a successful feed sync.`);
  }
  return { pages, fetched, upserted, skipped, fallback: false };
};

export const scheduleDailyJobIngestion = () => {
  let isRunning = false;
  const run = async () => {
    if (isRunning) {
      console.info('Global job sync skipped because the previous sync is still running.');
      return;
    }
    isRunning = true;
    try {
      const result = await ingestHimalayasJobs();
      if (result.fallback) {
        console.warn(`Sample listings are active; the external feed will be retried in ${SYNC_RETRY_DELAY_MS / 60000} minutes.`);
        const retryTimer = setTimeout(run, SYNC_RETRY_DELAY_MS);
        retryTimer.unref();
      }
    } catch (error) {
      console.error('Global job sync failed:', error);
      const retryTimer = setTimeout(run, SYNC_RETRY_DELAY_MS);
      retryTimer.unref();
    } finally {
      isRunning = false;
    }
  };

  run();
  setInterval(run, SYNC_INTERVAL_MS).unref();
  console.info('Global job sync started and scheduled to repeat every 24 hours.');
};

import { createHash } from 'node:crypto';
import Job from '../models/Job.js';

const HIMALAYAS_API = 'https://himalayas.app/jobs/api';
const PAGE_SIZE = 20;
const REQUEST_DELAY_MS = 500;
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
const AFRICAN_COUNTRIES = [
  'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi',
  'Cabo Verde', 'Cameroon', 'Central African Republic', 'Chad', 'Comoros',
  'Democratic Republic of the Congo', 'Djibouti', 'Egypt', 'Equatorial Guinea',
  'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea',
  'Guinea-Bissau', 'Ivory Coast', 'Cote d’Ivoire', 'Kenya', 'Lesotho', 'Liberia',
  'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco',
  'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Republic of the Congo', 'Rwanda',
  'Sao Tome and Principe', 'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia',
  'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda',
  'Zambia', 'Zimbabwe',
];
const AFRICA_COUNTRY_PATTERN = new RegExp(
  `\\b(?:${AFRICAN_COUNTRIES.map((country) => country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i',
);
const WORLDWIDE_PATTERN = /\b(worldwide|global(?:ly)?|anywhere|any location|africa)\b/i;
const EXCLUDED_FROM_AFRICA_PATTERN = /\b(?:excluding|except|excludes?|not available in|not eligible in|not open to|outside(?: of)?)\s+(?:the\s+)?africa\b|\bafrica\b[^.;]{0,30}\b(?:excluded|not eligible|not available)\b/i;

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

const normalizeJob = (job) => {
  const companyName = asText(job.companyName || job.company?.name);
  const companySlug = asText(job.companySlug || job.company?.slug)
    || companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const title = asText(job.title);
  const description = asText(job.description || job.excerpt);
  const locationRestriction = asText(
    job.locationRestriction || job.locationRestrictions || job.location,
  );
  const restrictionScope = `${locationRestriction} ${asText(job.location)}`;
  const excludesAfrica = EXCLUDED_FROM_AFRICA_PATTERN.test(restrictionScope);
  const africaAccessible = !excludesAfrica && (
    WORLDWIDE_PATTERN.test(restrictionScope)
    || AFRICA_COUNTRY_PATTERN.test(restrictionScope)
  );
  const rawPubDate = job.pubDate;
  const pubDateValue = typeof rawPubDate === 'number' && rawPubDate < 1e12
    ? rawPubDate * 1000
    : rawPubDate;
  const pubDate = pubDateValue ? new Date(pubDateValue) : new Date();
  const safePubDate = Number.isNaN(pubDate.getTime()) ? new Date() : pubDate;
  const applicationUrl = asText(job.applicationLink || job.applicationUrl || job.url);
  const externalId = asText(job.slug || job.id);

  if (!companyName || !title || !description || !applicationUrl) return null;
  if (job.remote === false || job.isRemote === false
    || /\b(on[- ]?site|office[- ]based)\b/i.test(asText(job.workplaceType || job.locationType))) {
    return null;
  }
  if (!africaAccessible) return null;
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
  const expiryDate = job.expiryDate
    ? new Date(job.expiryDate)
    : new Date(safePubDate.getTime() + 90 * 24 * 60 * 60 * 1000);

  return {
    sourceKey,
    source: 'aggregated',
    sourceProvider: 'himalayas',
    isDirectPosting: false,
    isRemote: true,
    isWorldwideRemote: !excludesAfrica && WORLDWIDE_PATTERN.test(restrictionScope),
    title,
    companyName,
    companySlug,
    excerpt: asText(job.excerpt) || description.slice(0, 400),
    description,
    pubDate: safePubDate,
    applicationLink,
    locationRestriction,
    location: locationRestriction || 'Worldwide remote',
    jobType: normalizeJobType(job.employmentType || job.jobType),
    seniority,
    salary,
    salaryRange: salary || 'Competitive',
    categories,
    tags,
    expiryDate: Number.isNaN(expiryDate.getTime())
      ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      : expiryDate,
    isApproved: true,
  };
};

const getJobsFromResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.jobs)) return payload.jobs;
  if (Array.isArray(payload?.data)) return payload.data;
  throw new Error('Himalayas API response did not include a jobs array');
};

export const ingestHimalayasJobs = async () => {
  let cursor;
  let fetched = 0;
  let upserted = 0;
  let skipped = 0;
  const seenCursors = new Set();

  do {
    const url = new URL(HIMALAYAS_API);
    url.searchParams.set('limit', String(PAGE_SIZE));
    if (cursor) url.searchParams.set('cursor', cursor);

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      throw new Error(`Himalayas API request failed (${response.status})`);
    }

    const payload = await response.json();
    const jobs = getJobsFromResponse(payload);
    fetched += jobs.length;

    for (const rawJob of jobs) {
      if (!rawJob || typeof rawJob !== 'object') {
        skipped += 1;
        continue;
      }
      const normalized = normalizeJob(rawJob);
      if (!normalized) {
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

    const nextCursor = payload?.nextCursor;
    if (nextCursor === null || nextCursor === undefined || nextCursor === '') {
      cursor = null;
    } else {
      cursor = String(nextCursor);
      if (seenCursors.has(cursor)) {
        throw new Error('Himalayas API returned a repeated pagination cursor');
      }
      seenCursors.add(cursor);
      await pause(REQUEST_DELAY_MS);
    }
  } while (cursor);

  console.info(`Himalayas sync complete: fetched ${fetched}, upserted ${upserted}, skipped ${skipped}`);
  return { fetched, upserted, skipped };
};

export const scheduleDailyJobIngestion = () => {
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setUTCHours(2, 0, 0, 0);
  if (nextRun <= now) nextRun.setUTCDate(nextRun.getUTCDate() + 1);

  const startDailyInterval = () => {
    const run = async () => {
      try {
        await ingestHimalayasJobs();
      } catch (error) {
        console.error('Scheduled Himalayas job sync failed:', error);
      }
    };
    run();
    setInterval(run, SYNC_INTERVAL_MS).unref();
  };

  const timer = setTimeout(startDailyInterval, nextRun.getTime() - now.getTime());
  timer.unref();
  console.info(`Himalayas job sync scheduled for ${nextRun.toISOString()}`);
};

import axios from 'axios';
import { createHash } from 'node:crypto';
import Job from '../models/Job.js';

const HIMALAYAS_API = 'https://himalayas.app/jobs/api/search';
const REMOTIVE_API = 'https://remotive.com/api/remote-jobs';
const REQUEST_TIMEOUT_MS = 20000;
const HIMALAYAS_DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;
const REMOTIVE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const HIMALAYAS_REQUEST_DELAY_MS = 1000;
const HIMALAYAS_MAX_PAGES = 5;
const API_USER_AGENT = 'JobBridgeAfricaRemoteJobs/1.0 (+https://www.jobbridgeafrica.org)';

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const asText = (value) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(', ');
  if (!value || typeof value !== 'object') return '';
  if (value.name || value.value || value.country || value.region || value.location) {
    return [value.name, value.value, value.country, value.region, value.location]
      .map(asText)
      .filter(Boolean)
      .join(', ');
  }
  return [value.currency, value.minValue, value.maxValue, value.period || value.unitText]
    .filter((part) => part !== undefined && part !== null && part !== '')
    .join(' ');
};

const asDate = (value) => {
  if (!value) return null;
  const numericValue = typeof value === 'number'
    || (typeof value === 'string' && /^\d+$/.test(value))
    ? Number(value)
    : null;
  const dateValue = numericValue === null ? value : numericValue < 1e12 ? numericValue * 1000 : numericValue;
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const RESTRICTED_LOCATION_PATTERNS = [
  /\b(?:us|u\.s\.|usa|u\.s\.a\.|united states|america|american)\b/i,
  /\b(?:uk|u\.k\.|united kingdom|great britain|britain|england|scotland|wales|northern ireland)\b/i,
  /\b(?:eu|e\.u\.|european union|europe|european)\b/i,
  /\bcanad(?:a|ian)\b/i,
  /\b(?:australia|australian)\b/i,
  /\b(?:except|excluding|only in|available in|restricted to|limited to|based in|located in|must be in|residents? of|citizens? of|work authorization|work authorisation|time zones?|timezone|within)\b/i,
];
const GLOBAL_LOCATION_PATTERN = /\b(?:worldwide|anywhere|global(?:ly)?)\b/i;
const UNRESTRICTED_REMOTE_PATTERN = /\b(?:remote|fully remote|work from home|distributed)\b/i;

export const isWorldwideOnly = (locationString) => {
  const location = asText(locationString).trim();
  if (!location) return true;

  if (RESTRICTED_LOCATION_PATTERNS.some((pattern) => pattern.test(location))) return false;

  if (GLOBAL_LOCATION_PATTERN.test(location)) return true;

  if (UNRESTRICTED_REMOTE_PATTERN.test(location)) {
    const residual = location
      .replace(UNRESTRICTED_REMOTE_PATTERN, '')
      .replace(/[()[\],|/;:_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return !residual || /^(?:remote|fully|work|from|home|distributed|anywhere|worldwide|global|only)$/i.test(residual);
  }

  return false;
};

const normalizeJobType = (value) => {
  const type = asText(value).toLowerCase();
  if (type.includes('part')) return 'Part-Time';
  if (type.includes('contract') || type.includes('freelance') || type.includes('temporary')) return 'Contract';
  if (type.includes('intern')) return 'Internship';
  if (type.includes('remote')) return 'Remote';
  return 'Full-Time';
};

const safeHttpUrl = (value) => {
  try {
    const url = new URL(asText(value));
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

const sourceIdentity = (sourceName, job, companyName, companySlug, title, location, sourceUrl) => {
  if (sourceName === 'Himalayas') {
    const legacyIdentity = asText(job.slug || job.id) || `${companySlug}\u0000${title.toLowerCase()}`;
    return createHash('sha256').update(legacyIdentity).digest('hex');
  }
  const externalId = asText(job.id || job.slug || job.job_id || job.guid);
  const stableValue = externalId || `${companyName}\u0000${title}\u0000${location}\u0000${sourceUrl}`;
  return createHash('sha256').update(`${sourceName.toLowerCase()}\u0000${stableValue}`).digest('hex');
};

export const normalizeRemoteJob = (sourceName, rawJob) => {
  const companyName = asText(rawJob.companyName || rawJob.company_name || rawJob.company?.name);
  const title = asText(rawJob.title || rawJob.position);
  const description = asText(rawJob.description || rawJob.excerpt || rawJob.description_text);
  const location = asText(
    rawJob.locationRestriction || rawJob.locationRestrictions || rawJob.location_restrictions || rawJob.location
      || rawJob.candidate_required_location || rawJob.regions,
  );
  const sourceUrl = safeHttpUrl(
    rawJob.sourceUrl || rawJob.source_url || rawJob.jobUrl || rawJob.url
      || rawJob.applicationLink || rawJob.applicationUrl || rawJob.apply_url,
  );
  const applicationLink = safeHttpUrl(
    rawJob.applicationLink || rawJob.applicationUrl || rawJob.apply_url || rawJob.url
      || rawJob.sourceUrl || rawJob.source_url || rawJob.jobUrl,
  );

  if (!companyName || !title || !description || !sourceUrl || !applicationLink
    || !isWorldwideOnly(location)) return null;

  const pubDate = asDate(rawJob.pubDate || rawJob.publication_date || rawJob.date || rawJob.createdAt) || new Date();
  const expiryDate = asDate(rawJob.expiryDate || rawJob.expiry_date)
    || new Date(pubDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  if (expiryDate <= new Date()) return null;

  const companySlug = asText(rawJob.companySlug || rawJob.company_slug || rawJob.company?.slug)
    || companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const sourceKey = sourceIdentity(sourceName, rawJob, companyName, companySlug, title, location, sourceUrl);
  const workplaceType = 'remote';
  const salary = asText(rawJob.salary || rawJob.salaryRange || rawJob.salary_range);

  return {
    sourceKey,
    source: 'aggregated',
    sourceProvider: sourceName.toLowerCase(),
    sourceName,
    sourceUrl,
    isDirectPosting: false,
    isRemote: true,
    isWorldwideRemote: true,
    workplaceType,
    title,
    companyName,
    companySlug,
    excerpt: asText(rawJob.excerpt) || description.slice(0, 400),
    description,
    pubDate,
    applicationLink,
    locationRestriction: location,
    location: location || 'Worldwide',
    jobType: normalizeJobType(rawJob.employmentType || rawJob.job_type || rawJob.jobType),
    seniority: asText(rawJob.seniority || rawJob.experience),
    salary,
    salaryRange: salary || 'Competitive',
    categories: Array.isArray(rawJob.categories) ? rawJob.categories.map(asText).filter(Boolean) : [],
    tags: Array.isArray(rawJob.tags) ? rawJob.tags.map(asText).filter(Boolean) : [],
    expiryDate,
    isApproved: true,
    isActive: true,
  };
};

const getHimalayasJobs = (payload) => {
  if (Array.isArray(payload?.jobs)) return payload.jobs;
  if (Array.isArray(payload?.data?.jobs)) return payload.data.jobs;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  throw new Error('Himalayas API response did not contain a jobs array.');
};

const getRemotiveJobs = (payload) => {
  if (Array.isArray(payload?.jobs)) return payload.jobs;
  throw new Error('Remotive API response did not contain a jobs array.');
};

const upsertJobs = async (sourceName, rawJobs) => {
  let accepted = 0;
  let rejected = 0;
  let upserted = 0;

  for (const rawJob of rawJobs) {
    const normalized = normalizeRemoteJob(sourceName, rawJob);
    if (!normalized) {
      rejected += 1;
      continue;
    }
    const { sourceKey, ...fields } = normalized;
    const result = await Job.updateOne(
      { sourceKey, source: 'aggregated', sourceProvider: sourceName.toLowerCase() },
      { $set: { ...fields, lastSeenAt: new Date() }, $setOnInsert: { sourceKey } },
      { upsert: true, runValidators: true },
    );
    accepted += 1;
    if (result.upsertedCount || result.modifiedCount) upserted += 1;
  }

  console.info(`${sourceName} ingestion: ${rawJobs.length} fetched, ${accepted} worldwide accepted, ${rejected} rejected, ${upserted} inserted or updated.`);
  return { fetched: rawJobs.length, accepted, rejected, upserted };
};

const getJson = async (url, params = {}) => {
  const response = await axios.get(url, {
    params,
    headers: {
      Accept: 'application/json',
      'User-Agent': API_USER_AGENT,
    },
    timeout: REQUEST_TIMEOUT_MS,
    maxContentLength: 10 * 1024 * 1024,
    maxBodyLength: 10 * 1024 * 1024,
  });
  return response.data;
};

export const ingestHimalayasRemoteJobs = async () => {
  let fetched = 0;
  let accepted = 0;
  let rejected = 0;
  let upserted = 0;

  for (let page = 1; page <= HIMALAYAS_MAX_PAGES; page += 1) {
    try {
      const payload = await getJson(`${HIMALAYAS_API}`, { q: '', sort: 'recent', page });
      const jobs = getHimalayasJobs(payload);
      const result = await upsertJobs('Himalayas', jobs);
      fetched += result.fetched;
      accepted += result.accepted;
      rejected += result.rejected;
      upserted += result.upserted;

      const totalPages = Number(payload?.totalPages || payload?.total_pages || payload?.pagination?.totalPages);
      if (jobs.length === 0 || (Number.isFinite(totalPages) && totalPages > 0 && page >= totalPages)) break;
      if (!Number.isFinite(totalPages) && jobs.length < 20) break;
      if (page < HIMALAYAS_MAX_PAGES) await sleep(HIMALAYAS_REQUEST_DELAY_MS);
    } catch (error) {
      console.error(`Himalayas API ingestion failed on page ${page}:`, error.message);
      break;
    }
  }

  return { sourceName: 'Himalayas', fetched, accepted, rejected, upserted };
};

export const ingestRemotiveRemoteJobs = async () => {
  try {
    const payload = await getJson(REMOTIVE_API);
    const result = await upsertJobs('Remotive', getRemotiveJobs(payload));
    return { sourceName: 'Remotive', ...result };
  } catch (error) {
    console.error('Remotive API ingestion failed:', error.message);
    return { sourceName: 'Remotive', fetched: 0, accepted: 0, rejected: 0, upserted: 0, error: error.message };
  }
};

export const scheduleRemoteApiIngestion = () => {
  let himalayasRunning = false;
  let remotiveRunning = false;

  const runHimalayas = async () => {
    if (himalayasRunning) {
      console.info('Himalayas API ingestion skipped because a previous run is still active.');
      return;
    }
    himalayasRunning = true;
    try {
      await ingestHimalayasRemoteJobs();
    } catch (error) {
      console.error('Himalayas API ingestion runner failed:', error.message);
    } finally {
      himalayasRunning = false;
    }
  };

  const runRemotive = async () => {
    if (remotiveRunning) {
      console.info('Remotive API ingestion skipped because a previous run is still active.');
      return;
    }
    remotiveRunning = true;
    try {
      await ingestRemotiveRemoteJobs();
    } catch (error) {
      console.error('Remotive API ingestion runner failed:', error.message);
    } finally {
      remotiveRunning = false;
    }
  };

  void runHimalayas();
  void runRemotive();
  setInterval(() => void runHimalayas(), HIMALAYAS_DAILY_INTERVAL_MS).unref();
  setInterval(() => void runRemotive(), REMOTIVE_INTERVAL_MS).unref();
  console.info('Remote API ingestion scheduled: Himalayas daily and Remotive every 6 hours.');
};

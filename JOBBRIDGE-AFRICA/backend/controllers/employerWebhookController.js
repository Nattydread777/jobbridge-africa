import { createHash } from 'node:crypto';
import asyncHandler from 'express-async-handler';
import { load } from 'cheerio';
import Job from '../models/Job.js';

const MAX_JOBS_PER_REQUEST = 50;
const MAX_TITLE_LENGTH = 300;
const MAX_LOCATION_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 100000;

const valueAsText = (value) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (Array.isArray(value)) return value.map(valueAsText).filter(Boolean).join(', ');
  if (value && typeof value === 'object') {
    if (value.currency || value.minValue !== undefined || value.maxValue !== undefined) {
      const nestedValue = value.value && typeof value.value === 'object'
        ? [value.value.minValue, value.value.maxValue]
        : [value.value];
      return [
        value.currency,
        value.minValue,
        value.maxValue,
        ...nestedValue,
        value.unitText,
      ].filter((part) => part !== undefined && part !== null && part !== '').join(' ');
    }
    if (value.name || value.value || value.label || value.location || value.descriptor
      || value.city || value.country || value.address) {
      return [
        value.name,
        value.value,
        value.label,
        value.location,
        value.descriptor,
        value.city,
        value.country,
        value.address,
      ]
        .map(valueAsText)
        .filter(Boolean)
        .join(', ');
    }
  }
  return '';
};

const plainText = (value) => {
  const $ = load(valueAsText(value));
  $('script, style').remove();
  return $.text().replace(/\s+/g, ' ').trim();
};

const parseDate = (value) => {
  if (!value) return null;
  const numericValue = typeof value === 'number'
    || (typeof value === 'string' && /^\d+$/.test(value))
    ? Number(value)
    : null;
  const dateValue = numericValue === null ? value : numericValue < 1e12 ? numericValue * 1000 : numericValue;
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeJobType = (value, workplaceType) => {
  if (workplaceType === 'remote') return 'Remote';
  const normalized = valueAsText(value).toLowerCase();
  if (normalized.includes('part')) return 'Part-Time';
  if (normalized.includes('contract') || normalized.includes('temporary') || normalized.includes('freelance')) return 'Contract';
  if (normalized.includes('intern')) return 'Internship';
  return 'Full-Time';
};

const normalizeWorkplaceType = (job, location) => {
  const value = [
    job.workplaceType,
    job.workplace,
    job.locationType,
    job.workType,
    job.jobPostingInfo?.workplaceType,
    job.jobPostingInfo?.jobLocationType,
    job.jobPostingInfo?.timeType,
    /^(true|remote)$/i.test(valueAsText(job.remote)) ? 'remote' : '',
    location,
  ].map(valueAsText).join(' ').toLowerCase();
  if (/\bhybrid\b/.test(value)) return 'hybrid';
  if (/\b(remote|telecommute|work from home|distributed|anywhere)\b/.test(value)) return 'remote';
  return 'on-site';
};

const getJobs = (body) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.jobs)) return body.jobs;
  if (Array.isArray(body?.data?.jobs)) return body.data.jobs;
  const candidate = body?.job || body?.data?.job || body?.data || body;
  return candidate && typeof candidate === 'object' && !Array.isArray(candidate)
    ? [candidate]
    : [];
};

export const normalizeWebhookJobPayload = (rawJob, employer, index = 0) => {
  if (!rawJob || typeof rawJob !== 'object' || Array.isArray(rawJob)) {
    throw new Error(`Job at index ${index} must be a JSON object.`);
  }

  const jobPostingInfo = rawJob.jobPostingInfo || {};
  const title = plainText(rawJob.title || rawJob.name || rawJob.text || jobPostingInfo.title);
  const description = plainText(
    rawJob.description || rawJob.descriptionPlain || rawJob.descriptionHtml
      || rawJob.content || rawJob.body || jobPostingInfo.jobDescription,
  );
  const rawLocation = valueAsText(
    rawJob.location || rawJob.locationName || rawJob.categories?.location
      || rawJob.offices || rawJob.jobLocation || rawJob.locations,
  ).slice(0, MAX_LOCATION_LENGTH);
  const workplaceType = normalizeWorkplaceType(rawJob, rawLocation);
  const location = rawLocation || (workplaceType === 'remote' ? 'Remote' : '');
  if (!title || title.length > MAX_TITLE_LENGTH || !description || !location) {
    throw new Error(`Job at index ${index} requires a title (up to ${MAX_TITLE_LENGTH} characters), description, and location.`);
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Job at index ${index} description exceeds ${MAX_DESCRIPTION_LENGTH} characters.`);
  }

  const jobType = normalizeJobType(
    rawJob.employmentType || rawJob.employment_type || rawJob.commitment || rawJob.jobType || rawJob.type
      || rawJob.categories?.commitment || jobPostingInfo.timeType || jobPostingInfo.jobType,
    workplaceType,
  );
  const department = valueAsText(
    rawJob.department || rawJob.departments || rawJob.categories?.team
      || rawJob.team || rawJob.category || jobPostingInfo.department
      || rawJob.jobFamily || rawJob.jobGroup,
  ).slice(0, 200);
  const salary = valueAsText(
    rawJob.salaryRange || rawJob.salary || rawJob.compensation || rawJob.baseSalary
      || jobPostingInfo.compensationRange,
  ).slice(0, 500);
  const applicationLink = valueAsText(
    rawJob.applicationLink || rawJob.absolute_url || rawJob.hostedUrl
      || rawJob.applyUrl || rawJob.externalUrl || rawJob.url,
  );
  if (applicationLink) {
    let parsedUrl;
    try {
      parsedUrl = new URL(applicationLink);
    } catch {
      throw new Error(`Job at index ${index} has an invalid application URL.`);
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error(`Job at index ${index} application URL must use HTTP or HTTPS.`);
    }
  }

  const expiryDate = parseDate(
    rawJob.expiryDate || rawJob.validThrough || rawJob.deadline || jobPostingInfo.endDate,
  )
    || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  if (expiryDate <= new Date()) throw new Error(`Job at index ${index} has an expired application deadline.`);

  const externalId = valueAsText(
    rawJob.id || rawJob.requisitionId || rawJob.jobRequisitionId || rawJob.externalJobId
      || rawJob.postingId || rawJob.gh_jid
      || rawJob.internalJobId || rawJob.slug || applicationLink,
  );
  const provider = valueAsText(rawJob.sourceProvider || rawJob.provider || rawJob.integration)
    .toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60) || 'ats-webhook';
  const sourceKey = createHash('sha256')
    .update(`${employer._id}:${provider}:${externalId || `${title.toLowerCase()}:${location.toLowerCase()}`}`)
    .digest('hex');
  const companyName = employer.companyName || employer.name;
  const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return {
    sourceKey,
    title,
    description,
    excerpt: description.slice(0, 400),
    companyName,
    companySlug,
    company: employer._id,
    postedBy: employer._id,
    location,
    workplaceType,
    isRemote: workplaceType === 'remote',
    isWorldwideRemote: workplaceType === 'remote' && /\b(worldwide|global(?:ly)?|anywhere|africa)\b/i.test(location),
    jobType,
    department,
    salary,
    salaryRange: salary || 'Competitive',
    expiryDate,
    pubDate: parseDate(
      rawJob.pubDate || rawJob.datePosted || rawJob.createdAt || jobPostingInfo.startDate,
    ) || new Date(),
    applicationEmail: valueAsText(rawJob.applicationEmail || rawJob.contactEmail) || employer.email,
    applicationLink,
    requirements: plainText(rawJob.requirements),
    responsibilities: plainText(rawJob.responsibilities),
    benefits: plainText(rawJob.benefits),
    categories: department ? [department] : [],
    source: 'employer',
    sourceProvider: provider,
    isDirectPosting: true,
    isApproved: true,
  };
};

export const ingestEmployerWebhookJobs = asyncHandler(async (req, res) => {
  const payloadJobs = getJobs(req.body);
  if (!payloadJobs.length) {
    return res.status(400).json({ message: 'Provide a job object or a non-empty jobs array.' });
  }
  if (payloadJobs.length > MAX_JOBS_PER_REQUEST) {
    return res.status(400).json({ message: `A webhook request can contain at most ${MAX_JOBS_PER_REQUEST} jobs.` });
  }

  let normalizedJobs;
  try {
    normalizedJobs = payloadJobs.map((job, index) =>
      normalizeWebhookJobPayload(job, req.user, index),
    );
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  const savedJobs = [];
  for (const normalizedJob of normalizedJobs) {
    const { sourceKey, ...fields } = normalizedJob;
    try {
      const job = await Job.findOneAndUpdate(
        { sourceKey, source: 'employer', postedBy: req.user._id },
        { $set: fields, $setOnInsert: { sourceKey } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
      );
      savedJobs.push(job);
    } catch (error) {
      if (error.code === 11000) {
        res.status(409);
        throw new Error('A job source identifier conflicts with another employer listing.');
      }
      throw error;
    }
  }

  return res.status(200).json({
    received: payloadJobs.length,
    upserted: savedJobs.length,
    employer: { id: req.user._id, companyName: req.user.companyName },
    jobs: savedJobs.map(({ _id, title, sourceKey }) => ({ id: _id, title, sourceKey })),
  });
});

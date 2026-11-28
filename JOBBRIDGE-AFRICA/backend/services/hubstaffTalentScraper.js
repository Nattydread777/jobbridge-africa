import axios from 'axios';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import Job from '../models/Job.js';
import { cleanHtmlSnippet } from '../utils/sanitizer.js';
import {
  deriveJobSignals,
  isGeographicallyEligibleJob,
} from '../utils/jobSignals.js';
import { extractSalaryCurrency } from '../utils/salary.js';

const HUBSTAFF_ORIGIN = 'https://hubstafftalent.net';
const HUBSTAFF_SEARCH_URL = `${HUBSTAFF_ORIGIN}/search/jobs?search%5Bkeywords%5D=&page=1&search%5Btype%5D=&search%5Blast_slider%5D=&search%5Bnewer_than%5D=&search%5Bnewer_than%5D=&search%5Bpayrate_start%5D=1&search%5Bpayrate_end%5D=100&search%5Bpayrate_null%5D=0&search%5Bpayrate_null%5D=1&search%5Bbudget_start%5D=1&search%5Bbudget_end%5D=100000&search%5Bbudget_null%5D=0&search%5Bbudget_null%5D=1&search%5Bexperience_level%5D=-1&search%5Bcountries%5D%5B%5D=&search%5Blanguages%5D%5B%5D=`;
const PAGE_COUNT = 3;
const REQUEST_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 20000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
const USER_AGENT = 'JobBridgeAfricaBot/1.0 (+https://jobbridgeafrica.com)';

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const textOf = (element) => element
  .text()
  .replace(/\s+/g, ' ')
  .trim();

const firstText = ($container, selectors) => {
  for (const selector of selectors) {
    const value = textOf($container.find(selector).first());
    if (value) return value;
  }
  return '';
};

const hubstaffUrl = (value, baseUrl = HUBSTAFF_ORIGIN, allowApplicationPath = false) => {
  try {
    const url = new URL(value, baseUrl);
    if (url.protocol !== 'https:'
      || !['hubstafftalent.net', 'www.hubstafftalent.net'].includes(url.hostname)
      || !(/^\/jobs\/[^/]+\/?$/i.test(url.pathname)
        || (allowApplicationPath && /^\/jobs\/[^/]+\/apply\/?$/i.test(url.pathname)))) return '';
    url.hostname = 'hubstafftalent.net';
    url.pathname = url.pathname.replace(/\/+$/, '');
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return '';
  }
};

const parseDate = (value) => {
  if (!value) return null;
  const normalizedValue = String(value).trim().replace(/\s+at\s+/i, ' ');
  const date = new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeJobType = (value) => {
  const type = String(value || '').toLowerCase();
  if (type.includes('part')) return 'Part-Time';
  if (type.includes('intern')) return 'Internship';
  if (type.includes('hourly') || type.includes('fixed') || type.includes('contract')
    || type.includes('freelance') || type.includes('temporary')) return 'Contract';
  if (type.includes('remote')) return 'Remote';
  return 'Full-Time';
};

export const extractHubstaffResultsHtml = (responseBody) => {
  if (typeof responseBody !== 'string') {
    throw new Error('Hubstaff Talent returned a non-text search response.');
  }
  if (/^\s*</.test(responseBody)) return responseBody;

  const assignment = responseBody.match(/\$\('#results'\)\.html\(("(?:\\.|[^"\\])*")\);/);
  if (!assignment) {
    throw new Error('Hubstaff Talent search response did not contain job results.');
  }

  try {
    const jsonCompatibleLiteral = assignment[1].replace(/\\(?!["\\/bfnrtu])/g, '');
    return JSON.parse(jsonCompatibleLiteral);
  } catch {
    throw new Error('Hubstaff Talent search response contained invalid job results.');
  }
};

export const parseHubstaffTalentListings = (html, baseUrl = HUBSTAFF_ORIGIN) => {
  const $ = load(html);
  const listings = [];
  const seenUrls = new Set();

  $('.search-result').each((_, element) => {
    const card = $(element);
    const titleLink = card.find('.main-details a.name').first();
    const sourceUrl = hubstaffUrl(titleLink.attr('href'), baseUrl);
    if (!sourceUrl || seenUrls.has(sourceUrl)) return;

    const title = textOf(titleLink);
    const companyName = firstText(card, ['.job-company a.job-agency', '.job-company .job-agency']);
    const description = firstText(card, ['.profil-bio', '.job-description', '.description']);
    const remote = card.find('.hi-remote').length > 0
      || /\bremote job\b/i.test(firstText(card, ['.job-company']));
    if (!title || !companyName || !description || !remote) return;

    const postedDate = card.find('.a-tooltip').first().attr('data-original-title')
      || firstText(card, ['.posted-date', 'time[datetime]']);
    const postedDateTime = card.find('time[datetime]').first().attr('datetime') || postedDate;
    const salary = firstText(card, [
      '.pay-rate',
      '.budget',
      '.job-budget',
      '.budget-range',
      '.fixed-price',
    ]);
    const tags = [...new Set(card.find('.tag').map((__, tag) => textOf($(tag))).get().filter(Boolean))];
    const label = firstText(card, ['.main-details > .label', '.job-type']);
    const applicationUrl = new URL(`${new URL(sourceUrl).pathname}/apply`, HUBSTAFF_ORIGIN).href;

    seenUrls.add(sourceUrl);
    listings.push({
      title,
      companyName,
      description,
      sourceUrl,
      applicationUrl,
      salary,
      jobType: label,
      tags,
      postedDate: postedDateTime,
    });
  });

  return listings;
};

export const normalizeHubstaffTalentListing = (listing, now = new Date()) => {
  if (!listing || typeof listing !== 'object') return null;

  const title = String(listing.title || '').trim();
  const companyName = String(listing.companyName || '').trim();
  const description = cleanHtmlSnippet(listing.description);
  const sourceUrl = hubstaffUrl(listing.sourceUrl);
  const applicationLink = hubstaffUrl(listing.applicationUrl, HUBSTAFF_ORIGIN, true);
  if (!title || !companyName || !description || !sourceUrl || !applicationLink) return null;

  const pubDate = parseDate(listing.postedDate) || now;
  const sourceKey = createHash('sha256').update(sourceUrl.toLowerCase()).digest('hex');
  const normalized = {
    sourceKey,
    source: 'aggregated',
    sourceProvider: 'hubstafftalent',
    sourceName: 'Hubstaff Talent',
    sourceUrl,
    isDirectPosting: false,
    isRemote: true,
    isWorldwideRemote: false,
    workplaceType: 'remote',
    title,
    companyName,
    companySlug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    location: 'Remote',
    locationRestriction: '',
    excerpt: description.slice(0, 400),
    description,
    applicationLink,
    jobType: normalizeJobType(listing.jobType),
    salary: String(listing.salary || '').trim(),
    salaryRange: String(listing.salary || '').trim() || 'Competitive',
    salaryCurrency: extractSalaryCurrency(undefined, listing.salary),
    categories: [],
    tags: Array.isArray(listing.tags) ? [...new Set(listing.tags.map(String).map(tag => tag.trim()).filter(Boolean))] : [],
    pubDate,
    expiryDate: null,
    isApproved: true,
    isActive: true,
  };
  if (!isGeographicallyEligibleJob(normalized)) return null;
  return { ...normalized, ...deriveJobSignals(normalized) };
};

const upsertHubstaffJob = async (normalized) => {
  const { sourceKey, ...fields } = normalized;
  const existing = await Job.findOne({ sourceUrl: fields.sourceUrl }).select('_id sourceKey');
  const update = {
    ...fields,
    lastSeenAt: new Date(),
    ...(existing?.sourceKey ? {} : { sourceKey }),
  };

  try {
    return existing
      ? await Job.updateOne({ _id: existing._id }, { $set: update }, { runValidators: true })
      : await Job.updateOne(
        { sourceKey },
        { $set: { ...update, sourceKey } },
        { upsert: true, runValidators: true },
      );
  } catch (error) {
    if (error.code !== 11000) throw error;
    const duplicate = await Job.findOne({ sourceUrl: fields.sourceUrl }).select('_id');
    if (!duplicate) throw error;
    return Job.updateOne(
      { _id: duplicate._id },
      { $set: { ...fields, lastSeenAt: new Date() } },
      { runValidators: true },
    );
  }
};

const axiosOptions = {
  timeout: REQUEST_TIMEOUT_MS,
  maxContentLength: MAX_RESPONSE_BYTES,
  maxBodyLength: MAX_RESPONSE_BYTES,
};

export const ingestHubstaffTalentJobs = async () => {
  let fetched = 0;
  let upserted = 0;
  let skipped = 0;
  let failedPages = 0;
  let csrfToken = '';
  const firstPageUrl = new URL(HUBSTAFF_SEARCH_URL);

  try {
    const initialResponse = await axios.get(firstPageUrl.href, {
      ...axiosOptions,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': USER_AGENT,
      },
    });
    csrfToken = load(initialResponse.data)('meta[name="csrf-token"]').attr('content') || '';
  } catch (error) {
    console.error('Hubstaff Talent could not initialize its search session:', error.message);
    return { pages: 0, fetched, upserted, skipped, failedPages: PAGE_COUNT };
  }

  for (let page = 1; page <= PAGE_COUNT; page += 1) {
    const pageUrl = new URL(HUBSTAFF_SEARCH_URL);
    pageUrl.searchParams.set('page', String(page));

    try {
      const response = await axios.get(pageUrl.href, {
        ...axiosOptions,
        responseType: 'text',
        headers: {
          Accept: 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript',
          'User-Agent': USER_AGENT,
          'X-Requested-With': 'XMLHttpRequest',
          Referer: `${HUBSTAFF_ORIGIN}/search/jobs`,
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
      });
      const html = extractHubstaffResultsHtml(response.data);
      const listings = parseHubstaffTalentListings(html, pageUrl.href);
      fetched += listings.length;

      for (const listing of listings) {
        const normalized = normalizeHubstaffTalentListing(listing);
        if (!normalized) {
          skipped += 1;
          continue;
        }
        const result = await upsertHubstaffJob(normalized);
        if (result.upsertedCount || result.modifiedCount) upserted += 1;
      }

      console.info(`Hubstaff Talent page ${page}: parsed ${listings.length} remote listings.`);
    } catch (error) {
      failedPages += 1;
      console.error(`Hubstaff Talent page ${page} failed:`, error.message);
    } finally {
      if (page < PAGE_COUNT) await pause(REQUEST_DELAY_MS);
    }
  }

  console.info(`Hubstaff Talent ingestion: ${fetched} fetched, ${upserted} inserted or updated, ${skipped} skipped, ${failedPages} failed pages.`);
  return { pages: PAGE_COUNT, fetched, upserted, skipped, failedPages };
};

export const scheduleHubstaffTalentIngestion = () => {
  let isRunning = false;
  const run = async () => {
    if (isRunning) {
      console.info('Hubstaff Talent ingestion skipped because a previous run is still active.');
      return;
    }
    isRunning = true;
    try {
      await ingestHubstaffTalentJobs();
    } catch (error) {
      console.error('Hubstaff Talent ingestion failed:', error.message);
    } finally {
      isRunning = false;
    }
  };

  void run();
  setInterval(() => void run(), SYNC_INTERVAL_MS).unref();
  console.info('Hubstaff Talent scraper scheduled to run daily.');
};

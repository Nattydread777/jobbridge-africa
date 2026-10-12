import axios from 'axios';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import Job from '../models/Job.js';

const MYJOBMAG_LISTING_URL = 'https://www.myjobmag.com/jobs-by-title/recruitment-agency';
const REQUEST_TIMEOUT_MS = 20000;
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;
const USER_AGENT = 'JobBridgeAfrica-JobAggregator/1.0 (+https://www.jobbridgeafrica.org)';

const textOf = (element) => element
  .text()
  .replace(/\s+/g, ' ')
  .trim();

const detailUrl = (href, baseUrl) => {
  try {
    const url = new URL(href, baseUrl);
    if (url.protocol !== 'https:'
      || !(url.hostname === 'myjobmag.com' || url.hostname.endsWith('.myjobmag.com'))) return '';
    url.hash = '';
    return url.href;
  } catch {
    return '';
  }
};

const firstText = ($container, selectors) => {
  for (const selector of selectors) {
    const value = textOf($container.find(selector).first());
    if (value) return value;
  }
  return '';
};

const getListingCard = ($, anchor) => {
  let card = $(anchor).parent();
  for (let depth = 0; depth < 6 && card.length; depth += 1) {
    const title = firstText(card, ['h2', 'h3', 'h4']) || textOf($(anchor));
    const companyName = firstText(card, [
      '[itemprop="hiringOrganization"]',
      '[itemprop="name"]',
      '.company-name',
      '.company',
      '.job-company',
      '[class*="company"]',
      '[data-company]',
    ]) || card.attr('data-company') || '';
    const location = firstText(card, [
      '[itemprop="jobLocation"]',
      '.location',
      '.job-location',
      '[class*="location"]',
      '[data-location]',
    ]) || card.attr('data-location') || '';
    const description = firstText(card, [
      '[itemprop="description"]',
      '.job-description',
      '.job-summary',
      '.summary',
      '.excerpt',
      '[class*="description"]',
      '[class*="summary"]',
    ]) || textOf(card)
      .replace(title, '')
      .replace(companyName, '')
      .replace(location, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (title && (companyName || location || description.length > title.length)) {
      return { title, companyName, location, description };
    }
    card = card.parent();
  }
  return null;
};

export const parseMyJobMagListings = (html, baseUrl = MYJOBMAG_LISTING_URL) => {
  const $ = load(html);
  const listings = [];
  const seenUrls = new Set();

  $('a[href]').each((_, anchor) => {
    const url = detailUrl($(anchor).attr('href'), baseUrl);
    if (!url || !/(?:^|\/)jobs?\/[^/]+/i.test(new URL(url).pathname) || seenUrls.has(url)) return;

    const details = getListingCard($, anchor);
    if (!details?.title || !details.companyName || !details.description) return;
    seenUrls.add(url);
    listings.push({
      ...details,
      location: details.location || 'Nigeria',
      detailUrl: url,
    });
  });

  return listings;
};

export const normalizeMyJobMagListing = (listing) => {
  if (!listing || typeof listing !== 'object') return null;
  const title = String(listing.title || '').trim();
  const companyName = String(listing.companyName || '').trim();
  const description = String(listing.description || '').trim();
  const location = String(listing.location || 'Nigeria').trim();
  const listingUrl = detailUrl(listing.detailUrl || listing.sourceUrl || '', MYJOBMAG_LISTING_URL);
  if (!title || !companyName || !description || !listingUrl) return null;

  const sourceKey = createHash('sha256').update(listingUrl.toLowerCase()).digest('hex');
  const now = new Date();
  return {
    sourceKey,
    source: 'aggregated',
    sourceProvider: 'myjobmag',
    sourceName: 'MyJobMag',
    sourceUrl: listingUrl,
    isDirectPosting: false,
    isRemote: false,
    isWorldwideRemote: false,
    workplaceType: 'on-site',
    title,
    companyName,
    companySlug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    location,
    locationRestriction: location,
    excerpt: description.slice(0, 400),
    description,
    applicationLink: listingUrl,
    jobType: 'Full-Time',
    pubDate: now,
    expiryDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    isApproved: true,
    isActive: true,
  };
};

export const ingestMyJobMagListings = async () => {
  const response = await axios.get(MYJOBMAG_LISTING_URL, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': USER_AGENT,
    },
    timeout: REQUEST_TIMEOUT_MS,
    maxContentLength: 5 * 1024 * 1024,
    maxBodyLength: 5 * 1024 * 1024,
  });
  if (typeof response.data !== 'string') {
    throw new Error('MyJobMag returned an unexpected non-HTML response.');
  }

  const listings = parseMyJobMagListings(response.data);
  let upserted = 0;
  for (const listing of listings) {
    const normalized = normalizeMyJobMagListing(listing);
    if (!normalized) continue;
    const { sourceKey, ...fields } = normalized;
    const existingQuery = {
      source: 'aggregated',
      $or: [
        { sourceKey },
        { sourceUrl: fields.sourceUrl },
        { applicationLink: fields.applicationLink, sourceName: 'MyJobMag' },
      ],
    };
    try {
      const result = await Job.updateOne(
        existingQuery,
        { $set: { ...fields, sourceKey, lastSeenAt: new Date() } },
        { upsert: true, runValidators: true },
      );
      if (result.upsertedCount || result.modifiedCount) upserted += 1;
    } catch (error) {
      if (error.code !== 11000) throw error;
      const retry = await Job.updateOne(
        { sourceKey, source: 'aggregated' },
        { $set: { ...fields, lastSeenAt: new Date() } },
        { runValidators: true },
      );
      if (retry.modifiedCount) upserted += 1;
    }
  }

  console.info(`MyJobMag ingestion: ${listings.length} listings parsed, ${upserted} inserted or updated.`);
  return { fetched: listings.length, upserted };
};

export const scheduleMyJobMagScrapes = () => {
  let isRunning = false;
  const run = async () => {
    if (isRunning) {
      console.info('MyJobMag scrape skipped because the previous run is still in progress.');
      return;
    }
    isRunning = true;
    try {
      await ingestMyJobMagListings();
    } catch (error) {
      console.error('MyJobMag ingestion failed:', error.message);
    } finally {
      isRunning = false;
    }
  };

  void run();
  setInterval(() => void run(), DAILY_INTERVAL_MS).unref();
  console.info('MyJobMag scraper scheduled to run daily.');
};

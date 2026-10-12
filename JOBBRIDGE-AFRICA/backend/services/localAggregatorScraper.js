import axios from 'axios';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import Job from '../models/Job.js';

export const MYJOBMAG_TARGETS = [
  {
    category: 'outsourcing',
    url: 'https://www.myjobmag.com/jobs-by-title/outsourcing',
  },
  {
    category: 'consulting-specialized-services',
    url: 'https://www.myjobmag.com/jobs-by-industry/consulting-specialized-services',
  },
];
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

const companyFromText = (value) => {
  const match = value.match(/\bat\s+(.+?)(?=\s+(?:in|located|posted|$)|$)/i);
  return match?.[1]?.trim().replace(/[.,;|]+$/, '') || '';
};

export const parseMyJobMagListings = (html, baseUrl = MYJOBMAG_TARGETS[0].url) => {
  const $ = load(html);
  const listings = [];
  const seenUrls = new Set();

  $('.job-info, li.job-list-li').each((_, container) => {
    const card = $(container);
    const anchor = card.find('h2 a, .job-info h2 a').first();
    if (!anchor.length) return;
    const url = detailUrl(anchor.attr('href'), baseUrl);
    if (!url || !/(?:^|\/)jobs?\/[^/]+/i.test(new URL(url).pathname) || seenUrls.has(url)) return;

    const title = textOf(anchor);
    const companyText = firstText(card, [
      '.job-info .company-name',
      '.company-name',
      '.job-info .company',
      '.company',
    ]);
    const companyName = companyText.replace(/^at\s+/i, '') || companyFromText(textOf(card));
    const location = firstText(card, [
      '.job-info .job-location',
      '.job-location',
      '.job-details span',
    ]);
    const description = firstText(card, [
      '.job-desc',
      '.job-info p',
    ]);
    if (!title || !companyName || !description) return;
    seenUrls.add(url);
    listings.push({
      title,
      companyName,
      location: location || 'Nigeria',
      description,
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
  const listingUrl = detailUrl(listing.detailUrl || listing.sourceUrl || '', MYJOBMAG_TARGETS[0].url);
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
  const listingsByCategory = [];
  for (const target of MYJOBMAG_TARGETS) {
    try {
      const response = await axios.get(target.url, {
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
      const listings = parseMyJobMagListings(response.data, target.url);
      console.info(`MyJobMag ${target.category}: parsed ${listings.length} listings.`);
      listingsByCategory.push(...listings);
    } catch (error) {
      console.error(`MyJobMag ${target.category} fetch failed:`, error.message);
    }
  }

  const listings = [...new Map(listingsByCategory.map((listing) => [
    listing.detailUrl,
    listing,
  ])).values()];
  let upserted = 0;
  for (const listing of listings) {
    const normalized = normalizeMyJobMagListing(listing);
    if (!normalized) continue;
    const { sourceKey, ...fields } = normalized;
    try {
      const existing = await Job.findOne({ sourceUrl: fields.sourceUrl }).select('_id sourceKey');
      const update = {
        ...fields,
        lastSeenAt: new Date(),
        ...(existing?.sourceKey ? {} : { sourceKey }),
      };
      const result = existing
        ? await Job.updateOne(
          { _id: existing._id },
          { $set: update },
          { runValidators: true },
        )
        : await Job.updateOne(
          { sourceKey },
          { $set: { ...update, sourceKey } },
          { upsert: true, runValidators: true },
        );
      if (result.upsertedCount || result.modifiedCount) upserted += 1;
    } catch (error) {
      if (error.code !== 11000) throw error;
      const duplicate = await Job.findOne({ sourceUrl: fields.sourceUrl }).select('_id');
      if (!duplicate) throw error;
      const retry = await Job.updateOne(
        { _id: duplicate._id },
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

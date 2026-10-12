import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import mongoose from 'mongoose';
import { load } from 'cheerio';
import Job from '../models/Job.js';
import User from '../models/userModel.js';

const MAX_FEED_BYTES = 2 * 1024 * 1024;
const MAX_JOB_PAGES = 30;
const MAX_CHILD_SITEMAPS = 5;
const REQUEST_TIMEOUT_MS = 20000;
const CAREER_PATH = /\/(?:careers?|jobs?(?:-postings?)?|openings?|positions?|vacancies?|job-openings?|career-opportunities?)(?:\/|$)/i;
const DEFAULT_SCRAPE_INTERVAL_MS = 6 * 60 * 60 * 1000;

export const isCareerJobUrl = (value) => {
  try {
    const pathname = new URL(value).pathname;
    const match = pathname.match(CAREER_PATH);
    return Boolean(match && pathname.slice(match.index + match[0].length).replace(/\//g, ''));
  } catch {
    return false;
  }
};

const safeHost = (hostname) => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost')
    || host.endsWith('.local') || host.endsWith('.internal')) return false;
  if (isIP(host)) return false;
  return true;
};

const validateFeedUrl = (value, expectedHostname) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Career feed URL is invalid.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || !safeHost(url.hostname)) {
    throw new Error('Career feed URLs must use HTTPS and a public DNS hostname.');
  }
  if (expectedHostname && url.hostname.toLowerCase() !== expectedHostname.toLowerCase()) {
    throw new Error('Career sitemap links must stay on the configured company hostname.');
  }
  return url;
};

const fetchText = async (url, expectedHostname) => {
  let parsedUrl = validateFeedUrl(url, expectedHostname);
  let response;
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    response = await fetch(parsedUrl, {
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8',
        'User-Agent': 'JobBridgeAfrica-CareerFeed/1.0 (+https://www.jobbridgeafrica.org)',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const redirectLocation = response.headers.get('location');
    await response.body?.cancel();
    if (!redirectLocation || redirectCount === 3) {
      throw new Error(`Request to ${parsedUrl.hostname} returned an invalid or excessive redirect.`);
    }
    parsedUrl = validateFeedUrl(new URL(redirectLocation, parsedUrl).href, expectedHostname);
  }
  if (!response.ok) {
    throw new Error(`Request to ${parsedUrl.hostname} failed with HTTP ${response.status}.`);
  }
  if (!response.body) throw new Error(`Response from ${parsedUrl.hostname} did not contain a body.`);

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_FEED_BYTES) {
        await reader.cancel();
        throw new Error(`Response from ${parsedUrl.hostname} exceeded the ${MAX_FEED_BYTES} byte limit.`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder().decode(body), url: parsedUrl };
};

const htmlToText = (value) => {
  const $ = load(value || '');
  $('script, style').remove();
  return $.text().replace(/\s+/g, ' ').trim();
};

const asText = (value) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(', ');
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
      ].filter((part) => part !== undefined && part !== null && part !== '')
        .map(asText)
        .join(' ');
    }
    if (value.name || value.value || value.address || value.streetAddress || value.addressLocality) {
      return [
        value.name,
        value.value,
        value.address,
        value.streetAddress,
        value.addressLocality,
        value.addressRegion,
        value.addressCountry,
      ].map(asText).filter(Boolean).join(', ');
    }
  }
  return '';
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeJobType = (value, workplaceType) => {
  if (workplaceType === 'remote') return 'Remote';
  const normalized = asText(value).toLowerCase();
  if (normalized.includes('part')) return 'Part-Time';
  if (normalized.includes('contract') || normalized.includes('temporary') || normalized.includes('freelance')) return 'Contract';
  if (normalized.includes('intern')) return 'Internship';
  return 'Full-Time';
};

const getWorkplaceType = (job, location) => {
  const value = `${asText(job.jobLocationType)} ${asText(job.workplaceType)} ${asText(location)}`.toLowerCase();
  if (/\bhybrid\b/.test(value)) return 'hybrid';
  if (/\b(remote|telecommute|work from home|anywhere|distributed)\b/.test(value)) return 'remote';
  return 'on-site';
};

const isJobPosting = (value) => {
  if (!value || typeof value !== 'object') return false;
  const type = value['@type'];
  return (Array.isArray(type) ? type : [type]).includes('JobPosting');
};

const findJobPosting = (value) => {
  if (Array.isArray(value)) return value.map(findJobPosting).find(Boolean);
  if (!value || typeof value !== 'object') return null;
  if (isJobPosting(value)) return value;
  if (Array.isArray(value['@graph'])) return findJobPosting(value['@graph']);
  return null;
};

export const extractCareerPageJob = (html, url) => {
  const $ = load(html);
  let structuredJob = null;
  $('script[type="application/ld+json"]').each((_, script) => {
    if (structuredJob) return;
    try {
      structuredJob = findJobPosting(JSON.parse($(script).text()));
    } catch (error) {
      console.warn(`Ignoring malformed JobPosting JSON-LD at ${url.href}:`, error.message);
    }
  });

  const title = asText(structuredJob?.title)
    || $('meta[property="og:title"]').attr('content')
    || $('h1').first().text()
    || $('title').text();
  const description = htmlToText(structuredJob?.description)
    || $('meta[name="description"]').attr('content')
    || $('[class*="description"], [id*="description"]').first().text();
  const location = asText(structuredJob?.jobLocation)
    || $('meta[property="job:location"], [class*="location"], [data-testid*="location"]').first().text()
    || 'Not specified';
  const organizationName = asText(structuredJob?.hiringOrganization?.name);
  const department = asText(
    structuredJob?.industry || structuredJob?.occupationalCategory || structuredJob?.department,
  );
  const salary = asText(structuredJob?.baseSalary);
  const postedAt = parseDate(structuredJob?.datePosted)
    || parseDate($('meta[property="article:published_time"]').attr('content'));
  const expiryDate = parseDate(structuredJob?.validThrough);
  const employmentType = asText(structuredJob?.employmentType);

  return {
    title: htmlToText(title),
    description,
    location: htmlToText(location),
    organizationName,
    department,
    salary,
    postedAt,
    expiryDate,
    employmentType,
    applicationLink: url.href,
    workplaceType: getWorkplaceType(structuredJob || {}, location),
  };
};

export const parseCareerRssEntries = (xml) => {
  const $ = load(xml, { xmlMode: true });
  return $('item, entry').toArray().map((node) => {
    const item = $(node);
    const linkNode = item.find('link').first();
    const link = linkNode.attr('href') || linkNode.text().trim() || item.find('guid').first().text().trim();
    const description = item.find('description, summary, content, content\\:encoded').first().text()
      || item.find('encoded').first().text();
    const categories = item.find('category').toArray().map((category) => $(category).text().trim()).filter(Boolean);
    return {
      title: htmlToText(item.find('title').first().text()),
      description: htmlToText(description),
      location: item.find('location, job\\:location').first().text().trim() || 'Not specified',
      department: item.find('department, category').first().text().trim() || categories.join(', '),
      salary: item.find('salary, job\\:salary').first().text().trim(),
      postedAt: parseDate(item.find('pubDate, published, updated').first().text()),
      expiryDate: parseDate(item.find('validThrough, deadline').first().text()),
      employmentType: item.find('employmentType, job\\:type').first().text().trim(),
      applicationLink: link,
      workplaceType: getWorkplaceType({}, item.find('location, job\\:location').first().text()),
    };
  });
};

const readSitemap = async (sitemapUrl, hostname, depth = 0, visited = new Set()) => {
  const parsedUrl = validateFeedUrl(sitemapUrl, hostname);
  if (visited.has(parsedUrl.href)) return [];
  visited.add(parsedUrl.href);

  const { text } = await fetchText(parsedUrl.href, hostname);
  const $ = load(text, { xmlMode: true });
  if ($('urlset, sitemapindex').length === 0) {
    throw new Error(`Response from ${hostname} is not an XML sitemap.`);
  }
  const childSitemaps = $('sitemapindex > sitemap > loc').toArray()
    .map((node) => $(node).text().trim())
    .filter(Boolean);
  if (childSitemaps.length && depth < 2) {
    if (childSitemaps.length > MAX_CHILD_SITEMAPS) {
      console.warn(`Limiting ${hostname} sitemap index to ${MAX_CHILD_SITEMAPS} child sitemaps.`);
    }
    const childUrls = childSitemaps.slice(0, MAX_CHILD_SITEMAPS);
    const nested = await Promise.all(childUrls.map((childUrl) =>
      readSitemap(childUrl, hostname, depth + 1, visited),
    ));
    return nested.flat().slice(0, MAX_JOB_PAGES);
  }

  return $('urlset > url > loc').toArray()
    .map((node) => $(node).text().trim())
    .filter((value) => {
      try {
        const jobUrl = validateFeedUrl(value, hostname);
        return isCareerJobUrl(jobUrl.href);
      } catch (error) {
        console.warn('Skipping invalid or out-of-host sitemap URL:', error.message);
        return false;
      }
    })
    .slice(0, MAX_JOB_PAGES);
};

const upsertCareerJob = async (rawJob, feed, feedUrl, employer) => {
  const title = htmlToText(rawJob.title).slice(0, 300);
  const description = htmlToText(rawJob.description).slice(0, 100000);
  if (!title || !description) {
    console.info(`Skipping career URL without a usable title and description: ${feedUrl}`);
    return false;
  }

  const applicationUrl = new URL(rawJob.applicationLink || feedUrl);
  applicationUrl.hash = '';
  const applicationLink = applicationUrl.href;
  const location = htmlToText(rawJob.location) || 'Not specified';
  const workplaceType = ['remote', 'hybrid', 'on-site'].includes(rawJob.workplaceType)
    ? rawJob.workplaceType
    : getWorkplaceType(rawJob, location);
  const companyName = feed.companyName;
  const companySlug = String(feed.companySlug || companyName)
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const sourceKey = createHash('sha256')
    .update(`career-scraper:${applicationUrl.hostname.toLowerCase()}${applicationUrl.pathname}${applicationUrl.search}`)
    .digest('hex');
  const postedAt = parseDate(rawJob.postedAt);
  const explicitExpiry = parseDate(rawJob.expiryDate);
  const expiryDate = explicitExpiry
    || (postedAt && new Date(postedAt.getTime() + 90 * 24 * 60 * 60 * 1000))
    || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  if (expiryDate <= new Date()) {
    await Job.updateOne(
      { sourceKey, source: 'aggregated', sourceProvider: 'career-scraper' },
      { $set: { expiryDate } },
    );
    console.info(`Skipping expired career listing: ${applicationLink}`);
    return false;
  }
  const fields = {
    title,
    description,
    excerpt: description.slice(0, 400),
    companyName,
    companySlug,
    company: employer?._id || null,
    department: htmlToText(rawJob.department).slice(0, 200),
    location: location.slice(0, 500),
    workplaceType,
    isRemote: workplaceType === 'remote',
    isWorldwideRemote: workplaceType === 'remote' && /\b(worldwide|global(?:ly)?|anywhere|africa)\b/i.test(location),
    jobType: normalizeJobType(rawJob.employmentType, workplaceType),
    salary: asText(rawJob.salary).slice(0, 500),
    salaryRange: asText(rawJob.salary) || 'Competitive',
    ...(explicitExpiry || postedAt ? { expiryDate } : {}),
    ...(postedAt ? { pubDate: postedAt } : {}),
    applicationLink,
    source: 'aggregated',
    sourceProvider: 'career-scraper',
    isDirectPosting: false,
    isApproved: true,
    ...(rawJob.department ? { categories: [htmlToText(rawJob.department).slice(0, 200)] } : {}),
  };
  await Job.updateOne(
    { sourceKey, source: 'aggregated', sourceProvider: 'career-scraper' },
    {
      $set: fields,
      $setOnInsert: {
        sourceKey,
        ...(!explicitExpiry && !postedAt ? { expiryDate } : {}),
      },
    },
    { upsert: true, runValidators: true },
  );
  return true;
};

const validateFeedConfig = (feed) => {
  if (!feed || typeof feed.companyName !== 'string' || !feed.companyName.trim()) {
    throw new Error('Each career feed must have a companyName.');
  }
  if (typeof feed.url !== 'string' || !feed.url.trim()) {
    throw new Error(`Career feed for ${feed.companyName} must have a URL.`);
  }
  const url = validateFeedUrl(feed.url);
  if (feed.employerId && !mongoose.isValidObjectId(feed.employerId)) {
    throw new Error(`Career feed for ${feed.companyName} has an invalid employerId.`);
  }
  if (feed.type && !['auto', 'rss', 'sitemap'].includes(feed.type)) {
    throw new Error(`Career feed for ${feed.companyName} type must be auto, rss, or sitemap.`);
  }
  return { ...feed, companyName: feed.companyName.trim(), url: url.href, hostname: url.hostname };
};

export const scrapeCareerFeed = async (feedInput) => {
  const feed = validateFeedConfig(feedInput);
  const employer = feed.employerId
    ? await User.findOne({ _id: feed.employerId, role: 'employer' }).select('_id')
    : null;
  if (feed.employerId && !employer) {
    throw new Error(`Career feed employer account not found for ${feed.companyName}.`);
  }

  console.info(`Starting ${feed.type || 'auto'} career feed scrape for ${feed.companyName}.`);
  const { text, url } = await fetchText(feed.url, feed.hostname);
  const xml = load(text, { xmlMode: true });
  const isRssOrAtom = xml('rss, feed, rdf\\:RDF').length > 0 || xml('item, entry').length > 0;
  let candidates = [];
  if (feed.type !== 'sitemap' && (feed.type === 'rss'
    || isRssOrAtom)) {
    const entries = parseCareerRssEntries(text);
    if (entries.length > MAX_JOB_PAGES) {
      console.info(`Limiting ${feed.companyName} RSS feed to the first ${MAX_JOB_PAGES} entries.`);
    }
    candidates = entries.slice(0, MAX_JOB_PAGES).filter((item) => {
      if (!item.applicationLink) return false;
      try {
        return ['http:', 'https:'].includes(new URL(item.applicationLink, url).protocol);
      } catch {
        return false;
      }
    }).map((item) => ({
      ...item,
      applicationLink: new URL(item.applicationLink, url).href,
    }));
  } else {
    const jobUrls = await readSitemap(url.href, feed.hostname);
    for (let offset = 0; offset < jobUrls.length; offset += 3) {
      const pageBatch = jobUrls.slice(offset, offset + 3);
      candidates.push(...await Promise.all(pageBatch.map(async (jobUrl) => {
        const { text: html, url: parsedJobUrl } = await fetchText(jobUrl, feed.hostname);
        return extractCareerPageJob(html, parsedJobUrl);
      })));
    }
  }

  let upserted = 0;
  for (const candidate of candidates) {
    if (await upsertCareerJob(candidate, feed, candidate.applicationLink, employer)) upserted += 1;
  }
  console.info(`Career feed scrape complete for ${feed.companyName}: ${candidates.length} candidates, ${upserted} upserted.`);
  return { companyName: feed.companyName, candidates: candidates.length, upserted };
};

const readConfiguredFeeds = () => {
  if (!process.env.CAREER_FEEDS) return [];
  const feeds = JSON.parse(process.env.CAREER_FEEDS);
  if (!Array.isArray(feeds)) throw new Error('CAREER_FEEDS must be a JSON array.');
  return feeds;
};

export const runConfiguredCareerScrapes = async () => {
  let feeds;
  try {
    feeds = readConfiguredFeeds();
  } catch (error) {
    console.error('Career feed configuration error:', error.message);
    return [];
  }
  if (!feeds.length) return [];

  const results = [];
  for (const feed of feeds) {
    try {
      results.push(await scrapeCareerFeed(feed));
    } catch (error) {
      console.error(`Career feed scrape failed for ${feed?.companyName || 'unknown company'}:`, error.message);
    }
  }
  return results;
};

export const scheduleCareerScrapes = () => {
  if (!process.env.CAREER_FEEDS) {
    console.info('Career scraping is disabled; set CAREER_FEEDS to configure target company feeds.');
    return;
  }

  const configuredInterval = Number(process.env.CAREER_SCRAPE_INTERVAL_MS);
  const interval = Number.isFinite(configuredInterval)
    && configuredInterval >= 60_000
    && configuredInterval <= 30 * 24 * 60 * 60 * 1000
    ? configuredInterval
    : DEFAULT_SCRAPE_INTERVAL_MS;
  if (process.env.CAREER_SCRAPE_INTERVAL_MS && interval !== configuredInterval) {
    console.warn('Invalid CAREER_SCRAPE_INTERVAL_MS; using the 6-hour default.');
  }
  let isRunning = false;
  const run = async () => {
    if (isRunning) {
      console.info('Career feed scrape skipped because the previous run is still in progress.');
      return;
    }
    isRunning = true;
    try {
      await runConfiguredCareerScrapes();
    } catch (error) {
      console.error('Career feed scrape run failed:', error.message);
    } finally {
      isRunning = false;
    }
  };

  void run();
  setInterval(() => void run(), interval).unref();
  console.info(`Targeted career feed scraping scheduled every ${Math.round(interval / 60000)} minutes.`);
};

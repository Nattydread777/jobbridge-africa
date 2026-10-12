import axios from 'axios';
import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import https from 'node:https';
import { load } from 'cheerio';
import Job from '../models/Job.js';

const USER_AGENT = 'JobBridgeAfrica-JobPostingCrawler/1.0 (+https://www.jobbridgeafrica.org)';
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_DISCOVERY_PAGES = 60;
const MAX_POSTINGS_PER_DOMAIN = 500;
const MAX_SITEMAPS = 5;
const MAX_REDIRECTS = 3;
const DEFAULT_SCRAPE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const CAREER_PATH = /\/(?:careers?|jobs?(?:-postings?)?|openings?|positions?|vacancies?|job-openings?|career-opportunities?)(?:\/|$)/i;
const TRUSTED_ATS_DOMAINS = ['greenhouse.io', 'lever.co', 'myworkdayjobs.com'];

const privateIpv4 = (address) => {
  const octets = address.split('.').map(Number);
  const [first, second] = octets;
  return first === 0 || first === 10 || first === 127 || first >= 224
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 192 && second === 0)
    || (first === 198 && (second === 18 || second === 19));
};

const isPublicAddress = (address) => {
  const family = isIP(address);
  if (family === 4) return !privateIpv4(address);
  if (family !== 6) return false;
  const normalized = address.toLowerCase();
  if (normalized.startsWith('::ffff:')) {
    const mappedIpv4 = normalized.slice('::ffff:'.length);
    return isIP(mappedIpv4) === 4 && !privateIpv4(mappedIpv4);
  }
  return normalized !== '::'
    && normalized !== '::1'
    && !normalized.startsWith('fc')
    && !normalized.startsWith('fd')
    && !normalized.startsWith('fe8')
    && !normalized.startsWith('fe9')
    && !normalized.startsWith('fea')
    && !normalized.startsWith('feb')
    && !normalized.startsWith('ff');
};

const validateRootUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Career crawler target must be a non-empty domain or URL string.');
  }
  let url;
  try {
    url = new URL(value.includes('://') ? value : `https://${value}`);
  } catch {
    throw new Error('Career crawler target must be a valid domain or URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname
    || url.hostname === 'localhost' || url.hostname.endsWith('.localhost')
    || url.hostname.endsWith('.local') || url.hostname.endsWith('.internal')
    || isIP(url.hostname)) {
    throw new Error('Career crawler targets must use HTTPS and a public DNS hostname.');
  }
  return url;
};

const belongsToTargetDomain = (hostname, targetHostname) => {
  const baseDomain = targetHostname.replace(/^www\./i, '').toLowerCase();
  const candidate = hostname.toLowerCase();
  return candidate === baseDomain || candidate.endsWith(`.${baseDomain}`);
};

export const isAllowedCrawlerHost = (hostname, targetHostname) =>
  belongsToTargetDomain(hostname, targetHostname)
  || TRUSTED_ATS_DOMAINS.some((domain) => {
    const candidate = hostname.toLowerCase();
    return candidate === domain || candidate.endsWith(`.${domain}`);
  });

const isTrustedAtsHost = (hostname) => TRUSTED_ATS_DOMAINS.some((domain) => {
  const candidate = hostname.toLowerCase();
  return candidate === domain || candidate.endsWith(`.${domain}`);
});

export const getCareerPageFallbackUrls = (target) => {
  const rootUrl = target instanceof URL ? target : validateRootUrl(target);
  return [...new Set([
    rootUrl.href,
    new URL('/careers/', rootUrl).href,
    new URL('/jobs/', rootUrl).href,
  ].filter(isCareerJobUrl))];
};

const validatePublicAddresses = async (hostname) => {
  let dnsTimeout;
  const addresses = await Promise.race([
    lookup(hostname, { all: true, verbatim: true }),
    new Promise((_, reject) => {
      dnsTimeout = setTimeout(() => reject(new Error(`DNS lookup timed out for ${hostname}.`)), REQUEST_TIMEOUT_MS);
      dnsTimeout.unref();
    }),
  ]).finally(() => clearTimeout(dnsTimeout));
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error(`Refusing to crawl ${hostname}: DNS resolved to a non-public address.`);
  }
  return addresses;
};

const createPinnedHttpsAgent = (hostname, addresses) => new https.Agent({
  keepAlive: false,
  lookup: (requestedHostname, options, callback) => {
    if (requestedHostname.toLowerCase() !== hostname.toLowerCase()) {
      callback(new Error('Unexpected hostname during career crawler request.'));
      return;
    }
    const matchingAddresses = options?.family
      ? addresses.filter(({ family }) => family === options.family)
      : addresses;
    if (!matchingAddresses.length) {
      callback(new Error(`No validated DNS address is available for ${hostname}.`));
      return;
    }
    if (options?.all) {
      callback(null, matchingAddresses);
      return;
    }
    callback(null, matchingAddresses[0].address, matchingAddresses[0].family);
  },
});

const requestPublicHtml = async (urlValue, expectedDomain) => {
  let url = validateRootUrl(urlValue);
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const addresses = await validatePublicAddresses(url.hostname);
    const httpsAgent = createPinnedHttpsAgent(url.hostname, addresses);
    let response;
    try {
      response = await axios.get(url.href, {
        headers: {
          Accept: 'text/html, application/xhtml+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
          'User-Agent': USER_AGENT,
        },
        timeout: REQUEST_TIMEOUT_MS,
        maxContentLength: MAX_RESPONSE_BYTES,
        maxBodyLength: MAX_RESPONSE_BYTES,
        responseType: 'text',
        responseEncoding: 'utf8',
        validateStatus: () => true,
        maxRedirects: 0,
        proxy: false,
        httpsAgent,
      });
    } finally {
      httpsAgent.destroy();
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirectCount === MAX_REDIRECTS || !response.headers.location) {
        throw new Error(`Career crawler encountered an invalid or excessive redirect at ${url.hostname}.`);
      }
      url = validateRootUrl(new URL(response.headers.location, url).href);
      if (expectedDomain && !isAllowedCrawlerHost(url.hostname, expectedDomain)) {
        throw new Error(`Career crawler refused a redirect outside ${expectedDomain} and trusted ATS domains.`);
      }
      continue;
    }
    if (response.status === 403) {
      throw new Error(
        `Career crawler received HTTP 403 from ${url.hostname}; the site denied automated access.`,
      );
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Career crawler request to ${url.hostname} failed with HTTP ${response.status}.`);
    }
    if (typeof response.data !== 'string') {
      throw new Error(`Career crawler received an unexpected response from ${url.hostname}.`);
    }
    return { html: response.data, url };
  }
  throw new Error('Career crawler exceeded the redirect limit.');
};

const htmlToText = (value) => {
  const $ = load(value || '');
  $('script, style, noscript').remove();
  return $.text().replace(/\s+/g, ' ').trim();
};

const asText = (value) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(', ');
  if (!value || typeof value !== 'object') return '';
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
  if (value.name || value.value || value.address || value.streetAddress
    || value.addressLocality || value.addressCountry) {
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
  return '';
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeJobType = (value, workplaceType) => {
  if (workplaceType === 'remote') return 'Remote';
  const normalized = asText(value).toLowerCase().replace(/[-_]/g, ' ');
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
  return (Array.isArray(type) ? type : [type]).some((entry) =>
    typeof entry === 'string' && entry.split(/[\/#]/).pop().toLowerCase() === 'jobposting',
  );
};

const collectJobPostings = (value, results = []) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectJobPostings(item, results));
    return results;
  }
  if (!value || typeof value !== 'object') return results;
  if (isJobPosting(value)) results.push(value);
  if (value['@graph']) collectJobPostings(value['@graph'], results);
  if (value['@type'] === 'ItemList' && Array.isArray(value.itemListElement)) {
    value.itemListElement.forEach((item) =>
      collectJobPostings(item.item || item, results),
    );
  }
  return results;
};

const getJobLocation = (job) => {
  const locations = [
    job.jobLocation,
    job.jobLocationType === 'TELECOMMUTE' ? 'Remote' : '',
    job.applicantLocationRequirements,
  ].filter(Boolean);
  return locations.map(asText).filter(Boolean).join(' · ') || 'Not specified';
};

const getApplicationUrl = (job, pageUrl) => {
  const rawUrl = asText(job.url)
    || asText(job.applicationUrl)
    || asText(job.mainEntityOfPage)
    || pageUrl.href;
  try {
    const url = new URL(rawUrl, pageUrl);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : pageUrl.href;
  } catch {
    return pageUrl.href;
  }
};

export const isCareerJobUrl = (value) => {
  try {
    const pathname = new URL(value).pathname;
    return CAREER_PATH.test(pathname);
  } catch {
    return false;
  }
};

export const extractSchemaJobPostings = (html, pageUrl) => {
  const $ = load(html);
  const postings = [];
  $('script[type="application/ld+json"]').each((_, script) => {
    try {
      const parsed = JSON.parse($(script).text());
      collectJobPostings(parsed, postings);
    } catch (error) {
      console.warn(`Ignoring malformed JobPosting JSON-LD at ${pageUrl}:`, error.message);
    }
  });
  const page = pageUrl instanceof URL ? pageUrl : new URL(pageUrl);
  return postings.map((job) => {
    const location = getJobLocation(job);
    const workplaceType = getWorkplaceType(job, location);
    return {
      title: htmlToText(asText(job.title)),
      description: htmlToText(asText(job.description)),
      employmentType: asText(job.employmentType),
      salary: asText(job.baseSalary),
      location,
      workplaceType,
      validThrough: parseDate(job.validThrough),
      datePosted: parseDate(job.datePosted),
      applicationUrl: getApplicationUrl(job, page),
      employerName: asText(job.hiringOrganization?.name),
      department: asText(job.industry || job.occupationalCategory || job.department),
    };
  }).filter((job) => job.title && job.description);
};

const discoverCareerLinks = (html, pageUrl, allowedHost) => {
  const $ = load(html);
  return $('a[href]').toArray().flatMap((anchor) => {
    try {
      const url = new URL($(anchor).attr('href'), pageUrl);
      if (!isAllowedCrawlerHost(url.hostname, allowedHost)
        || url.protocol !== 'https:' || !isCareerJobUrl(url.href)) return [];
      url.hash = '';
      return [url.href];
    } catch {
      return [];
    }
  });
};

const parseSitemapLocations = (xml) => {
  const $ = load(xml, { xmlMode: true });
  const sitemapUrls = $('sitemapindex > sitemap > loc').toArray()
    .map((node) => $(node).text().trim())
    .filter(Boolean);
  const pageUrls = $('urlset > url > loc').toArray()
    .map((node) => $(node).text().trim())
    .filter(Boolean);
  return { sitemapUrls, pageUrls };
};

const discoverSitemapUrls = async (rootUrl) => {
  const isTargetHost = (hostname) => isAllowedCrawlerHost(hostname, rootUrl.hostname);
  const discovered = new Set();
  const robotsUrl = new URL('/robots.txt', rootUrl);
  try {
    const { html } = await requestPublicHtml(robotsUrl.href, rootUrl.hostname);
    for (const line of html.split(/\r?\n/)) {
      const match = line.match(/^\s*sitemap:\s*(\S+)/i);
      if (match) {
        try {
          const sitemapUrl = new URL(match[1], rootUrl);
          if (isTargetHost(sitemapUrl.hostname) && sitemapUrl.protocol === 'https:') {
            discovered.add(sitemapUrl.href);
          }
        } catch (error) {
          console.warn(`Ignoring invalid sitemap directive for ${rootUrl.hostname}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.info(`No readable robots.txt sitemap directives for ${rootUrl.hostname}: ${error.message}`);
  }

  for (const path of ['/sitemap.xml', '/sitemap_index.xml']) {
    if (discovered.size >= MAX_SITEMAPS) break;
    discovered.add(new URL(path, rootUrl).href);
  }
  return [...discovered].slice(0, MAX_SITEMAPS);
};

const discoverDomainPages = async (rootUrl, rootHtml, rootHtmlUrl = rootUrl) => {
  const isTargetHost = (hostname) => isAllowedCrawlerHost(hostname, rootUrl.hostname);
  const pages = new Set([rootUrl.href]);
  if (isAllowedCrawlerHost(rootHtmlUrl.hostname, rootUrl.hostname)) {
    pages.add(rootHtmlUrl.href);
  }
  const discoveredLinks = discoverCareerLinks(rootHtml, rootHtmlUrl, rootUrl.hostname);
  discoveredLinks.forEach((url) => pages.add(url));
  const sitemapUrls = await discoverSitemapUrls(rootUrl);
  let sitemapCount = 0;

  for (const sitemapUrl of sitemapUrls) {
    if (pages.size >= MAX_DISCOVERY_PAGES) break;
    try {
      const { html } = await requestPublicHtml(sitemapUrl, rootUrl.hostname);
      const { sitemapUrls: nestedSitemaps, pageUrls } = parseSitemapLocations(html);
      if (!pageUrls.length && !nestedSitemaps.length) {
        console.info(`Sitemap URL did not contain sitemap locations for ${rootUrl.hostname}; the target HTML page will still be parsed.`);
      }
      for (const pageUrl of pageUrls) {
        if (pages.size >= MAX_DISCOVERY_PAGES) break;
        try {
          const parsed = validateRootUrl(pageUrl);
          if (isTargetHost(parsed.hostname)
            && isCareerJobUrl(parsed.href)) {
            parsed.hash = '';
            pages.add(parsed.href);
          }
        } catch (error) {
          console.info(`Skipping sitemap URL for ${rootUrl.hostname}: ${error.message}`);
        }
      }
      if (sitemapCount < MAX_SITEMAPS) {
        for (const nestedSitemap of nestedSitemaps.slice(0, MAX_SITEMAPS - sitemapCount)) {
          sitemapCount += 1;
          if (pages.size >= MAX_DISCOVERY_PAGES) break;
          const parsedSitemap = validateRootUrl(nestedSitemap);
          if (!isTargetHost(parsedSitemap.hostname)) {
            console.info(`Skipping sitemap outside ${rootUrl.hostname}: ${parsedSitemap.hostname}`);
            continue;
          }
          const { html: nestedXml } = await requestPublicHtml(parsedSitemap.href, rootUrl.hostname);
          const nestedLocations = parseSitemapLocations(nestedXml).pageUrls;
          for (const pageUrl of nestedLocations) {
            if (pages.size >= MAX_DISCOVERY_PAGES) break;
            try {
              const parsed = validateRootUrl(pageUrl);
              if (isTargetHost(parsed.hostname)
                && isCareerJobUrl(parsed.href)) {
                parsed.hash = '';
                pages.add(parsed.href);
              }
            } catch (error) {
              console.info(`Skipping nested sitemap URL for ${rootUrl.hostname}: ${error.message}`);
            }
          }
        }
      }
    } catch (error) {
      console.info(`Sitemap discovery failed for ${rootUrl.hostname} (${sitemapUrl}): ${error.message}`);
      if (/HTTP 404\b/.test(error.message)) {
        const fallbackUrls = getCareerPageFallbackUrls(rootUrl);
        fallbackUrls.forEach((fallbackUrl) => pages.add(fallbackUrl));
        console.info(
          `Sitemap returned 404 for ${rootUrl.hostname}; falling back to direct career-page parsing (${fallbackUrls.length} URLs).`,
        );
      }
    }
  }
  return {
    pages: [...pages].slice(0, MAX_DISCOVERY_PAGES),
    capped: pages.size >= MAX_DISCOVERY_PAGES,
  };
};

const domainProvider = (hostname) => `career-crawler:${hostname.toLowerCase()}`;

export const normalizeSchemaJobPosting = (posting, rootUrlValue, crawledAt = new Date(), companyNameOverride = '') => {
  const rootUrl = rootUrlValue instanceof URL ? rootUrlValue : validateRootUrl(rootUrlValue);
  const location = posting.location || 'Not specified';
  const provider = domainProvider(rootUrl.hostname);
  const identity = [
    rootUrl.hostname.toLowerCase(),
    posting.title.trim().toLowerCase(),
    location.trim().toLowerCase(),
  ].join('\u0000');
  return {
    sourceKey: createHash('sha256').update(identity).digest('hex'),
    sourceProvider: provider,
    title: posting.title.slice(0, 300),
    description: posting.description.slice(0, 100000),
    excerpt: posting.description.slice(0, 400),
    companyName: posting.employerName || companyNameOverride || rootUrl.hostname,
    companySlug: rootUrl.hostname.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    department: posting.department.slice(0, 200),
    location: location.slice(0, 500),
    locationRestriction: location.slice(0, 500),
    workplaceType: posting.workplaceType,
    isRemote: posting.workplaceType === 'remote',
    isWorldwideRemote: posting.workplaceType === 'remote'
      && /\b(worldwide|global(?:ly)?|anywhere|africa)\b/i.test(location),
    jobType: normalizeJobType(posting.employmentType, posting.workplaceType),
    salary: posting.salary.slice(0, 500),
    salaryRange: posting.salary || 'Competitive',
    expiryDate: posting.validThrough || new Date(crawledAt.getTime() + 90 * 24 * 60 * 60 * 1000),
    ...(posting.datePosted ? { pubDate: posting.datePosted } : {}),
    applicationLink: posting.applicationUrl,
    source: 'aggregated',
    isDirectPosting: false,
    isApproved: true,
    isActive: !posting.validThrough || posting.validThrough > new Date(),
  };
};

const upsertPosting = async (posting, rootUrl, crawledAt, companyNameOverride) => {
  const normalized = normalizeSchemaJobPosting(posting, rootUrl, crawledAt, companyNameOverride);
  const { sourceKey, ...fields } = normalized;
  const result = await Job.updateOne(
    { sourceKey, source: 'aggregated', sourceProvider: fields.sourceProvider },
    {
      $set: { ...fields, lastSeenAt: crawledAt },
      $setOnInsert: { sourceKey },
    },
    { upsert: true, runValidators: true },
  );
  return result.upsertedCount > 0 || result.modifiedCount > 0;
};

const markMissingOrExpiredListings = async (rootUrl, crawledAt, seenKeys, discoveryComplete) => {
  const provider = domainProvider(rootUrl.hostname);
  const expired = await Job.updateMany(
    {
      sourceProvider: provider,
      source: 'aggregated',
      expiryDate: { $lte: crawledAt },
      isActive: { $ne: false },
    },
    { $set: { isActive: false } },
  );
  if (!discoveryComplete || !seenKeys.size) {
    return { expired: expired.modifiedCount, missing: 0 };
  }

  const missing = await Job.updateMany(
    {
      sourceProvider: provider,
      source: 'aggregated',
      sourceKey: { $nin: [...seenKeys] },
      isActive: { $ne: false },
    },
    {
      $set: {
        isActive: false,
        expiryDate: crawledAt,
      },
    },
  );
  return { expired: expired.modifiedCount, missing: missing.modifiedCount };
};

export const crawlCareerDomain = async (target) => {
  const rootUrl = validateRootUrl(typeof target === 'string' ? target : target?.url || target?.domain);
  const companyName = typeof target === 'object' && target?.companyName
    ? String(target.companyName).trim()
    : '';
  const crawledAt = new Date();
  console.info(`Starting autonomous Schema.org crawl for ${rootUrl.hostname}.`);

  const { html: rootHtml, url: resolvedRootUrl } = await requestPublicHtml(rootUrl.href, rootUrl.hostname);
  const discovery = await discoverDomainPages(rootUrl, rootHtml, resolvedRootUrl);
  const pages = discovery.pages;
  const pageCandidates = [];
  const queuedUrls = new Set(pages);
  let failedPages = 0;
  let capped = discovery.capped;

  for (let offset = 0; offset < pages.length && offset < MAX_DISCOVERY_PAGES; offset += 3) {
    const batch = pages.slice(offset, offset + 3);
    const results = await Promise.all(batch.map(async (pageUrl) => {
      try {
        if (pageUrl === rootUrl.href || pageUrl === resolvedRootUrl.href) {
          return { pageUrl, html: rootHtml, url: resolvedRootUrl };
        }
        return { pageUrl, ...(await requestPublicHtml(pageUrl, rootUrl.hostname)) };
      } catch (error) {
        failedPages += 1;
        console.error(`Career page crawl failed for ${rootUrl.hostname} (${pageUrl}):`, error.message);
        return null;
      }
    }));
    const successfulResults = results.filter(Boolean);
    pageCandidates.push(...successfulResults);
    for (const { html: discoveredHtml, url: discoveredUrl, pageUrl } of successfulResults) {
      for (const linkedUrl of discoverCareerLinks(
        discoveredHtml,
        discoveredUrl || new URL(pageUrl),
        rootUrl.hostname,
      )) {
        if (queuedUrls.has(linkedUrl)) continue;
        if (pages.length >= MAX_DISCOVERY_PAGES) {
          capped = true;
          break;
        }
        queuedUrls.add(linkedUrl);
        pages.push(linkedUrl);
      }
    }
  }

  const postings = [];
  for (const { html, url, pageUrl } of pageCandidates) {
    const page = url || new URL(pageUrl);
    const extracted = extractSchemaJobPostings(html, page);
    const remaining = MAX_POSTINGS_PER_DOMAIN - postings.length;
    postings.push(...extracted.slice(0, Math.max(0, remaining))
      .map((posting) => ({ ...posting, pageUrl: page.href })));
    if (extracted.length > remaining) capped = true;
    if (postings.length >= MAX_POSTINGS_PER_DOMAIN) {
      capped = true;
      break;
    }
  }
  const seenKeys = new Set();
  let upserted = 0;
  for (const posting of postings) {
    const normalized = normalizeSchemaJobPosting(posting, rootUrl, crawledAt, companyName);
    if (seenKeys.has(normalized.sourceKey)) continue;
    seenKeys.add(normalized.sourceKey);
    try {
      if (await upsertPosting(posting, rootUrl, crawledAt, companyName)) upserted += 1;
    } catch (error) {
      console.error(`Failed to upsert ${rootUrl.hostname} job "${posting.title}":`, error.message);
    }
  }

  const discoveryComplete = !capped && pages.length < MAX_DISCOVERY_PAGES && failedPages === 0;
  const cleanup = await markMissingOrExpiredListings(rootUrl, crawledAt, seenKeys, discoveryComplete);
  console.info(
    `Schema.org crawl complete for ${rootUrl.hostname}: ${pages.length} pages, ${postings.length} postings, ${upserted} inserts/updates, ${cleanup.expired} expired and ${cleanup.missing} missing listings deactivated.`,
  );
  return {
    domain: rootUrl.hostname,
    pages: pages.length,
    postings: postings.length,
    upserted,
    expired: cleanup.expired,
    missing: cleanup.missing,
    discoveryComplete,
  };
};

export const parseCrawlerTargets = (configuredTargets) => {
  if (!configuredTargets?.trim()) return [];
  let targets;
  if (configuredTargets.trim().startsWith('[')) {
    targets = JSON.parse(configuredTargets);
    if (!Array.isArray(targets)) throw new Error('CAREER_CRAWLER_DOMAINS must be a JSON array or comma-separated domains.');
  } else {
    targets = configuredTargets.split(',').map((domain) => domain.trim()).filter(Boolean);
  }
  const uniqueTargets = new Map();
  for (const target of targets) {
    const url = validateRootUrl(typeof target === 'string' ? target : target?.url || target?.domain);
    const companySlug = typeof target === 'object'
      ? String(target.companySlug || target.companyHandle || target.slug || target.handle || '').trim()
      : '';
    if (isTrustedAtsHost(url.hostname) && url.pathname === '/') {
      if (!companySlug) {
        throw new Error(
          `ATS crawler target ${url.hostname} must include a company slug, for example https://${url.hostname}/company-slug.`,
        );
      }
      url.pathname = `/${encodeURIComponent(companySlug)}`;
    }
    url.search = '';
    url.hash = '';
    const targetUrl = isTrustedAtsHost(url.hostname) ? url.href.replace(/\/$/, '') : url.origin;
    if (!uniqueTargets.has(targetUrl)) {
      uniqueTargets.set(targetUrl, {
        url: targetUrl,
        ...(typeof target === 'object' && target.companyName
          ? { companyName: String(target.companyName).trim() }
          : {}),
      });
    }
  }
  return [...uniqueTargets.values()];
};

export const runCareerCrawls = async (targets = process.env.CAREER_CRAWLER_DOMAINS || '') => {
  let domains;
  try {
    domains = parseCrawlerTargets(targets);
  } catch (error) {
    console.error('Career crawler target configuration error:', error.message);
    return [];
  }
  if (!domains.length) {
    console.info('Autonomous career crawling is disabled; set CAREER_CRAWLER_DOMAINS to target public company domains.');
    return [];
  }

  const results = [];
  for (const target of domains) {
    try {
      results.push(await crawlCareerDomain(target));
    } catch (error) {
      const domain = new URL(target.url).hostname;
      if (/HTTP 403\b/.test(error.message)) {
        console.warn(
          `Autonomous career crawl skipped ${domain}: access was denied (HTTP 403), likely by the site's crawler policy. Continuing with other targets.`,
        );
      } else {
        console.error(`Autonomous career crawl failed for ${domain}:`, error.message);
      }
      results.push({ domain, error: error.message });
    }
  }
  return results;
};

export const scheduleCareerScrapes = () => {
  if (!process.env.CAREER_CRAWLER_DOMAINS) {
    console.info('Autonomous career crawling is disabled; set CAREER_CRAWLER_DOMAINS to configure target domains.');
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
      console.info('Career crawl skipped because the previous run is still in progress.');
      return;
    }
    isRunning = true;
    try {
      await runCareerCrawls();
    } catch (error) {
      console.error('Career crawl run failed:', error.message);
    } finally {
      isRunning = false;
    }
  };

  void run();
  setInterval(() => void run(), interval).unref();
  console.info(`Autonomous Schema.org career crawler scheduled every ${Math.round(interval / 60000)} minutes.`);
};

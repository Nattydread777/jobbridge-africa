import express from 'express';
import asyncHandler from 'express-async-handler';
import Job from '../models/Job.js';
import { buildEligibleActiveJobFilter } from '../utils/jobFilters.js';

const router = express.Router();
const publicPaths = [
  '/',
  '/jobs',
  '/sdg-impact',
  '/ai-cv-tool',
  '/royal-merchant',
  '/employers',
  '/about',
  '/contact',
  '/pricing',
  '/privacy',
  '/terms',
  '/cookies',
  '/faq',
];
const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://jobbridgeafrica.com').replace(/\/+$/, '');
const jobSlug = (job) => String(job.title || 'job')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '') || 'job';
const escapeXml = (value) => String(value).replace(/[<>&'"]/g, (character) => ({
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;',
}[character]));

router.get('/sitemap.xml', asyncHandler(async (req, res) => {
  const jobs = await Job.find(buildEligibleActiveJobFilter()).select('_id title updatedAt').lean();
  const staticUrls = publicPaths.map((path) => `<url><loc>${escapeXml(`${siteUrl}${path}`)}</loc></url>`);
  const jobUrls = jobs.map((job) => {
    const loc = `${siteUrl}/jobs/${jobSlug(job)}-${job._id}`;
    const lastmod = job.updatedAt ? `<lastmod>${new Date(job.updatedAt).toISOString()}</lastmod>` : '';
    return `<url><loc>${escapeXml(loc)}</loc>${lastmod}</url>`;
  });
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...staticUrls, ...jobUrls].join('')}</urlset>`,
  );
}));

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /login\nDisallow: /register\nDisallow: /dashboard\nDisallow: /employer-dashboard\nDisallow: /profile\nDisallow: /profile-view\nDisallow: /my-jobs\nDisallow: /post-job\nDisallow: /admin/\nDisallow: /reset-password/\nDisallow: /verify-email/\nSitemap: ${siteUrl}/sitemap.xml\n`);
});

export default router;

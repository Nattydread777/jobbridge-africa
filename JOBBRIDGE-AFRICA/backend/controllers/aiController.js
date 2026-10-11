import asyncHandler from 'express-async-handler';
import Job from '../models/Job.js';

const CV_INPUT_LIMIT = 25000;
const STOP_WORDS = new Set([
  'about', 'after', 'also', 'and', 'are', 'for', 'from', 'have', 'into', 'job',
  'our', 'over', 'role', 'that', 'the', 'their', 'this', 'through', 'with', 'you',
  'your', 'will', 'work', 'years', 'year',
]);
const KEYWORD_DISPLAY_NAMES = {
  api: 'API',
  aws: 'AWS',
  css: 'CSS',
  html: 'HTML',
  javascript: 'JavaScript',
  nodejs: 'Node.js',
  'node.js': 'Node.js',
  react: 'React',
  sql: 'SQL',
  typescript: 'TypeScript',
  ui: 'UI',
  ux: 'UX',
};

const normalizeToken = (value) => value.toLowerCase().replace(/[^a-z0-9+#.]/g, '');
const displayKeyword = (keyword) =>
  KEYWORD_DISPLAY_NAMES[keyword] || `${keyword[0].toUpperCase()}${keyword.slice(1)}`;
const extractKeywords = (text) => [...new Set(
  text
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
)];
const refineBullet = (line) => line
  .replace(/^(responsible for|duties included|tasked with|in charge of)\s+/i, 'Managed ')
  .replace(/^(helped with|assisted in)\s+/i, 'Supported ')
  .replace(/^worked on\s+/i, 'Contributed to ');

export const optimizeCv = asyncHandler(async (req, res) => {
  const cvText = typeof req.body?.cvText === 'string' ? req.body.cvText.trim() : '';
  const jobDescription = typeof req.body?.jobDescription === 'string'
    ? req.body.jobDescription.trim()
    : '';

  if (!cvText || !jobDescription) {
    res.status(400);
    throw new Error('CV text and target job description are required');
  }
  if (cvText.length > CV_INPUT_LIMIT || jobDescription.length > CV_INPUT_LIMIT) {
    res.status(413);
    throw new Error(`CV text and job description must each be ${CV_INPUT_LIMIT} characters or fewer`);
  }

  const cvLower = cvText.toLowerCase();
  const keywords = extractKeywords(jobDescription);
  const matched = keywords.filter((keyword) => cvLower.includes(keyword));
  const missing = keywords.filter((keyword) => !cvLower.includes(keyword)).slice(0, 20);
  const sourceLines = cvText
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*•]\s*/, '').trim())
    .filter((line) => line.length >= 20);
  const enhancedBulletPoints = sourceLines
    .map((line) => ({
      line,
      score: matched.filter((keyword) => line.toLowerCase().includes(keyword)).length,
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map(({ line }) => refineBullet(line));
  const evidence = matched.slice(0, 8);
  const summary = evidence.length
    ? `CV evidence relevant to this role includes ${evidence.map(displayKeyword).join(', ')}. Use these verified skills and experience to lead your professional summary.`
    : 'No direct keyword matches were found. Review the skills gap below and only add relevant experience that you can verify.';

  res.status(200).json({
    summary,
    skillsGap: {
      matched: matched.map(displayKeyword),
      missing: missing.map(displayKeyword),
    },
    enhancedBulletPoints,
    note: 'This is a keyword-based drafting aid, not generative AI. Verify every suggestion and do not add skills or achievements that are not supported by your experience.',
  });
});

// Heuristic AI-like scoring using user profile vs jobs
// Weights can be tuned later or replaced with an ML model
const SCORE_WEIGHTS = {
  skills: 0.6,
  location: 0.2,
  recency: 0.15,
  jobType: 0.05,
};

// Extract skill-like tokens from text (very simple heuristic)
const extractTokens = (text) => {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#+.\-\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
};

export const getAiMatches = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401);
    throw new Error('Unauthorized');
  }

  // Only recommend for job seekers
  if (user.role !== 'job_seeker') {
    return res.status(200).json([]);
  }

  // Fetch active (non-expired) jobs
  const jobs = await Job.find({ expiryDate: { $gte: new Date() }, isApproved: true }).sort({ createdAt: -1 }).limit(200);

  // Prepare profile features
  const userSkills = Array.isArray(user.skills) ? user.skills.map(s => String(s).toLowerCase()) : [];
  const userCountry = (user.country || '').toLowerCase();

  const scored = jobs.map((job) => {
    let score = 0;

    // Skills score: overlap of user skills with job text (title + description + requirements)
    const jobText = `${job.title} ${job.description || ''} ${job.requirements || ''}`;
    const tokens = extractTokens(jobText);
    const tokenSet = new Set(tokens);
    const matches = userSkills.filter(s => tokenSet.has(s.toLowerCase()));
    const skillScore = userSkills.length > 0 ? matches.length / Math.max(userSkills.length, 1) : 0;

    // Location score: simple country substring match
    const locScore = userCountry && job.location ? (job.location.toLowerCase().includes(userCountry) ? 1 : 0) : 0;

    // Recency score: newer jobs score higher (0..1 over ~30 days)
    const daysOld = (Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, Math.min(1, 1 - daysOld / 30));

    // Job type preference: if user wrote a hint in bio, very light weight
    const bio = (user.bio || '').toLowerCase();
    const jt = (job.jobType || '').toLowerCase();
    const jtScore = (bio.includes('remote') && jt.includes('remote')) ? 1 : 0;

    score =
      SCORE_WEIGHTS.skills * skillScore +
      SCORE_WEIGHTS.location * locScore +
      SCORE_WEIGHTS.recency * recencyScore +
      SCORE_WEIGHTS.jobType * jtScore;

    return { job, score: Number(score.toFixed(4)) };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 20);

  res.status(200).json(scored);
});

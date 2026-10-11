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

// Seven-factor matching score; weights total 1.0.
const SCORE_WEIGHTS = {
  skills: 0.3,
  experience: 0.15,
  location: 0.2,
  workArrangement: 0.1,
  salary: 0.08,
  recency: 0.1,
  africaFirst: 0.07,
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

const experienceYearsFor = (user) => {
  const totalMilliseconds = (user.experience || []).reduce((total, entry) => {
    const start = new Date(entry.startDate);
    const end = entry.endDate && !/present|current/i.test(entry.endDate)
      ? new Date(entry.endDate)
      : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return total;
    return total + (end.getTime() - start.getTime());
  }, 0);
  if (totalMilliseconds === 0) return null;
  return totalMilliseconds / (1000 * 60 * 60 * 24 * 365.25);
};

const seniorityScore = (experienceYears, seniority) => {
  const level = String(seniority || '').toLowerCase();
  if (!level || experienceYears === null) return 0.5;
  if (/entry|junior|graduate|intern/.test(level)) return experienceYears <= 2 ? 1 : 0.4;
  if (/mid|intermediate/.test(level)) return experienceYears >= 2 && experienceYears <= 7 ? 1 : 0.5;
  if (/senior|lead|principal|executive/.test(level)) return experienceYears >= 5 ? 1 : 0.3;
  return 0.5;
};

const salaryScore = (job) => {
  const salary = String(job.salary || job.salaryRange || '');
  return salary && !/^competitive$/i.test(salary) ? 0.75 : 0.4;
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
  const experienceYears = experienceYearsFor(user);
  const bio = (user.bio || '').toLowerCase();
  const userPrefersRemote = /\bremote\b/.test(bio);

  const scored = jobs.map((job) => {
    const jobText = `${job.title} ${job.description || ''} ${job.requirements || ''} ${(job.tags || []).join(' ')}`;
    const tokens = extractTokens(jobText);
    const tokenSet = new Set(tokens);
    const matchedSkills = userSkills.filter((skill) => tokenSet.has(skill));
    const skillScore = userSkills.length ? matchedSkills.length / userSkills.length : 0;
    const locationText = `${job.location || ''} ${job.locationRestriction || ''}`.toLowerCase();
    const locationScore = userCountry
      ? (locationText.includes(userCountry) ? 1 : (job.isWorldwideRemote ? 0.85 : 0))
      : (job.isWorldwideRemote ? 0.75 : 0.5);
    const remoteScore = userPrefersRemote
      ? (job.isRemote || job.isWorldwideRemote || job.jobType === 'Remote' ? 1 : 0.35)
      : (job.isRemote || job.isWorldwideRemote || job.jobType === 'Remote' ? 0.7 : 1);
    const daysOld = (Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, Math.min(1, 1 - daysOld / 30));
    const isAfricanDirectPosting = job.source === 'employer'
      && job.isDirectPosting !== false
      && /\b(africa|algeria|angola|benin|botswana|burkina faso|burundi|cabo verde|cameroon|central african republic|chad|comoros|democratic republic of the congo|djibouti|egypt|equatorial guinea|eritrea|eswatini|ethiopia|gabon|gambia|ghana|guinea|guinea-bissau|ivory coast|kenya|lesotho|liberia|libya|madagascar|malawi|mali|mauritania|mauritius|morocco|mozambique|namibia|niger|nigeria|republic of the congo|rwanda|sao tome and principe|senegal|seychelles|sierra leone|somalia|south africa|south sudan|sudan|tanzania|togo|tunisia|uganda|zambia|zimbabwe)\b/i
        .test(`${job.location || ''} ${job.locationRestriction || ''}`);
    const breakdown = {
      skills: skillScore,
      experience: seniorityScore(experienceYears, job.seniority),
      location: locationScore,
      workArrangement: remoteScore,
      salary: salaryScore(job),
      recency: recencyScore,
      africaFirst: isAfricanDirectPosting ? 1 : (job.source === 'employer' ? 0.7 : 0.4),
    };
    const score = Object.entries(SCORE_WEIGHTS)
      .reduce((sum, [factor, weight]) => sum + weight * breakdown[factor], 0);

    return {
      job,
      score: Number(score.toFixed(4)),
      matchBreakdown: Object.fromEntries(
        Object.entries(breakdown).map(([factor, value]) => [factor, Number(value.toFixed(3))]),
      ),
    };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 20);

  res.status(200).json(scored);
});

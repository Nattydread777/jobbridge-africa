import asyncHandler from 'express-async-handler';
import Job from '../models/Job.js';

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

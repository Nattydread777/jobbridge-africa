import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import Job from '../models/Job.js';
import CvUsage from '../models/CvUsage.js';
import { buildActiveJobFilter } from '../utils/jobFilters.js';
import { buildRegionRestrictedJobFilter } from '../utils/jobSignals.js';
import { isRecommendationProfileReady, rankJobsForUser } from '../services/jobRecommendationService.js';
import {
  analyzeCvMatch,
  analyzeJobRequirements,
  extractSkillPhrases,
  mergeGroundedJobRequirements,
  normalizeTailoredCv,
  parseCvStructure,
  redactCvPii,
  splitCvSections,
} from '../services/cvAnalysisService.js';
import { getAiApiKey, tailorCvInParallel } from '../services/aiCvService.js';

const CV_TEXT_LIMIT = 30000;
const PROFILE_CV_PARSE_LIMIT = 50000;
const JOB_TEXT_LIMIT = 15000;
const COVER_LETTER_LIMIT = 10000;
const REQUEST_BYTE_LIMIT = 250000;

const getDailyLimit = () => {
  const parsed = Number.parseInt(process.env.CV_DAILY_FREE_LIMIT || '5', 10);
  return Number.isInteger(parsed) ? Math.min(20, Math.max(1, parsed)) : 5;
};

const getDailyAiLimit = () => {
  const parsed = Number.parseInt(process.env.CV_DAILY_AI_LIMIT || '2', 10);
  return Number.isInteger(parsed) ? Math.min(10, Math.max(1, parsed)) : 2;
};

export const parseProfileCv = asyncHandler(async (req, res) => {
  const { cvText } = req.body || {};
  if (typeof cvText !== 'string' || !cvText.trim()) {
    res.status(400);
    throw new Error('Provide readable CV text to parse.');
  }
  if (cvText.length > PROFILE_CV_PARSE_LIMIT) {
    res.status(413);
    throw new Error('The CV text exceeds the 50,000 character parsing limit.');
  }

  res.status(200).json({ cv: parseCvStructure(cvText) });
});

const consumeDailyAllowance = async (req, aiReview) => {
  const dayKey = new Date().toISOString().slice(0, 10);
  const identity = req.user?._id
    ? `user:${req.user._id}`
    : `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
  const identityHash = createHash('sha256').update(identity).digest('hex');
  const dailyLimit = getDailyLimit();
  const aiDailyLimit = getDailyAiLimit();
  const countField = aiReview ? 'aiCount' : 'count';
  const limit = aiReview ? aiDailyLimit : dailyLimit;
  const expiresAt = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000);
  const filter = {
    identityHash,
    dayKey,
    ...(aiReview
      ? { $or: [{ aiCount: { $lt: limit } }, { aiCount: { $exists: false } }] }
      : { count: { $lt: limit } }),
  };
  try {
    let usage = await CvUsage.findOneAndUpdate(filter, { $inc: { [countField]: 1 } }, { new: true });
    if (!usage) {
      try {
        usage = await CvUsage.create({
          identityHash,
          dayKey,
          count: aiReview ? 0 : 1,
          aiCount: aiReview ? 1 : 0,
          expiresAt,
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        usage = await CvUsage.findOneAndUpdate(filter, { $inc: { [countField]: 1 } }, { new: true });
      }
    }
    if (!usage) {
      const exhausted = new Error(
        aiReview
          ? 'You have reached today’s free AI tailoring allowance. Please try again tomorrow.'
          : 'You have reached today’s free diagnostic allowance. Please try again tomorrow.',
      );
      exhausted.status = 429;
      throw exhausted;
    }
    return {
      diagnosticLimit: dailyLimit,
      diagnosticsRemaining: Math.max(0, dailyLimit - usage.count),
      aiTailoringLimit: aiDailyLimit,
      aiTailoringsRemaining: Math.max(0, aiDailyLimit - usage.aiCount),
    };
  } catch (error) {
    if (error.status) throw error;
    if (error.code === 11000) {
      const exhausted = new Error(
        aiReview
          ? 'You have reached today’s free AI tailoring allowance. Please try again tomorrow.'
          : 'You have reached today’s free diagnostic allowance. Please try again tomorrow.',
      );
      exhausted.status = 429;
      throw exhausted;
    }
    throw error;
  }
};

const getRequestedJob = async (jobId, res) => {
  if (!jobId) return null;
  if (!mongoose.isValidObjectId(jobId)) {
    res.status(400);
    throw new Error('Choose a valid active job listing.');
  }
  const job = await Job.findOne({ _id: jobId, ...buildActiveJobFilter() });
  if (!job) {
    res.status(404);
    throw new Error('That job listing is no longer active. Choose another listing or paste a description.');
  }
  return job;
};

export const optimizeCv = asyncHandler(async (req, res) => {
  const cvText = typeof req.body?.cvText === 'string' ? req.body.cvText.trim() : '';
  const coverLetterText = typeof req.body?.coverLetterText === 'string'
    ? req.body.coverLetterText.trim()
    : '';
  const aiReview = req.body?.mode === 'ai_review';
  const job = await getRequestedJob(req.body?.jobId, res);
  const isRemoteRole = job && (
    job.isRemote
    || job.isWorldwideRemote
    || job.workplaceType === 'remote'
    || job.jobType === 'Remote'
  );
  const remoteEligibility = job?.isWorldwideRemote
    ? 'Worldwide / global'
    : job?.locationRestriction || job?.location || '';
  const jobDescription = job
    ? [job.title, job.fullDescription, job.description, job.requirements, job.responsibilities]
      .concat(isRemoteRole && remoteEligibility ? [`Remote eligibility: ${remoteEligibility}`] : [])
      .filter(Boolean)
      .join('\n')
    : typeof req.body?.jobDescription === 'string'
    ? req.body.jobDescription.trim()
    : '';

  if (req.body?.consent !== true) {
    res.status(400);
    throw new Error('Consent is required before processing CV text.');
  }
  if (!cvText || !jobDescription) {
    res.status(400);
    throw new Error('CV text and target job description are required');
  }
  if (cvText.length > CV_TEXT_LIMIT
    || jobDescription.length > JOB_TEXT_LIMIT
    || coverLetterText.length > COVER_LETTER_LIMIT
    || Buffer.byteLength(JSON.stringify(req.body), 'utf8') > REQUEST_BYTE_LIMIT) {
    res.status(413);
    throw new Error('The CV, cover letter, or job description exceeds the allowed size.');
  }

  if (aiReview && req.body?.aiConsent !== true) {
    res.status(400);
    throw new Error('Separate consent is required before using optional third-party AI review.');
  }
  if (aiReview && !getAiApiKey()) {
    res.status(503);
    throw new Error('Optional AI review is not configured. You can still use the free diagnostic review.');
  }

  let allowance;
  try {
    allowance = await consumeDailyAllowance(req, aiReview);
  } catch (error) {
    if (error.status) res.status(error.status);
    throw error;
  }
  const redactedCvText = redactCvPii(cvText);
  const redactedJobDescription = redactCvPii(jobDescription);
  const diagnostic = analyzeCvMatch(redactedCvText, redactedJobDescription);
  const sections = splitCvSections(cvText);
  const structuredCv = parseCvStructure(redactedCvText);
  const jobRequirements = analyzeJobRequirements(redactedJobDescription);
  let aiReviewResult = null;
  let aiJobAnalysisFallback = false;
  if (aiReview) {
    try {
      const generated = await tailorCvInParallel({
        cv: {
          summary: structuredCv.summary,
          skills: structuredCv.skills,
          experience: structuredCv.experience,
          education: structuredCv.education,
          certifications: structuredCv.certifications,
        },
        job: redactedJobDescription,
        jobRequirements,
      });
      const tailoredJobRequirements = mergeGroundedJobRequirements(
        jobRequirements,
        generated.jobAnalysis,
        redactedJobDescription,
      );
      aiJobAnalysisFallback = generated.jobAnalysisUnavailable;
      aiReviewResult = normalizeTailoredCv({
        generated,
        cv: structuredCv,
        sourceText: redactedCvText,
        jobRequirements: tailoredJobRequirements,
      });
      jobRequirements.must_haves = tailoredJobRequirements.must_haves;
      jobRequirements.nice_to_haves = tailoredJobRequirements.nice_to_haves;
    } catch (error) {
      if (error.status) res.status(error.status);
      throw error;
    }
  }

  res.status(200).json({
    ...diagnostic,
    job_requirements: jobRequirements,
    ai_job_analysis_fallback: aiJobAnalysisFallback,
    cv_sections: aiReview
      ? {
        ...structuredCv,
        contact: undefined,
      }
      : {
        ...structuredCv,
        contact: undefined,
        experience: structuredCv.experience.slice(0, 8),
        experience_bullets: sections.experienceBullets.slice(0, 8),
        cover_letter_detected: Boolean(sections.coverLetter),
      },
    tailored_cv: aiReviewResult,
    rewrites: [],
    summary_rewrite: null,
    ai_review_used: aiReview,
    ai_review_available: Boolean(getAiApiKey()),
    ai_provider: aiReview
      ? (process.env.GEMINI_API_KEY ? 'Gemini' : 'OpenAI')
      : null,
    job: job ? { _id: job._id, title: job.title, companyName: job.companyName } : null,
    daily_allowance: allowance,
    note: aiReview
      ? 'AI-assisted tailored text is guidance only. Review every edit and source link before use; no suggestion is a hiring decision or guarantee.'
      : 'This free diagnostic uses rule-based phrase matching. It is guidance only, not a hiring decision or guarantee.',
  });
});

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
  if (!isRecommendationProfileReady(user)) {
    return res.status(200).json([]);
  }

  let jobs;
  if (req.query.jobId) {
    if (!mongoose.isValidObjectId(req.query.jobId)) {
      res.status(400);
      throw new Error('Choose a valid active job listing.');
    }
    const job = await Job.findOne({ _id: req.query.jobId, ...buildActiveJobFilter() });
    if (!job) {
      res.status(404);
      throw new Error('That job listing is no longer active.');
    }
    jobs = [job];
  } else {
    jobs = await Job.find({
      $and: [
        buildActiveJobFilter(),
        { $nor: [buildRegionRestrictedJobFilter()] },
      ],
    }).sort({ createdAt: -1 }).limit(200);
  }

  res.status(200).json(rankJobsForUser(user, jobs).slice(0, 20));
});

import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import Job from '../models/Job.js';
import CvUsage from '../models/CvUsage.js';
import { buildActiveJobFilter } from '../utils/jobFilters.js';
import { buildRegionRestrictedJobFilter, deriveJobSignals } from '../utils/jobSignals.js';
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

// Eight-factor recommendation score; fit diagnostics remain separate from logistics.
const SCORE_WEIGHTS = {
  skills: 0.27,
  experience: 0.14,
  location: 0.16,
  workArrangement: 0.08,
  salary: 0.06,
  recency: 0.08,
  africaFirst: 0.06,
  eligibility: 0.15,
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

  const experienceText = (user.experience || []).map((entry) => [
    entry.position,
    entry.company,
    entry.startDate,
    entry.endDate,
    entry.description,
  ].filter(Boolean).join(' ')).join('\n');
  const profileText = [
    `Summary:\n${user.bio || ''}`,
    `Skills:\n${(user.skills || []).join(', ')}`,
    `Experience:\n${experienceText}`,
  ].join('\n');
  const userSkills = extractSkillPhrases(profileText);
  const userSkillSet = new Set(userSkills);
  const userCountry = (user.country || '').toLowerCase();
  const experienceYears = experienceYearsFor(user);
  const bio = (user.bio || '').toLowerCase();
  const userPrefersRemote = /\bremote\b/.test(bio);

  const scored = jobs.map((job) => {
    const jobSignals = deriveJobSignals(job);
    const globalRemote = jobSignals.eligibilityScope === 'worldwide';
    const remoteRole = job.isRemote
      || job.isWorldwideRemote
      || job.workplaceType === 'remote'
      || job.jobType === 'Remote';
    const jobText = [
      job.title,
      job.description,
      job.fullDescription,
      job.requirements,
      job.qualifications,
      job.responsibilities,
      ...(job.tags || []),
    ].filter(Boolean).join(' ');
    const requiredSkills = extractSkillPhrases(jobText);
    const matchedSkills = requiredSkills.filter((skill) => userSkillSet.has(skill));
    const skillScore = requiredSkills.length
      ? matchedSkills.length / requiredSkills.length
      : (userSkills.length ? 0.5 : 0);
    const locationText = `${job.location || ''} ${job.locationRestriction || ''}`.toLowerCase();
    const locationScore = userCountry
      ? (locationText.includes(userCountry)
        ? 1
        : (globalRemote ? 0.85 : jobSignals.eligibilityScope === 'africa_friendly' ? 0.75 : 0))
      : (globalRemote ? 0.75 : 0.5);
    const remoteScore = userPrefersRemote
      ? (remoteRole ? 1 : 0.35)
      : (remoteRole ? 0.7 : 1);
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
      eligibility: {
        worldwide: 1,
        africa_friendly: 0.95,
        region_restricted: 0,
        unspecified: 0.5,
      }[jobSignals.eligibilityScope],
    };
    const score = Object.entries(SCORE_WEIGHTS)
      .reduce((sum, [factor, weight]) => sum + weight * breakdown[factor], 0);
    const fitContext = analyzeCvMatch(profileText, jobText);

    return {
      job: { ...job.toObject(), ...jobSignals },
      score: Number(score.toFixed(4)),
      matchBreakdown: Object.fromEntries(
        Object.entries(breakdown).map(([factor, value]) => [factor, Number(value.toFixed(3))]),
      ),
      fit_context: {
        overall_score: fitContext.overall_score,
        skills: {
          score: fitContext.skills.score,
          matched: matchedSkills,
          required: requiredSkills,
        },
        experience: fitContext.experience,
        logistics: fitContext.logistics,
        must_have_gaps: fitContext.must_have_gaps,
      },
    };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 20);

  res.status(200).json(scored);
});

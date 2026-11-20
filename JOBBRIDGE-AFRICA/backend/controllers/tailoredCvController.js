import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Job from '../models/Job.js';
import TailoredCv from '../models/TailoredCv.js';
import { buildActiveJobFilter } from '../utils/jobFilters.js';

const TAILORED_CV_LIMIT = 50000;

const validateSections = (sections) => {
  if (!sections || typeof sections !== 'object' || Array.isArray(sections)) return false;
  const serialized = JSON.stringify(sections);
  if (Buffer.byteLength(serialized, 'utf8') > TAILORED_CV_LIMIT) return false;
  return ['contact', 'summary', 'skills', 'experience', 'education', 'certifications']
    .every((key) => Object.hasOwn(sections, key));
};

export const saveTailoredCv = asyncHandler(async (req, res) => {
  const { jobId, sections } = req.body || {};
  if (!mongoose.isValidObjectId(jobId)) {
    res.status(400);
    throw new Error('A valid active job is required to save this tailored CV.');
  }
  if (!validateSections(sections)) {
    res.status(400);
    throw new Error('The structured CV is invalid or exceeds the 50,000-character storage limit.');
  }
  const job = await Job.findOne({ _id: jobId, ...buildActiveJobFilter() }).select('_id');
  if (!job) {
    res.status(404);
    throw new Error('That job listing is no longer active.');
  }

  const tailoredCv = await TailoredCv.findOneAndUpdate(
    { applicant: req.user._id, job: job._id },
    { $set: { sections, source: req.body.source === 'rule_based' ? 'rule_based' : 'ai_assisted' } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  res.status(200).json({
    id: tailoredCv._id,
    jobId: tailoredCv.job,
    updatedAt: tailoredCv.updatedAt,
    message: 'Your tailored CV has been saved for this job.',
  });
});

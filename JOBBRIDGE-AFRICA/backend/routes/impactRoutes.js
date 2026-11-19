import express from 'express';
import asyncHandler from 'express-async-handler';
import Job from '../models/Job.js';
import User from '../models/userModel.js';
import { buildActiveJobFilter } from '../utils/jobFilters.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const [jobsListed, candidates, countries] = await Promise.all([
    Job.countDocuments(buildActiveJobFilter()),
    User.countDocuments({ role: 'job_seeker', emailVerified: { $ne: false } }),
    User.distinct('country', {
      role: 'job_seeker',
      emailVerified: { $ne: false },
      country: { $exists: true, $ne: '' },
    }),
  ]);
  res.json({
    asOf: new Date().toISOString(),
    jobsListed,
    candidates,
    countries: countries.length,
    placements: null,
    methodology: {
      jobsListed: 'Active, non-expired jobs currently available in the JobBridge Africa database.',
      candidates: 'Job-seeker accounts currently in the database; excludes accounts explicitly marked unverified.',
      countries: 'Distinct country values on those job-seeker profiles.',
      placements: 'Placement outcomes are not currently recorded in the platform.',
    },
  });
}));

export default router;

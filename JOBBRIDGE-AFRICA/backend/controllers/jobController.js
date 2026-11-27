import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Job from '../models/Job.js';
import JobOutboundClick from '../models/JobOutboundClick.js';
import User from '../models/userModel.js';
import JobReport from '../models/JobReport.js';
import { buildActiveJobFilter } from '../utils/jobFilters.js';

const AFRICAN_LOCATION_PATTERN = '\\b(?:africa|algeria|angola|benin|botswana|burkina faso|burundi|cabo verde|cameroon|central african republic|chad|comoros|democratic republic of the congo|djibouti|egypt|equatorial guinea|eritrea|eswatini|ethiopia|gabon|gambia|ghana|guinea|guinea-bissau|ivory coast|kenya|lesotho|liberia|libya|madagascar|malawi|mali|mauritania|mauritius|morocco|mozambique|namibia|niger|nigeria|republic of the congo|rwanda|sao tome and principe|senegal|seychelles|sierra leone|somalia|south africa|south sudan|sudan|tanzania|togo|tunisia|uganda|zambia|zimbabwe)\\b';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeDeduplicationField = (field) => ({
  $toLower: {
    $trim: {
      input: {
        $convert: {
          input: `$${field}`,
          to: 'string',
          onError: '',
          onNull: '',
        },
      },
    },
  },
});

const jobFieldLength = (field) => ({
  $strLenCP: {
    $convert: {
      input: `$${field}`,
      to: 'string',
      onError: '',
      onNull: '',
    },
  },
});

const jobDeduplicationStages = () => [
  {
    $addFields: {
      _deduplicationKey: {
        title: normalizeDeduplicationField('title'),
        companyName: normalizeDeduplicationField('companyName'),
      },
      _listingCompleteness: {
        $add: [
          jobFieldLength('fullDescription'),
          jobFieldLength('description'),
          jobFieldLength('excerpt'),
          jobFieldLength('requirements'),
          jobFieldLength('qualifications'),
          jobFieldLength('responsibilities'),
          jobFieldLength('benefits'),
          jobFieldLength('applicationInstructions'),
          jobFieldLength('applicationLink'),
          jobFieldLength('salary'),
        ],
      },
    },
  },
  { $sort: { _listingCompleteness: -1, pubDate: -1, createdAt: -1, _id: -1 } },
  {
    $group: {
      _id: '$_deduplicationKey',
      job: { $first: '$$ROOT' },
    },
  },
  { $replaceRoot: { newRoot: '$job' } },
  { $unset: ['_deduplicationKey', '_listingCompleteness'] },
];

const parseOptionalExpiryDate = (value, res) => {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    res.status(400);
    throw new Error('Application deadline must be a valid date.');
  }
  return date;
};

const parseBoolean = (value, name, res) => {
  if (value === undefined) return undefined;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  res.status(400);
  throw new Error(`${name} must be true or false`);
};

const normalizeEmployerName = (value) => (
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
);
const employerNameKey = (value) => normalizeEmployerName(value).toLocaleLowerCase('en');
const PLACEHOLDER_EMPLOYER_NAMES = new Set([
  '',
  'unknown',
  'n/a',
  'na',
  'none',
  'null',
  'not specified',
  'not provided',
  'confidential',
  'company confidential',
  'undisclosed',
  'employer',
  'various',
]);

const featuredEmployerPipeline = () => [
  {
    $match: {
      $and: [
        buildActiveJobFilter(),
        { sourceProvider: { $ne: 'jobbridge-fallback' } },
      ],
    },
  },
  ...jobDeduplicationStages(),
  {
    $addFields: {
      _employerKey: {
        $toLower: {
          $trim: {
            input: {
              $convert: {
                input: '$companyName',
                to: 'string',
                onError: '',
                onNull: '',
              },
            },
          },
        },
      },
      _employerActivity: {
        $ifNull: ['$lastSeenAt', { $ifNull: ['$pubDate', '$createdAt'] }],
      },
      _globalRemoteListing: {
        $cond: [{ $eq: ['$isWorldwideRemote', true] }, 1, 0],
      },
    },
  },
  { $match: { _employerKey: { $ne: '' } } },
  { $sort: { _employerActivity: -1, _id: 1 } },
  {
    $group: {
      _id: '$_employerKey',
      name: { $first: '$companyName' },
      listingCount: { $sum: 1 },
      mostRecent: { $max: '$_employerActivity' },
      globalRemoteListings: { $sum: '$_globalRemoteListing' },
    },
  },
  { $sort: { listingCount: -1, mostRecent: -1, globalRemoteListings: -1, name: 1 } },
];

const collectFeaturedEmployers = (rows) => {
  const employersByName = new Map();
  for (const row of rows) {
    const name = normalizeEmployerName(row.name);
    const key = employerNameKey(name);
    if (PLACEHOLDER_EMPLOYER_NAMES.has(key)) continue;

    const existing = employersByName.get(key);
    if (!existing) {
      employersByName.set(key, {
        name,
        listingCount: Number(row.listingCount) || 0,
        mostRecent: row.mostRecent || null,
        globalRemoteListings: Number(row.globalRemoteListings) || 0,
      });
      continue;
    }

    existing.listingCount += Number(row.listingCount) || 0;
    existing.globalRemoteListings += Number(row.globalRemoteListings) || 0;
    if (new Date(row.mostRecent || 0) > new Date(existing.mostRecent || 0)) {
      existing.name = name;
      existing.mostRecent = row.mostRecent;
    }
  }
  return [...employersByName.values()].sort((a, b) => (
    b.listingCount - a.listingCount
    || new Date(b.mostRecent || 0) - new Date(a.mostRecent || 0)
    || b.globalRemoteListings - a.globalRemoteListings
    || a.name.localeCompare(b.name)
  ));
};

export const getFeaturedEmployers = asyncHandler(async (req, res) => {
  const rows = await Job.aggregate(featuredEmployerPipeline());
  const employers = collectFeaturedEmployers(rows);
  const all = String(req.query?.all || '').toLowerCase() === 'true';
  const requestedLimit = Number.parseInt(req.query?.limit, 10) || 12;
  const limit = Math.min(24, Math.max(1, requestedLimit));
  res.status(200).json({
    employers: all ? employers : employers.slice(0, limit),
    total: employers.length,
  });
});

// @desc    Get all jobs (public)
// @route   GET /api/jobs
// @access  Public
export const getJobs = asyncHandler(async (req, res) => {
  const {
    q,
    search,
    company,
    location,
    country,
    city,
    jobType,
    employmentType,
    seniority,
    isRemote,
    remote,
    workplaceType,
    category,
    datePosted,
    page = 1,
    cursor,
    limit = 12,
  } = req.query;
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 12));
  const remoteFilter = parseBoolean(isRemote !== undefined ? isRemote : remote, 'remote', res);
  const selectedWorkplace = workplaceType === undefined
    ? undefined
    : String(workplaceType).trim().toLowerCase();
  if (selectedWorkplace && !['remote', 'hybrid', 'on-site'].includes(selectedWorkplace)) {
    res.status(400);
    throw new Error('workplaceType must be remote, hybrid, or on-site');
  }
  const filters = [buildActiveJobFilter()];
  const keyword = String(q || search || '').trim();

  if (keyword) {
    const escaped = escapeRegex(keyword);
    const regex = { $regex: escaped, $options: 'i' };
    filters.push({
      $or: [
        { title: regex },
        { companyName: regex },
        { excerpt: regex },
        { description: regex },
        { seniority: regex },
        { categories: regex },
        { tags: regex },
      ],
    });
  }
  const companyName = String(company || '').trim();
  if (companyName) {
    if (companyName.length > 160) {
      res.status(400);
      throw new Error('Company filter must be 160 characters or fewer.');
    }
    const companyPattern = companyName.split(/\s+/).map(escapeRegex).join('\\s+');
    filters.push({ companyName: { $regex: `^${companyPattern}$`, $options: 'i' } });
  }

  const worldwideCountry = String(country || '').toLowerCase() === 'worldwide';
  if (worldwideCountry) {
    filters.push({ isWorldwideRemote: true });
  }
  const locationTerms = location
    ? [{ value: location, includeWorldwideRemote: false }]
    : [
      { value: city, includeWorldwideRemote: false },
      ...(!worldwideCountry ? [{ value: country, includeWorldwideRemote: true }] : []),
    ];
  for (const term of locationTerms.filter(({ value }) => value)) {
    const escapedLocation = escapeRegex(String(term.value).trim());
    filters.push({
      $or: [
        { location: { $regex: escapedLocation, $options: 'i' } },
        { locationRestriction: { $regex: escapedLocation, $options: 'i' } },
        ...(term.includeWorldwideRemote
          ? [{ $and: [{ isRemote: true }, { isWorldwideRemote: true }] }]
          : []),
      ],
    });
  }

  const typeFilter = employmentType || jobType;
  if (typeFilter) filters.push({ jobType: String(typeFilter) });
  if (category) {
    const escapedCategory = escapeRegex(String(category).trim());
    filters.push({
      $or: [
        { categories: { $regex: escapedCategory, $options: 'i' } },
        { tags: { $regex: escapedCategory, $options: 'i' } },
      ],
    });
  }
  if (selectedWorkplace) {
    if (selectedWorkplace === 'remote') {
      filters.push({
        $or: [
          { workplaceType: 'remote' },
          { isRemote: true },
          { jobType: 'Remote' },
        ],
      });
    } else if (selectedWorkplace === 'hybrid') {
      filters.push({ workplaceType: 'hybrid' });
    } else {
      filters.push({
        $or: [
          { workplaceType: 'on-site' },
          {
            workplaceType: { $exists: false },
            isRemote: { $ne: true },
            jobType: { $ne: 'Remote' },
          },
        ],
      });
    }
  } else if (remoteFilter === true) {
    filters.push({
      $or: [
        { isRemote: true },
        { workplaceType: 'remote' },
        { isWorldwideRemote: true },
        { jobType: 'Remote' },
      ],
    });
  } else if (remoteFilter === false) {
    filters.push({
      $or: [
        { workplaceType: { $in: ['hybrid', 'on-site'] } },
        {
          workplaceType: { $exists: false },
          isRemote: { $ne: true },
          isWorldwideRemote: { $ne: true },
          jobType: { $ne: 'Remote' },
        },
      ],
    });
  }
  if (seniority) {
    const escapedSeniority = escapeRegex(String(seniority));
    filters.push({ seniority: { $regex: escapedSeniority, $options: 'i' } });
  }
  if (datePosted) {
    const ageInHours = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30 }[String(datePosted)];
    if (!ageInHours) {
      res.status(400);
      throw new Error('datePosted must be 24h, 7d, or 30d');
    }
    const postedAfter = new Date(Date.now() - ageInHours * 60 * 60 * 1000);
    filters.push({
      $or: [
        { pubDate: { $gte: postedAfter } },
        {
          $and: [
            { $or: [{ pubDate: { $exists: false } }, { pubDate: null }] },
            { createdAt: { $gte: postedAfter } },
          ],
        },
      ],
    });
  }
  const countFilters = [...filters];

  let cursorValue;
  if (cursor) {
    try {
      cursorValue = JSON.parse(Buffer.from(String(cursor), 'base64url').toString('utf8'));
    } catch {
      res.status(400);
      throw new Error('Invalid pagination cursor');
    }

    const cursorDate = new Date(cursorValue.createdAt);
    const cursorPriority = Number(cursorValue.priority);
    if (!mongoose.isValidObjectId(cursorValue.id)
      || Number.isNaN(cursorDate.getTime())
      || ![0, 1, 2].includes(cursorPriority)) {
      res.status(400);
      throw new Error('Invalid pagination cursor');
    }
  }

  const query = { $and: filters };
  const priorityStage = {
    $addFields: {
        source: { $ifNull: ['$source', 'employer'] },
        workplaceType: {
          $ifNull: [
            '$workplaceType',
            {
              $cond: [
                {
                  $or: [
                    { $eq: ['$isRemote', true] },
                    { $eq: ['$jobType', 'Remote'] },
                    { $eq: ['$isWorldwideRemote', true] },
                  ],
                },
                'remote',
                'on-site',
              ],
            },
          ],
        },
        isDirectPosting: {
          $cond: [
            { $eq: [{ $ifNull: ['$source', 'employer'] }, 'employer'] },
            { $ifNull: ['$isDirectPosting', true] },
            false,
          ],
        },
        _searchPriority: {
        $switch: {
          branches: [
            {
              case: {
                $and: [
                  { $eq: [{ $ifNull: ['$source', 'employer'] }, 'employer'] },
                  { $ne: [{ $ifNull: ['$isDirectPosting', true] }, false] },
                  {
                    $regexMatch: {
                      input: {
                        $toLower: {
                          $concat: [
                            { $ifNull: ['$location', ''] },
                            ' ',
                            { $ifNull: ['$locationRestriction', ''] },
                          ],
                        },
                      },
                      regex: AFRICAN_LOCATION_PATTERN,
                    },
                  },
                ],
              },
              then: 2,
            },
            {
              case: {
                $and: [
                  { $eq: [{ $ifNull: ['$source', 'employer'] }, 'employer'] },
                  { $ne: [{ $ifNull: ['$isDirectPosting', true] }, false] },
                ],
              },
              then: 1,
            },
          ],
          default: 0,
        },
      },
    },
  };
  const pipeline = [{ $match: query }, priorityStage, ...jobDeduplicationStages()];
  if (cursorValue) {
    const cursorDate = new Date(cursorValue.createdAt);
    const cursorPriority = Number(cursorValue.priority);
    pipeline.push({
      $match: {
        $or: [
          { _searchPriority: { $lt: cursorPriority } },
          {
            _searchPriority: cursorPriority,
            createdAt: { $lt: cursorDate },
          },
          {
            _searchPriority: cursorPriority,
            createdAt: cursorDate,
            _id: { $lt: new mongoose.Types.ObjectId(cursorValue.id) },
          },
        ],
      },
    });
  }
  pipeline.push(
    { $sort: { _searchPriority: -1, createdAt: -1, _id: -1 } },
    { $skip: cursorValue ? 0 : (pageNumber - 1) * pageSize },
    { $limit: pageSize + 1 },
    {
      $lookup: {
        from: User.collection.name,
        localField: 'postedBy',
        foreignField: '_id',
        as: 'postedByUser',
      },
    },
    { $unwind: { path: '$postedByUser', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        postedBy: {
          $cond: [
            { $ifNull: ['$postedByUser._id', false] },
            {
              _id: '$postedByUser._id',
              name: '$postedByUser.name',
              email: '$postedByUser.email',
            },
            null,
          ],
        },
      },
    },
    { $unset: 'postedByUser' },
  );
  const [jobs, totalCounts] = await Promise.all([
    Job.aggregate(pipeline),
    Job.aggregate([
      { $match: { $and: countFilters } },
      ...jobDeduplicationStages(),
      { $count: 'total' },
    ]),
  ]);
  const total = totalCounts[0]?.total || 0;
  const hasMore = jobs.length > pageSize;
  if (hasMore) jobs.pop();
  const lastJob = jobs[jobs.length - 1];
  const nextCursor = hasMore && lastJob
    ? Buffer.from(JSON.stringify({
      createdAt: lastJob.createdAt.toISOString(),
      id: lastJob._id.toString(),
      priority: lastJob._searchPriority,
    })).toString('base64url')
    : null;

  res.status(200).json({
    jobs,
    page: pageNumber,
    limit: pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    nextCursor,
  });
});

export const getEmployerJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.find({ postedBy: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json({ jobs, total: jobs.length });
});

// @desc    Get single job by ID (public)
// @route   GET /api/jobs/:id
// @access  Public
export const getJobById = asyncHandler(async (req, res) => {
  const requestedId = String(req.params.id);
  const id = requestedId.match(/([a-f\d]{24})$/i)?.[1];
  if (!id || !mongoose.isValidObjectId(id)) {
    res.status(400);
    throw new Error('Invalid job ID');
  }
  const job = await Job.findById(id).populate('postedBy', 'name email');
  if (job) {
    res.status(200).json(job);
  } else {
    res.status(404);
    throw new Error('Job not found');
  }
});

export const reportJob = asyncHandler(async (req, res) => {
  const { reason, details = '', email = '' } = req.body || {};
  const validReasons = ['scam', 'misleading', 'expired', 'inaccurate', 'other'];
  const normalizedDetails = typeof details === 'string' ? details.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!validReasons.includes(reason)) {
    res.status(400);
    throw new Error('Choose a valid reason for reporting this job.');
  }
  if (typeof details !== 'string' || normalizedDetails.length > 2000) {
    res.status(400);
    throw new Error('Report details must be 2,000 characters or fewer.');
  }
  if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    res.status(400);
    throw new Error('Enter a valid email address.');
  }
  const reportJobId = String(req.params.id).match(/([a-f\d]{24})$/i)?.[1];
  if (!mongoose.isValidObjectId(reportJobId)) {
    res.status(400);
    throw new Error('Invalid job ID.');
  }
  const jobExists = await Job.exists({ _id: reportJobId });
  if (!jobExists) {
    res.status(404);
    throw new Error('Job not found.');
  }

  await JobReport.create({
    job: reportJobId,
    reason,
    details: normalizedDetails,
    email: normalizedEmail,
  });
  res.status(201).json({ message: 'Thank you. Your report has been sent for review.' });
});

export const trackOutboundClick = asyncHandler(async (req, res) => {
  const jobId = String(req.params.id);
  if (!mongoose.isValidObjectId(jobId)) {
    res.status(400);
    throw new Error('Invalid job ID.');
  }
  const linkType = req.body?.linkType || 'application';
  if (!['application', 'source'].includes(linkType)) {
    res.status(400);
    throw new Error('Link type must be application or source.');
  }
  const job = await Job.findById(jobId).select(
    'source sourceProvider sourceName applicationLink sourceUrl',
  );
  if (!job) {
    res.status(404);
    throw new Error('Job not found.');
  }
  const targetUrl = linkType === 'source' ? job.sourceUrl : job.applicationLink;
  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    res.status(400);
    throw new Error('This job does not have a valid external link.');
  }
  if (!['http:', 'https:'].includes(parsedTarget.protocol)) {
    res.status(400);
    throw new Error('This job does not have a valid external link.');
  }

  await JobOutboundClick.create({
    jobId: job._id,
    source: job.sourceName || job.sourceProvider || job.source || 'unknown',
    userId: req.user?._id || null,
    linkType,
  });
  res.status(202).json({ message: 'Outbound click recorded.' });
});

// @desc    Create a new job (employer only)
// @route   POST /api/jobs
// @access  Private/Employer
export const createJob = asyncHandler(async (req, res) => {
  const { 
    title, 
    location, 
    jobType, 
    workplaceType,
    salaryRange, 
    description, 
    fullDescription,
    requirements,
    qualifications,
    responsibilities,
    benefits,
    applicationInstructions,
    expiryDate,
    applicationEmail 
  } = req.body;

  if (!title || !location || !description) {
    res.status(400);
    throw new Error('Please fill in all required fields');
  }
  const parsedExpiryDate = parseOptionalExpiryDate(expiryDate, res);
  const normalizedWorkplaceType = String(workplaceType || (jobType === 'Remote' ? 'remote' : 'on-site'))
    .trim()
    .toLowerCase();
  if (!['remote', 'hybrid', 'on-site'].includes(normalizedWorkplaceType)) {
    res.status(400);
    throw new Error('Workplace type must be remote, hybrid, or on-site');
  }

  const job = await Job.create({
    title,
    companyName: req.user.companyName,
    companySlug: req.user.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    company: req.user._id,
    location,
    jobType,
    workplaceType: normalizedWorkplaceType,
    source: 'employer',
    isDirectPosting: true,
    isRemote: normalizedWorkplaceType === 'remote',
    isWorldwideRemote: normalizedWorkplaceType === 'remote'
      && /\b(worldwide|global(?:ly)?|anywhere|africa)\b/i.test(location),
    salaryRange,
    description: fullDescription || description,
    fullDescription: fullDescription || description,
    requirements,
    qualifications,
    responsibilities,
    benefits,
    applicationInstructions,
    expiryDate: parsedExpiryDate,
    applicationEmail: applicationEmail || req.user.email,
    postedBy: req.user._id,
  });

  res.status(201).json(job);
});

// @desc    Update a job (employer only)
// @route   PUT /api/jobs/:id
// @access  Private/Employer
export const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  if (job.postedBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this job');
  }

  job.title = req.body.title || job.title;
  job.location = req.body.location || job.location;
  job.jobType = req.body.jobType || job.jobType;
  if (req.body.workplaceType !== undefined) {
    const normalizedWorkplaceType = String(req.body.workplaceType).trim().toLowerCase();
    if (!['remote', 'hybrid', 'on-site'].includes(normalizedWorkplaceType)) {
      res.status(400);
      throw new Error('Workplace type must be remote, hybrid, or on-site');
    }
    job.workplaceType = normalizedWorkplaceType;
    job.isRemote = normalizedWorkplaceType === 'remote';
    job.isWorldwideRemote = normalizedWorkplaceType === 'remote'
      && /\b(worldwide|global(?:ly)?|anywhere|africa)\b/i.test(job.location);
  } else if (req.body.location !== undefined) {
    job.isWorldwideRemote = job.isRemote
      && /\b(worldwide|global(?:ly)?|anywhere|africa)\b/i.test(job.location);
  }
  job.salaryRange = req.body.salaryRange || job.salaryRange;
  job.description = req.body.fullDescription || req.body.description || job.description;
  job.fullDescription = req.body.fullDescription || req.body.description || job.fullDescription || job.description;
  job.requirements = req.body.requirements || job.requirements;
  job.qualifications = req.body.qualifications ?? job.qualifications;
  job.responsibilities = req.body.responsibilities || job.responsibilities;
  job.benefits = req.body.benefits || job.benefits;
  job.applicationInstructions = req.body.applicationInstructions ?? job.applicationInstructions;
  if (Object.prototype.hasOwnProperty.call(req.body, 'expiryDate')) {
    job.expiryDate = parseOptionalExpiryDate(req.body.expiryDate, res);
  }
  job.applicationEmail = req.body.applicationEmail || job.applicationEmail;

  const updatedJob = await job.save();
  res.status(200).json(updatedJob);
});

// @desc    Delete a job (employer only)
// @route   DELETE /api/jobs/:id
// @access  Private/Employer
export const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  if (job.postedBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this job');
  }

  await Job.findByIdAndDelete(req.params.id);
  res.status(200).json({ message: 'Job deleted successfully' });
});

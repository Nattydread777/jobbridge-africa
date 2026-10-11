import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Job from '../models/Job.js';
import User from '../models/userModel.js';

const AFRICAN_LOCATION_PATTERN = '\\b(?:africa|algeria|angola|benin|botswana|burkina faso|burundi|cabo verde|cameroon|central african republic|chad|comoros|democratic republic of the congo|djibouti|egypt|equatorial guinea|eritrea|eswatini|ethiopia|gabon|gambia|ghana|guinea|guinea-bissau|ivory coast|kenya|lesotho|liberia|libya|madagascar|malawi|mali|mauritania|mauritius|morocco|mozambique|namibia|niger|nigeria|republic of the congo|rwanda|sao tome and principe|senegal|seychelles|sierra leone|somalia|south africa|south sudan|sudan|tanzania|togo|tunisia|uganda|zambia|zimbabwe)\\b';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseBoolean = (value, name, res) => {
  if (value === undefined) return undefined;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  res.status(400);
  throw new Error(`${name} must be true or false`);
};

// @desc    Get all jobs (public)
// @route   GET /api/jobs
// @access  Public
export const getJobs = asyncHandler(async (req, res) => {
  const {
    q,
    search,
    location,
    country,
    city,
    jobType,
    employmentType,
    seniority,
    isRemote,
    page = 1,
    cursor,
    limit = 20,
  } = req.query;
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 20));
  const remoteFilter = parseBoolean(isRemote, 'isRemote', res);
  const filters = [
    { expiryDate: { $gte: new Date() } },
    { isApproved: true },
  ];
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
      ],
    });
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
  if (seniority) {
    const escapedSeniority = escapeRegex(String(seniority));
    filters.push({ seniority: { $regex: escapedSeniority, $options: 'i' } });
  }
  if (remoteFilter === true) {
    filters.push({
      $or: [
        { isRemote: true },
        { isWorldwideRemote: true },
        { jobType: 'Remote' },
      ],
    });
  } else if (remoteFilter === false) {
    filters.push({
      isRemote: { $ne: true },
      isWorldwideRemote: { $ne: true },
      jobType: { $ne: 'Remote' },
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
  const pipeline = [{ $match: query }, priorityStage];
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
  const [jobs, total] = await Promise.all([
    Job.aggregate(pipeline),
    Job.countDocuments({ $and: countFilters }),
  ]);
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
  const job = await Job.findById(req.params.id).populate('postedBy', 'name email');
  if (job) {
    res.status(200).json(job);
  } else {
    res.status(404);
    throw new Error('Job not found');
  }
});

// @desc    Create a new job (employer only)
// @route   POST /api/jobs
// @access  Private/Employer
export const createJob = asyncHandler(async (req, res) => {
  const { 
    title, 
    location, 
    jobType, 
    salaryRange, 
    description, 
    requirements,
    responsibilities,
    benefits,
    expiryDate,
    applicationEmail 
  } = req.body;

  if (!title || !location || !description || !expiryDate) {
    res.status(400);
    throw new Error('Please fill in all required fields');
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
    source: 'employer',
    isDirectPosting: true,
    isRemote: jobType === 'Remote' || /\bremote\b/i.test(location),
    isWorldwideRemote: /\b(worldwide|global(?:ly)?|anywhere|africa)\b/i.test(location),
    salaryRange,
    description,
    requirements,
    responsibilities,
    benefits,
    expiryDate,
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
  job.salaryRange = req.body.salaryRange || job.salaryRange;
  job.description = req.body.description || job.description;
  job.requirements = req.body.requirements || job.requirements;
  job.responsibilities = req.body.responsibilities || job.responsibilities;
  job.benefits = req.body.benefits || job.benefits;
  job.expiryDate = req.body.expiryDate || job.expiryDate;
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

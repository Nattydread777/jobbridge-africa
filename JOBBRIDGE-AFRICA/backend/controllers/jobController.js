import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Job from '../models/Job.js';

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
    page = 1,
    cursor,
    limit = 20,
  } = req.query;
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 20));
  const filters = [
    { expiryDate: { $gte: new Date() } },
    { isApproved: true },
  ];
  const keyword = String(q || search || '').trim();

  if (keyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  const locationFilter = location || city || country;
  if (locationFilter) {
    const escapedLocation = String(locationFilter).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filters.push({
      $or: [
        { location: { $regex: escapedLocation, $options: 'i' } },
        { locationRestriction: { $regex: escapedLocation, $options: 'i' } },
      ],
    });
  }

  const typeFilter = employmentType || jobType;
  if (typeFilter) filters.push({ jobType: String(typeFilter) });
  if (seniority) {
    const escapedSeniority = String(seniority).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filters.push({ seniority: { $regex: escapedSeniority, $options: 'i' } });
  }
  const countFilters = [...filters];

  if (cursor) {
    let cursorValue;
    try {
      cursorValue = JSON.parse(Buffer.from(String(cursor), 'base64url').toString('utf8'));
    } catch {
      res.status(400);
      throw new Error('Invalid pagination cursor');
    }

    const cursorDate = new Date(cursorValue.createdAt);
    if (!mongoose.isValidObjectId(cursorValue.id) || Number.isNaN(cursorDate.getTime())) {
      res.status(400);
      throw new Error('Invalid pagination cursor');
    }
    const cursorFilter = {
      $or: [
        { createdAt: { $lt: cursorDate } },
        { createdAt: cursorDate, _id: { $lt: cursorValue.id } },
      ],
    };
    filters.push(cursorFilter);
  }

  const query = { $and: filters };
  const [jobs, total] = await Promise.all([
    Job.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip(cursor ? 0 : (pageNumber - 1) * pageSize)
      .limit(pageSize + 1)
      .populate('postedBy', 'name email'),
    Job.countDocuments({ $and: countFilters }),
  ]);
  const hasMore = jobs.length > pageSize;
  if (hasMore) jobs.pop();
  const lastJob = jobs[jobs.length - 1];
  const nextCursor = hasMore && lastJob
    ? Buffer.from(JSON.stringify({
      createdAt: lastJob.createdAt.toISOString(),
      id: lastJob._id.toString(),
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
    company: req.user._id,
    location,
    jobType,
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

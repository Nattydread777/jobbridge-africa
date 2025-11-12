import asyncHandler from 'express-async-handler';
import Job from '../models/Job.js';

// @desc    Get all jobs (public)
// @route   GET /api/jobs
// @access  Public
export const getJobs = asyncHandler(async (req, res) => {
  // Support optional query filters from the frontend
  const { search, country, city, jobType } = req.query;

  const query = {};

  // Filter out expired jobs by default
  query.expiryDate = { $gte: new Date() };

  if (jobType) {
    // Accept exact match for jobType (e.g., Full-time, Remote)
    query.jobType = jobType;
  }

  if (city) {
    // Match city in the location string (case-insensitive)
    query.location = { $regex: city, $options: 'i' };
  } else if (country) {
    // Match country in the location string if city not provided
    query.location = { $regex: country, $options: 'i' };
  }

  if (search) {
    // Search title and description for the provided keywords
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const jobs = await Job.find(query).populate('postedBy', 'name email');
  res.status(200).json(jobs);
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

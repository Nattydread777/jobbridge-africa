import asyncHandler from 'express-async-handler';
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import User from '../models/userModel.js';
import cloudinary from '../config/cloudinary.js';
import { sendEmployerApplicationNotification } from '../services/emailService.js';

// @desc    Submit job application
// @route   POST /api/applications
// @access  Private (Job Seekers only)
export const submitApplication = asyncHandler(async (req, res) => {
  const { jobId, coverLetter } = req.body;

  if (!jobId) {
    res.status(400);
    throw new Error('Job ID is required');
  }

  // Check if job exists
  const job = await Job.findById(jobId);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  if (job.source !== 'employer' || job.isDirectPosting === false) {
    res.status(400);
    throw new Error('This listing is external. Apply through the official employer career site.');
  }

  // Check if job is expired
  if (job.expiryDate && new Date() > new Date(job.expiryDate)) {
    res.status(400);
    throw new Error('This job posting has expired');
  }

  // Check if user already applied
  const existingApplication = await Application.findOne({
    job: jobId,
    applicant: req.user._id
  });

  if (existingApplication) {
    res.status(400);
    throw new Error('You have already applied for this job');
  }

  const applicant = await User.findById(req.user._id);
  if (!applicant || applicant.role !== 'job_seeker') {
    res.status(403);
    throw new Error('Only job seekers can apply for jobs.');
  }
  if (!req.file && !applicant.resumeUrl) {
    res.status(400);
    throw new Error('Upload a resume to your profile or attach one to this application.');
  }

  let resumeUrl = applicant.resumeUrl;
  let resumePublicId;
  try {
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'jobbridge/application-resumes', resource_type: 'raw' },
          (error, uploaded) => (error ? reject(error) : resolve(uploaded)),
        );
        stream.end(req.file.buffer);
      });
      resumeUrl = result.secure_url;
      resumePublicId = result.public_id;
    }

    const application = await Application.create({
      job: jobId,
      applicant: req.user._id,
      coverLetter: coverLetter || '',
      resumeUrl,
      resumePublicId,
    });

    await application.populate('job', 'title companyName location');
    await application.populate('applicant', 'name email phone country bio skills education experience');

    let notificationSent = false;
    const employer = await User.findById(job.postedBy).select('name email');
    const recipient = job.applicationEmail || employer?.email;
    try {
      if (!employer?.email && !job.applicationEmail) {
        throw new Error('No employer notification email is available.');
      }
      await sendEmployerApplicationNotification({
        recipient,
        job,
        applicant,
        application,
      });
      notificationSent = true;
    } catch (notificationError) {
      console.error(`Application ${application._id} saved, but employer email failed:`, notificationError.message);
    }

    res.status(201).json({
      message: 'Application submitted successfully',
      application,
      notificationSent,
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      throw new Error('You have already applied for this job.');
    }
    if (error.statusCode) res.status(error.statusCode);
    else res.status(500);
    throw new Error(error.message || 'Failed to submit application. Please try again.');
  }
});

// @desc    Get user's applications
// @route   GET /api/applications/my-applications
// @access  Private
export const getMyApplications = asyncHandler(async (req, res) => {
  const applications = await Application.find({ applicant: req.user._id })
    .populate('job', 'title companyName location jobType salaryRange expiryDate')
    .sort('-createdAt');

  res.status(200).json(applications);
});

// @desc    Get applications for a specific job (Employer only)
// @route   GET /api/applications/job/:jobId
// @access  Private (Employer)
export const getJobApplications = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  // Check if job exists and belongs to the employer
  const job = await Job.findById(jobId);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  if (job.postedBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to view applications for this job');
  }

  const applications = await Application.find({ job: jobId })
    .populate('applicant', 'name email phone country bio skills education experience resumeUrl')
    .sort('-createdAt');

  res.status(200).json(applications);
});

// @desc    Update application status (Employer only)
// @route   PUT /api/applications/:id/status
// @access  Private (Employer)
export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  const validStatuses = ['pending', 'reviewed', 'shortlisted', 'rejected', 'accepted'];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error('Invalid status');
  }

  const application = await Application.findById(id).populate('job');
  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  // Check if employer owns the job
  if (application.job.postedBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this application');
  }

  application.status = status;
  await application.save();

  res.status(200).json({
    message: 'Application status updated',
    application
  });
});

// @desc    Delete application
// @route   DELETE /api/applications/:id
// @access  Private
export const deleteApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);

  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  // Only applicant can delete their own application
  if (application.applicant.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this application');
  }

  // Delete resume from Cloudinary
  if (application.resumePublicId) {
    try {
      await cloudinary.uploader.destroy(application.resumePublicId, { resource_type: 'raw' });
    } catch (error) {
      console.error('Error deleting resume from Cloudinary:', error);
    }
  }

  await Application.findByIdAndDelete(req.params.id);

  res.status(200).json({ message: 'Application deleted successfully' });
});

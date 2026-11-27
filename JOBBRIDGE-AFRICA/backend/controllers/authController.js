import asyncHandler from 'express-async-handler';
import { createHash, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';
import cloudinary from '../config/cloudinary.js';
import {
  createPasswordResetUrl,
  isEmailConfigured,
  sendEmailVerification,
  sendPasswordResetEmail,
} from '../services/emailService.js';
import Application from '../models/Application.js';
import CvUsage from '../models/CvUsage.js';
import ExternalApplication from '../models/ExternalApplication.js';
import JobAlert from '../models/JobAlert.js';
import JobOutboundClick from '../models/JobOutboundClick.js';
import JobReport from '../models/JobReport.js';
import TailoredCv from '../models/TailoredCv.js';

const clearAuthCookie = (res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
};

const deleteCloudinaryAssets = async (assets) => {
  const uniqueAssets = [...new Map(
    assets
      .filter(({ publicId }) => publicId)
      .map((asset) => [`${asset.resourceType}:${asset.publicId}`, asset]),
  ).values()];
  const deletions = await Promise.allSettled(uniqueAssets.map(async ({ publicId, resourceType }) => {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    if (!['ok', 'not found'].includes(result.result)) {
      throw new Error('Cloudinary did not confirm asset deletion.');
    }
  }));
  if (deletions.some((deletion) => deletion.status === 'rejected')) {
    throw new Error('Some account files could not be removed from storage.');
  }
};

export const registerUser = asyncHandler(async (req, res) => {
  const {
    name, email, password, role, companyName, country, phone, bio,
    skills, education, experience, termsAccepted, privacyAccepted,
  } = req.body;

  if (!name || !email || !password || !role) {
    res.status(400);
    throw new Error('Please fill in all required fields.');
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    res.status(400);
    throw new Error('Password must be between 8 and 128 characters.');
  }
  if (termsAccepted !== true || privacyAccepted !== true) {
    res.status(400);
    throw new Error('Accept the Terms of Use and Privacy Policy to create an account.');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  if (!['job_seeker', 'employer'].includes(role)) {
    res.status(400);
    throw new Error('Choose a valid account type.');
  }

  const verificationToken = randomBytes(32).toString('hex');
  const acceptedAt = new Date();
  const user = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    role,
    emailVerified: false,
    emailVerificationToken: createHash('sha256').update(verificationToken).digest('hex'),
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    termsAcceptedAt: acceptedAt,
    privacyAcceptedAt: acceptedAt,
    companyName,
    ...(role === 'job_seeker' && {
      country,
      phone,
      bio,
      skills: Array.isArray(skills) ? skills.slice(0, 100) : [],
      education: Array.isArray(education) ? education.slice(0, 20) : [],
      experience: Array.isArray(experience) ? experience.slice(0, 20) : [],
    }),
  });

  if (user) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = new URL(`/verify-email/${verificationToken}`, frontendUrl).toString();
    try {
      await sendEmailVerification({
        recipient: user.email,
        name: user.name,
        verificationUrl,
      });
    } catch (error) {
      console.error('Email verification delivery failed:', error.message);
      return res.status(503).json({
        message: 'Your account was created, but the verification email could not be sent. Request a new email when delivery is available.',
      });
    }
    res.status(201).json({
      message: 'Account created. Check your email for a verification link to finish registration.',
      verificationRequired: true,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data received');
  }
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').trim().toLowerCase() });

  if (user && await user.matchPassword(password)) {
    if (user.emailVerified === false) {
      res.status(403);
      throw new Error('Verify your email before signing in. You can request a new verification email.');
    }
    generateToken(res, user._id);
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
    res.status(400);
    throw new Error('This verification link is invalid or has expired.');
  }
  const hashedToken = createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpires');
  if (!user) {
    res.status(400);
    throw new Error('This verification link is invalid or has expired.');
  }
  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
  res.json({ message: 'Your email is verified. You can now sign in.' });
});

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400);
    throw new Error('Enter a valid email address.');
  }
  const genericMessage = 'If an unverified account exists for that email, a verification link will be sent.';
  const user = await User.findOne({ email }).select('+emailVerificationToken +emailVerificationExpires');
  if (!user) return res.json({ message: genericMessage, status: 'accepted' });
  if (user.emailVerified !== false) {
    return res.json({
      message: 'This email is already verified. You can sign in to your account.',
      status: 'already_verified',
    });
  }
  if (!isEmailConfigured()) {
    res.status(503);
    throw new Error('Email verification is temporarily unavailable. Please try again later.');
  }
  const token = randomBytes(32).toString('hex');
  user.emailVerificationToken = createHash('sha256').update(token).digest('hex');
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verificationUrl = new URL(`/verify-email/${token}`, frontendUrl).toString();
  try {
    await sendEmailVerification({ recipient: user.email, name: user.name, verificationUrl });
  } catch (error) {
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    console.error('Email verification resend failed:', error.message);
    res.status(503);
    throw new Error('We could not deliver the verification email. Check the email service configuration or try again later.');
  }
  res.json({
    message: 'Verification email sent. Check your inbox and spam folder for the link.',
    status: 'sent',
  });
});

export const googleAuth = asyncHandler(async (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    res.status(503);
    throw new Error('Google sign-in is not configured.');
  }
  const credential = req.body?.credential;
  if (typeof credential !== 'string' || credential.length > 10000) {
    res.status(400);
    throw new Error('A valid Google credential is required.');
  }
  let payload;
  try {
    const ticket = await new OAuth2Client().verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    res.status(401);
    throw new Error('Google sign-in could not verify this account.');
  }
  if (!payload?.email || payload.email_verified !== true) {
    res.status(401);
    throw new Error('Google must verify your email address before sign-in.');
  }

  const email = payload.email.trim().toLowerCase();
  let user = await User.findOne({ email }).select('+password');
  if (!user) {
    const { role, companyName, termsAccepted, privacyAccepted } = req.body;
    if (!['job_seeker', 'employer'].includes(role)) {
      res.status(400);
      throw new Error('Choose a valid account type.');
    }
    if (termsAccepted !== true || privacyAccepted !== true) {
      res.status(400);
      throw new Error('Accept the Terms of Use and Privacy Policy to create an account.');
    }
    if (role === 'employer' && !String(companyName || '').trim()) {
      res.status(400);
      throw new Error('Company name is required for employer accounts.');
    }
    const acceptedAt = new Date();
    user = await User.create({
      name: payload.name || email,
      email,
      password: randomBytes(48).toString('hex'),
      role,
      companyName: role === 'employer' ? String(companyName).trim() : undefined,
      emailVerified: true,
      termsAcceptedAt: acceptedAt,
      privacyAcceptedAt: acceptedAt,
    });
  } else if (user.emailVerified === false) {
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
  }

  generateToken(res, user._id);
  res.status(200).json({ _id: user._id, name: user.name, email: user.email, role: user.role });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400);
    throw new Error('Enter a valid email address.');
  }

  if (!isEmailConfigured()) {
    return res.status(503).json({
      message: 'Password reset email is temporarily unavailable. Please try again later.',
    });
  }

  const user = await User.findOne({ email });
  if (user) {
    const resetToken = randomBytes(32).toString('hex');
    user.passwordResetToken = createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    try {
      await sendPasswordResetEmail({
        recipient: user.email,
        name: user.name,
        resetUrl: createPasswordResetUrl(resetToken),
      });
    } catch (error) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      console.error('Password reset email delivery failed:', error.message);
      return res.status(503).json({
        message: 'We could not send the password reset email right now. Please try again later.',
      });
    }
  }

  res.status(200).json({
    message: 'If an account exists for that email, password reset instructions will be sent shortly.',
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const password = req.body?.password;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
    res.status(400);
    throw new Error('This password reset link is invalid or has expired.');
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    res.status(400);
    throw new Error('Your new password must be between 8 and 128 characters long.');
  }

  const hashedToken = createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');
  if (!user) {
    res.status(400);
    throw new Error('This password reset link is invalid or has expired.');
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  res.status(200).json({ message: 'Your password has been reset. You can now sign in.' });
});

export const logoutUser = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  res.status(200).json({ message: 'Logged out successfully' });
});

export const getUserProfile = asyncHandler(async (req, res) => {
  if (req.user) {
    res.status(200).json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      country: req.user.country,
      phone: req.user.phone,
      bio: req.user.bio,
      resumeUrl: req.user.resumeUrl,
      resumePublicId: req.user.resumePublicId,
      profileImageUrl: req.user.profileImageUrl,
      profileImagePublicId: req.user.profileImagePublicId,
      companyName: req.user.companyName,
      education: req.user.education,
      experience: req.user.experience,
      skills: req.user.skills,
      skillGroups: req.user.skillGroups,
      certifications: req.user.certifications,
      projects: req.user.projects,
      workPreferences: req.user.workPreferences,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.country = req.body.country || user.country;
    user.phone = req.body.phone ?? user.phone;
    user.bio = req.body.bio ?? user.bio;
    user.resumeUrl = req.body.resumeUrl || user.resumeUrl;
    user.profileImageUrl = req.body.profileImageUrl || user.profileImageUrl;
    user.profileImagePublicId = req.body.profileImagePublicId || user.profileImagePublicId;
    
    if (req.body.education !== undefined) user.education = req.body.education;
    if (req.body.experience !== undefined) user.experience = req.body.experience;
    if (req.body.skills !== undefined) user.skills = req.body.skills;
    if (req.body.skillGroups !== undefined) user.skillGroups = req.body.skillGroups;
    if (req.body.certifications !== undefined) user.certifications = req.body.certifications;
    if (req.body.projects !== undefined) user.projects = req.body.projects;
    if (req.body.workPreferences !== undefined) user.workPreferences = req.body.workPreferences;
    
    if (user.role === 'employer') {
      user.companyName = req.body.companyName || user.companyName;
    }

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      country: updatedUser.country,
      phone: updatedUser.phone,
      bio: updatedUser.bio,
      resumeUrl: updatedUser.resumeUrl,
      resumePublicId: updatedUser.resumePublicId,
      profileImageUrl: updatedUser.profileImageUrl,
      profileImagePublicId: updatedUser.profileImagePublicId,
      companyName: updatedUser.companyName,
      education: updatedUser.education,
      experience: updatedUser.experience,
      skills: updatedUser.skills,
      skillGroups: updatedUser.skillGroups,
      certifications: updatedUser.certifications,
      projects: updatedUser.projects,
      workPreferences: updatedUser.workPreferences,
    });

  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

export const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Choose a resume file to upload.');
  }

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'jobbridge/resumes', resource_type: 'raw' },
      (error, uploaded) => (error ? reject(error) : resolve(uploaded)),
    );
    stream.end(req.file.buffer);
  });

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  const previousPublicId = user.resumePublicId;
  user.resumeUrl = result.secure_url;
  user.resumePublicId = result.public_id;
  await user.save();

  if (previousPublicId) {
    try {
      await cloudinary.uploader.destroy(previousPublicId, { resource_type: 'raw' });
    } catch (error) {
      console.error('Could not remove previous resume from Cloudinary:', error.message);
    }
  }

  res.status(200).json({
    resumeUrl: user.resumeUrl,
    resumePublicId: user.resumePublicId,
    message: 'Resume uploaded successfully.',
  });
});

export const deleteMyCvData = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found.');
  }

  const applications = await Application.find({ applicant: user._id }).select('resumePublicId');
  try {
    await deleteCloudinaryAssets([
      user.resumePublicId && { publicId: user.resumePublicId, resourceType: 'raw' },
      ...applications.map((application) => (
        application.resumePublicId && { publicId: application.resumePublicId, resourceType: 'raw' }
      )),
    ].filter(Boolean));
  } catch {
    res.status(502);
    throw new Error('Some CV files could not be removed from storage. Please retry or contact support.');
  }

  const deletedAt = new Date();
  await Promise.all([
    User.updateOne(
      { _id: user._id },
      { $unset: { resumeUrl: '', resumePublicId: '' } },
    ),
    Application.updateMany(
      { applicant: user._id },
      {
        $set: { resumeUrl: '', resumeDeletedAt: deletedAt },
        $unset: { resumePublicId: '' },
      },
    ),
    TailoredCv.deleteMany({ applicant: user._id }),
    Application.updateMany(
      { applicant: user._id, tailoredCv: { $exists: true } },
      { $set: { tailoredCvDeletedAt: deletedAt }, $unset: { tailoredCv: '' } },
    ),
  ]);
  res.status(200).json({
    message: 'Your saved profile CV, application CV files, and tailored CV versions were removed from JobBridge-managed storage.',
  });
});

export const deleteMyAccount = asyncHandler(async (req, res) => {
  if (req.user.role !== 'job_seeker') {
    res.status(403);
    throw new Error('Only job seeker accounts can be deleted here.');
  }

  const user = await User.findById(req.user._id);
  if (!user || user.accountDeletedAt) {
    res.status(404);
    throw new Error('User not found.');
  }

  const applications = await Application.find({ applicant: user._id }).select('resumePublicId');
  try {
    await deleteCloudinaryAssets([
      user.profileImagePublicId && { publicId: user.profileImagePublicId, resourceType: 'image' },
      user.resumePublicId && { publicId: user.resumePublicId, resourceType: 'raw' },
      ...applications.map((application) => (
        application.resumePublicId && { publicId: application.resumePublicId, resourceType: 'raw' }
      )),
    ].filter(Boolean));
  } catch {
    res.status(502);
    throw new Error('Some account files could not be removed from storage. Please retry or contact support.');
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const currentUser = await User.findById(user._id).session(session);
      if (!currentUser || currentUser.accountDeletedAt) {
        res.status(404);
        throw new Error('User not found.');
      }

      const deletedAt = new Date();
      const [anonymizedApplicant] = await User.create([{
        name: 'Deleted account',
        email: `deleted-${currentUser._id}-${randomBytes(8).toString('hex')}@deleted.invalid`,
        password: randomBytes(32).toString('hex'),
        emailVerified: false,
        role: 'job_seeker',
        accountDeletedAt: deletedAt,
      }], { session });

      await Application.updateMany(
        { applicant: currentUser._id },
        {
          $set: {
            applicant: anonymizedApplicant._id,
            coverLetter: '',
            resumeUrl: '',
            resumeDeletedAt: deletedAt,
            tailoredCvDeletedAt: deletedAt,
          },
          $unset: { resumePublicId: '', tailoredCv: '' },
        },
        { session },
      );
      await TailoredCv.deleteMany({ applicant: currentUser._id }, { session });
      await ExternalApplication.deleteMany({ applicant: currentUser._id }, { session });
      await JobOutboundClick.updateMany(
        { userId: currentUser._id },
        { $set: { userId: null } },
        { session },
      );
      await JobAlert.deleteMany({ email: currentUser.email.toLowerCase() }, { session });
      await JobReport.updateMany(
        { email: currentUser.email.toLowerCase() },
        { $set: { email: '' } },
        { session },
      );
      const identityHash = createHash('sha256').update(`user:${currentUser._id}`).digest('hex');
      await CvUsage.deleteMany({ identityHash }, { session });

      const deletion = await User.deleteOne({ _id: currentUser._id }, { session });
      if (deletion.deletedCount !== 1) {
        res.status(409);
        throw new Error('Your account could not be deleted. Please try again.');
      }
    });
  } finally {
    await session.endSession();
  }

  clearAuthCookie(res);
  res.status(200).json({
    message: 'Your account has been deleted. Submitted application history was retained in anonymized form.',
  });
});

export const uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No image file provided');
  }

  try {
    // Delete old profile image from Cloudinary if it exists
    if (req.user.profileImagePublicId) {
      await cloudinary.uploader.destroy(req.user.profileImagePublicId);
    }

    // Upload new image to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'jobbridge/profile-images',
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    res.status(200).json({
      profileImageUrl: result.secure_url,
      profileImagePublicId: result.public_id,
      message: 'Profile image uploaded successfully',
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500);
    throw new Error('Failed to upload image to cloud storage');
  }
});

// One-time bootstrap: promote a user to admin securely
// Only works if no admin exists and token matches env ADMIN_SETUP_TOKEN
export const bootstrapAdmin = asyncHandler(async (req, res) => {
  const token = (req.body?.token || req.query?.token || '').trim();
  const email = (req.body?.email || req.query?.email || '').trim().toLowerCase();

  if (!process.env.ADMIN_SETUP_TOKEN) {
    res.status(500);
    throw new Error('ADMIN_SETUP_TOKEN not configured');
  }
  if (!token || token !== process.env.ADMIN_SETUP_TOKEN) {
    res.status(403);
    throw new Error('Invalid setup token');
  }
  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    res.status(400);
    throw new Error('An admin already exists');
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.role = 'admin';
  await user.save();

  res.json({
    success: true,
    message: 'User promoted to admin',
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

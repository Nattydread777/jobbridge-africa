import asyncHandler from 'express-async-handler';
import { createHash, randomBytes } from 'node:crypto';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';
import cloudinary from '../config/cloudinary.js';
import { isEmailConfigured, sendPasswordResetEmail } from '../services/emailService.js';

export const registerUser = asyncHandler(async (req, res) => {
  const {
    name, email, password, role, companyName, country, phone, bio,
    skills, education, experience,
  } = req.body;

  if (!name || !email || !password || !role) {
    res.status(400);
    throw new Error('Please fill in all required fields.');
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

  const user = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    role,
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
    generateToken(res, user._id);
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      country: user.country,
      phone: user.phone,
      bio: user.bio,
      skills: user.skills,
      education: user.education,
      experience: user.experience,
      resumeUrl: user.resumeUrl,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data received');
  }
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && await user.matchPassword(password)) {
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
      const frontendUrl = process.env.FRONTEND_URL
        || process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).find(Boolean)
        || 'http://localhost:5173';
      const resetUrl = new URL(`/reset-password/${resetToken}`, frontendUrl).toString();
      await sendPasswordResetEmail({
        recipient: user.email,
        name: user.name,
        resetUrl,
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
  res.cookie('jwt', '', { httpOnly: true, expires: new Date(0) });
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

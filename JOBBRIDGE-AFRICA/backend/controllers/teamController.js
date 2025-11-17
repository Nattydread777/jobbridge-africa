import asyncHandler from 'express-async-handler';
import TeamMember from '../models/TeamMember.js';
import cloudinary from '../config/cloudinary.js';

// @desc    Get all active team members
// @route   GET /api/team
// @access  Public
export const getTeamMembers = asyncHandler(async (req, res) => {
  const teamMembers = await TeamMember.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
  res.json(teamMembers);
});

// @desc    Get single team member
// @route   GET /api/team/:id
// @access  Public
export const getTeamMemberById = asyncHandler(async (req, res) => {
  const teamMember = await TeamMember.findById(req.params.id);
  
  if (!teamMember) {
    res.status(404);
    throw new Error('Team member not found');
  }
  
  res.json(teamMember);
});

// @desc    Create team member
// @route   POST /api/team
// @access  Private/Admin
export const createTeamMember = asyncHandler(async (req, res) => {
  const { name, role, bio, linkedIn, github, twitter, order } = req.body;
  
  if (!name || !role) {
    res.status(400);
    throw new Error('Please provide name and role');
  }

  let photoUrl = '';
  
  // Handle photo upload if provided
  if (req.file) {
    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'jobbridge/team',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' }
        ]
      });
      photoUrl = result.secure_url;
    } catch (error) {
      res.status(500);
      throw new Error('Photo upload failed');
    }
  }

  const teamMember = await TeamMember.create({
    name,
    role,
    bio,
    photoUrl,
    linkedIn,
    github,
    twitter,
    order: order || 0,
  });

  res.status(201).json(teamMember);
});

// @desc    Update team member
// @route   PUT /api/team/:id
// @access  Private/Admin
export const updateTeamMember = asyncHandler(async (req, res) => {
  const { name, role, bio, linkedIn, github, twitter, order, isActive } = req.body;
  
  const teamMember = await TeamMember.findById(req.params.id);
  
  if (!teamMember) {
    res.status(404);
    throw new Error('Team member not found');
  }

  // Update photo if new one uploaded
  if (req.file) {
    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'jobbridge/team',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' }
        ]
      });
      teamMember.photoUrl = result.secure_url;
    } catch (error) {
      res.status(500);
      throw new Error('Photo upload failed');
    }
  }

  // Update other fields
  teamMember.name = name || teamMember.name;
  teamMember.role = role || teamMember.role;
  teamMember.bio = bio !== undefined ? bio : teamMember.bio;
  teamMember.linkedIn = linkedIn !== undefined ? linkedIn : teamMember.linkedIn;
  teamMember.github = github !== undefined ? github : teamMember.github;
  teamMember.twitter = twitter !== undefined ? twitter : teamMember.twitter;
  teamMember.order = order !== undefined ? order : teamMember.order;
  teamMember.isActive = isActive !== undefined ? isActive : teamMember.isActive;

  const updated = await teamMember.save();
  res.json(updated);
});

// @desc    Delete team member
// @route   DELETE /api/team/:id
// @access  Private/Admin
export const deleteTeamMember = asyncHandler(async (req, res) => {
  const teamMember = await TeamMember.findById(req.params.id);
  
  if (!teamMember) {
    res.status(404);
    throw new Error('Team member not found');
  }

  await teamMember.deleteOne();
  res.json({ message: 'Team member removed' });
});

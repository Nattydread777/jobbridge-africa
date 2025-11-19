import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}, 'name email role createdAt');
  res.json(users);
});

// @desc    Update user role (admin only)
// @route   PUT /api/users/:id/role
// @access  Private/Admin
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!role || !['job_seeker', 'employer', 'admin'].includes(role)) {
    res.status(400);
    throw new Error('Invalid role');
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  user.role = role;
  await user.save();
  res.json({ message: 'User role updated', user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
});

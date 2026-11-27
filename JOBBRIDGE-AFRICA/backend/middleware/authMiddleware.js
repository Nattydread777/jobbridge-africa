import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';

export const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error('Not authorized, token failed');
  }
  const user = await User.findById(decoded.userId).select('-password +accountDeletedAt');
  if (!user || user.accountDeletedAt) {
    res.status(401);
    throw new Error('Not authorized, account unavailable');
  }
  req.user = user;
  return next();
});

export const optionalProtect = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.jwt;
  if (!token) return next();

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next();
    }
    throw error;
  }
  const user = await User.findById(decoded.userId).select('-password +accountDeletedAt');
  if (!user || user.accountDeletedAt) return next();
  req.user = user;
  return next();
});

export const employer = (req, res, next) => {
  if (req.user && req.user.role === 'employer') {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized: Requires Employer access');
  }
};

export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized: Requires Admin access');
  }
};

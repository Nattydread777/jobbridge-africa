import { createHash, timingSafeEqual } from 'node:crypto';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import User from '../models/userModel.js';

const configuredWebhookKeys = () => {
  if (!process.env.JOBBRIDGE_WEBHOOK_KEYS) return null;

  let keys;
  try {
    keys = JSON.parse(process.env.JOBBRIDGE_WEBHOOK_KEYS);
  } catch {
    throw new Error('JOBBRIDGE_WEBHOOK_KEYS must be a JSON object of SHA-256 key hashes to employer IDs.');
  }
  if (!keys || Array.isArray(keys) || typeof keys !== 'object') {
    throw new Error('JOBBRIDGE_WEBHOOK_KEYS must be a JSON object of SHA-256 key hashes to employer IDs.');
  }

  return Object.entries(keys).map(([keyHash, employerId]) => {
    if (!/^[a-f0-9]{64}$/i.test(keyHash)
      || typeof employerId !== 'string'
      || !mongoose.isValidObjectId(employerId)) {
      throw new Error('JOBBRIDGE_WEBHOOK_KEYS contains an invalid key hash or employer ID.');
    }
    return { keyHash: Buffer.from(keyHash, 'hex'), employerId };
  });
};

export const authenticateEmployerWebhook = asyncHandler(async (req, res, next) => {
  let configuredKeys;
  try {
    configuredKeys = configuredWebhookKeys();
  } catch (error) {
    console.error('Employer webhook configuration error:', error.message);
    return res.status(503).json({ message: 'Employer webhook authentication is not configured correctly.' });
  }
  if (!configuredKeys?.length) {
    return res.status(503).json({ message: 'Employer webhook authentication is not configured.' });
  }

  const apiKey = req.get('X-JobBridge-API-Key');
  if (!apiKey) return res.status(401).json({ message: 'A valid X-JobBridge-API-Key header is required.' });

  const suppliedHash = createHash('sha256').update(apiKey).digest();
  const matchingKeys = configuredKeys.filter(({ keyHash }) =>
    timingSafeEqual(suppliedHash, keyHash),
  );
  if (matchingKeys.length !== 1) {
    return res.status(401).json({ message: 'Invalid webhook API key.' });
  }

  const employerUser = await User.findOne({
    _id: matchingKeys[0].employerId,
    role: 'employer',
  }).select('-password');
  if (!employerUser) {
    return res.status(401).json({ message: 'The webhook API key is not associated with an active employer account.' });
  }

  req.user = employerUser;
  return next();
});

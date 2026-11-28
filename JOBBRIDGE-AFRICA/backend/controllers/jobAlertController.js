import asyncHandler from 'express-async-handler';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import JobAlert from '../models/JobAlert.js';
import User from '../models/userModel.js';

const ALERT_FREQUENCIES = ['instant', 'daily', 'weekly'];

const optionalText = (value, label, maxLength, res) => {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    res.status(400);
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
  return value.trim();
};

export const subscribeToJobAlerts = asyncHandler(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    res.status(400);
    throw new Error('Enter a valid email address.');
  }
  if (req.body?.consent !== true) {
    res.status(400);
    throw new Error('Consent is required to receive job alert emails.');
  }
  const remoteValue = req.body?.remote;
  let remote = null;
  if (remoteValue !== undefined && remoteValue !== null && remoteValue !== '') {
    if (remoteValue === true || remoteValue === 'true') remote = true;
    else if (remoteValue === false || remoteValue === 'false') remote = false;
    else {
      res.status(400);
      throw new Error('Remote preference must be true or false.');
    }
  }
  const values = {
    keyword: optionalText(req.body?.keyword, 'Keyword', 120, res),
    location: optionalText(req.body?.location, 'Location', 120, res),
    jobType: optionalText(req.body?.jobType, 'Job type', 40, res),
    category: optionalText(req.body?.category, 'Category', 80, res),
  };
  const subscription = await JobAlert.findOneAndUpdate(
    { email },
    {
      $set: { ...values, remote, consentedAt: new Date(), isActive: true },
      $setOnInsert: { email },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  res.status(200).json({
    message: 'Your job alert preferences have been saved. Contact JobBridge Africa to unsubscribe.',
    subscription: { email: subscription.email, filters: values },
  });
});

export const getJobDigestPreferences = asyncHandler(async (req, res) => {
  const newsletterSubscription = await JobAlert.findOne({ email: req.user.email });
  res.json({
    enabled: Boolean(req.user.jobAlertPreferences?.enabled),
    frequency: req.user.jobAlertPreferences?.frequency || 'daily',
    newsletterEnabled: Boolean(
      req.user.newsletterPreferences?.enabled || newsletterSubscription?.isActive,
    ),
  });
});

export const updateJobDigestPreferences = asyncHandler(async (req, res) => {
  const { enabled, frequency, newsletterEnabled } = req.body || {};
  if (typeof enabled !== 'boolean') {
    res.status(400);
    throw new Error('Choose whether to receive personalized email job alerts.');
  }
  if (newsletterEnabled !== undefined && typeof newsletterEnabled !== 'boolean') {
    res.status(400);
    throw new Error('Choose whether to receive the general job newsletter.');
  }
  if (!ALERT_FREQUENCIES.includes(frequency)) {
    res.status(400);
    throw new Error('Choose an alert frequency: instant, daily, or weekly.');
  }
  if ((enabled || newsletterEnabled) && req.user.role !== 'job_seeker') {
    res.status(403);
    throw new Error('Job seeker email preferences are available to job seeker accounts.');
  }
  if ((enabled || newsletterEnabled) && req.user.emailVerified !== true) {
    res.status(403);
    throw new Error('Verify your email before enabling job email preferences.');
  }

  const user = await User.findById(req.user._id).select('-password +jobAlertPreferences.unsubscribeVersion');
  if (!user) {
    res.status(404);
    throw new Error('User not found.');
  }
  const wasEnabled = user.jobAlertPreferences.enabled;
  user.jobAlertPreferences.enabled = enabled;
  user.jobAlertPreferences.frequency = frequency;
  if (enabled !== wasEnabled || (enabled && !user.jobAlertPreferences.unsubscribeVersion)) {
    user.jobAlertPreferences.unsubscribeVersion = randomBytes(24).toString('hex');
  }
  user.jobAlertPreferences.unsubscribedAt = enabled ? undefined : new Date();
  if (newsletterEnabled !== undefined) {
    user.newsletterPreferences.enabled = newsletterEnabled;
    user.newsletterPreferences.subscribedAt = newsletterEnabled ? new Date() : undefined;
    user.newsletterPreferences.unsubscribedAt = newsletterEnabled ? undefined : new Date();
  }
  await user.save();

  if (newsletterEnabled === true) {
    const email = user.email.trim().toLowerCase();
    const consentedAt = new Date();
    await JobAlert.findOneAndUpdate(
      { email },
      {
        $set: { isActive: true, consentedAt },
        $setOnInsert: { email },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  } else if (newsletterEnabled === false) {
    await JobAlert.updateOne(
      { email: user.email.trim().toLowerCase() },
      { $set: { isActive: false } },
    );
  }

  res.json({
    message: 'Your job alert and newsletter preferences have been saved.',
    preferences: {
      enabled,
      frequency,
      newsletterEnabled: Boolean(user.newsletterPreferences.enabled),
    },
  });
});

export const unsubscribeFromJobDigests = asyncHandler(async (req, res) => {
  const token = typeof req.body?.token === 'string'
    ? req.body.token
    : typeof req.query?.token === 'string'
      ? req.query.token
      : '';
  if (!token || token.length > 2000) {
    res.status(400);
    throw new Error('A valid unsubscribe link is required.');
  }

  let payload;
  try {
    payload = jwt.verify(
      token,
      process.env.JOB_ALERT_UNSUBSCRIBE_SECRET || process.env.JWT_SECRET,
    );
  } catch {
    res.status(400);
    throw new Error('This unsubscribe link is invalid or has expired.');
  }
  if (payload?.purpose !== 'job-alert-unsubscribe' || !payload.sub || !payload.version) {
    res.status(400);
    throw new Error('This unsubscribe link is invalid or has expired.');
  }

  const user = await User.findById(payload.sub).select('-password +jobAlertPreferences.unsubscribeVersion');
  if (!user
    || user.jobAlertPreferences?.enabled !== true
    || user.jobAlertPreferences.unsubscribeVersion !== payload.version) {
    res.status(400);
    throw new Error('This unsubscribe link is invalid or has already been used.');
  }
  user.jobAlertPreferences.enabled = false;
  user.jobAlertPreferences.unsubscribedAt = new Date();
  user.jobAlertPreferences.unsubscribeVersion = randomBytes(24).toString('hex');
  await user.save();
  res.json({
    message: 'You have been unsubscribed from personalized job alert emails.',
    preferences: { enabled: false },
  });
});

import asyncHandler from 'express-async-handler';
import JobAlert from '../models/JobAlert.js';

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

import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import Job from '../models/Job.js';
import JobDigestDelivery from '../models/JobDigestDelivery.js';
import User from '../models/userModel.js';
import { getFrontendBaseUrl, sendJobDigestEmail } from './emailService.js';
import { rankJobsForUser, isRecommendationProfileReady } from './jobRecommendationService.js';
import { buildActiveJobFilter } from '../utils/jobFilters.js';
import { buildRegionRestrictedJobFilter } from '../utils/jobSignals.js';

const DIGEST_INTERVAL_MS = 15 * 60 * 1000;
const LOCK_DURATION_MS = 10 * 60 * 1000;
const frequencyIntervals = {
  instant: DIGEST_INTERVAL_MS,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

const privateUserFields = [
  '-password',
  '+jobAlertPreferences.unsubscribeVersion',
  '+jobAlertPreferences.lastDigestAt',
  '+jobAlertPreferences.lastDigestCheckAt',
  '+jobAlertPreferences.welcomeDigestSentAt',
  '+jobAlertPreferences.digestLockToken',
  '+jobAlertPreferences.digestLockUntil',
].join(' ');

export const isDigestDue = (preferences, now = new Date(), forceWelcome = false) => {
  if (forceWelcome && !preferences?.welcomeDigestSentAt) return true;
  const frequency = preferences?.frequency || 'daily';
  const interval = frequencyIntervals[frequency] || frequencyIntervals.daily;
  const lastCheckedAt = preferences?.lastDigestAt || preferences?.lastDigestCheckAt;
  const lastCheckedMilliseconds = new Date(lastCheckedAt).getTime();
  return !lastCheckedAt
    || Number.isNaN(lastCheckedMilliseconds)
    || now.getTime() - lastCheckedMilliseconds >= interval;
};

export const createUnsubscribeToken = (user) => {
  const preferences = user.jobAlertPreferences || {};
  const version = preferences.unsubscribeVersion;
  if (!version) throw new Error('Job alert unsubscribe version is missing.');
  return jwt.sign(
    { purpose: 'job-alert-unsubscribe', version },
    process.env.JOB_ALERT_UNSUBSCRIBE_SECRET || process.env.JWT_SECRET,
    { subject: String(user._id) },
  );
};

const createUnsubscribeUrl = (user) => {
  const token = createUnsubscribeToken(user);
  const url = new URL('/unsubscribe-job-alerts', getFrontendBaseUrl());
  url.searchParams.set('token', token);
  return url.toString();
};

const recommendationJobsFor = async (user) => {
  const jobs = await Job.find({
    $and: [
      buildActiveJobFilter(),
      { $nor: [buildRegionRestrictedJobFilter()] },
    ],
  }).sort({ lastSeenAt: -1, createdAt: -1 }).limit(200);
  return rankJobsForUser(user, jobs).slice(0, 20);
};

const claimDigestLock = async (userId, lockToken, now) => User.findOneAndUpdate(
  {
    _id: userId,
    role: 'job_seeker',
    emailVerified: true,
    'jobAlertPreferences.enabled': true,
    $or: [
      { 'jobAlertPreferences.digestLockUntil': { $exists: false } },
      { 'jobAlertPreferences.digestLockUntil': null },
      { 'jobAlertPreferences.digestLockUntil': { $lt: now } },
    ],
  },
  {
    $set: {
      'jobAlertPreferences.digestLockToken': lockToken,
      'jobAlertPreferences.digestLockUntil': new Date(now.getTime() + LOCK_DURATION_MS),
    },
  },
  { new: true },
).select(privateUserFields);

const releaseDigestLock = async (userId, lockToken, updates = {}) => {
  await User.updateOne(
    { _id: userId, 'jobAlertPreferences.digestLockToken': lockToken },
    {
      $set: {
        ...updates,
        'jobAlertPreferences.digestLockToken': null,
        'jobAlertPreferences.digestLockUntil': null,
      },
    },
  );
};

const loadEligibleDigestJobs = async (user, matches, now) => {
  const jobIds = matches.map(({ job }) => job._id);
  const deliveries = await JobDigestDelivery.find({
    userId: user._id,
    jobId: { $in: jobIds },
  }).select('jobId status nextAttemptAt updatedAt attempts');
  const byJobId = new Map(deliveries.map((delivery) => [String(delivery.jobId), delivery]));
  return matches.filter(({ job }) => {
    const delivery = byJobId.get(String(job._id));
    if (!delivery) return true;
    if (delivery.status === 'sent') return false;
    if (delivery.status === 'sending' && now.getTime() - delivery.updatedAt.getTime() < LOCK_DURATION_MS) {
      return false;
    }
    return !delivery.nextAttemptAt || delivery.nextAttemptAt <= now;
  }).slice(0, 5);
};

const reserveDeliveries = async (user, jobs) => {
  if (!jobs.length) return;
  await JobDigestDelivery.bulkWrite(jobs.map(({ job, score }) => ({
    updateOne: {
      filter: { userId: user._id, jobId: job._id },
      update: {
        $set: {
          status: 'sending',
          frequency: user.jobAlertPreferences.frequency,
          matchScore: score,
          lastError: '',
          nextAttemptAt: null,
        },
        $setOnInsert: { userId: user._id, jobId: job._id },
        $inc: { attempts: 1 },
      },
      upsert: true,
    },
  })));
};

const markDeliveryFailure = async (user, jobs, error) => {
  const records = await JobDigestDelivery.find({
    userId: user._id,
    jobId: { $in: jobs.map(({ job }) => job._id) },
  }).select('jobId attempts');
  const attempts = new Map(records.map((record) => [String(record.jobId), record.attempts]));
  const now = new Date();
  await JobDigestDelivery.bulkWrite(jobs.map(({ job }) => {
    const delay = Math.min(7 * 24 * 60 * 60 * 1000, 60 * 60 * 1000 * (2 ** Math.max(0, (attempts.get(String(job._id)) || 1) - 1)));
    return {
      updateOne: {
        filter: { userId: user._id, jobId: job._id },
        update: {
          $set: {
            status: 'failed',
            lastError: String(error.message || 'Email delivery failed').slice(0, 500),
            nextAttemptAt: new Date(now.getTime() + delay),
          },
        },
      },
    };
  }));
};

export const deliverJobDigestForUser = async (userId, { forceWelcome = false } = {}) => {
  const user = await User.findById(userId).select(privateUserFields);
  if (!user || user.role !== 'job_seeker' || user.emailVerified !== true
    || !user.jobAlertPreferences?.enabled
    || !isRecommendationProfileReady(user)
    || !isDigestDue(user.jobAlertPreferences, new Date(), forceWelcome)) {
    return { sent: false, reason: 'not-due-or-not-eligible' };
  }

  const now = new Date();
  const lockToken = randomUUID();
  const lockedUser = await claimDigestLock(user._id, lockToken, now);
  if (!lockedUser) return { sent: false, reason: 'already-locked' };

  try {
    if (!lockedUser.jobAlertPreferences.unsubscribeVersion) {
      lockedUser.jobAlertPreferences.unsubscribeVersion = randomUUID().replace(/-/g, '');
      await lockedUser.save();
    }
    const matches = await recommendationJobsFor(lockedUser);
    const jobsToSend = await loadEligibleDigestJobs(lockedUser, matches, now);
    if (!jobsToSend.length) {
      await releaseDigestLock(lockedUser._id, lockToken, {
        'jobAlertPreferences.lastDigestCheckAt': now,
      });
      return { sent: false, reason: 'no-new-matches' };
    }

    const stillSubscribed = await User.exists({
      _id: lockedUser._id,
      'jobAlertPreferences.enabled': true,
      'jobAlertPreferences.unsubscribeVersion': lockedUser.jobAlertPreferences.unsubscribeVersion,
    });
    if (!stillSubscribed) {
      await releaseDigestLock(lockedUser._id, lockToken, {
        'jobAlertPreferences.lastDigestCheckAt': now,
      });
      return { sent: false, reason: 'preferences-changed' };
    }

    await reserveDeliveries(lockedUser, jobsToSend);
    const isWelcome = !lockedUser.jobAlertPreferences.welcomeDigestSentAt;
    try {
      await sendJobDigestEmail({
        recipient: lockedUser.email,
        name: lockedUser.name,
        jobs: jobsToSend,
        unsubscribeUrl: createUnsubscribeUrl(lockedUser),
        context: isWelcome
          ? 'Welcome to JobBridge Africa. These roles are a starting point based on the profile details you shared.'
          : 'New roles matching your profile and saved work preferences are now available.',
      });
    } catch (error) {
      await markDeliveryFailure(lockedUser, jobsToSend, error);
      console.error(`Job digest delivery failed for user ${lockedUser._id}:`, error.message);
      await releaseDigestLock(lockedUser._id, lockToken, {
        'jobAlertPreferences.lastDigestCheckAt': now,
      });
      return { sent: false, reason: 'delivery-failed' };
    }

    await JobDigestDelivery.updateMany(
      { userId: lockedUser._id, jobId: { $in: jobsToSend.map(({ job }) => job._id) } },
      { $set: { status: 'sent', sentAt: new Date(), nextAttemptAt: null, lastError: '' } },
    );
    await releaseDigestLock(lockedUser._id, lockToken, {
      'jobAlertPreferences.lastDigestAt': now,
      'jobAlertPreferences.lastDigestCheckAt': now,
      ...(isWelcome ? { 'jobAlertPreferences.welcomeDigestSentAt': now } : {}),
    });
    return { sent: true, count: jobsToSend.length };
  } catch (error) {
    await releaseDigestLock(lockedUser._id, lockToken, {
      'jobAlertPreferences.lastDigestCheckAt': now,
    });
    throw error;
  }
};

let schedulerRunning = false;

export const runScheduledJobDigests = async () => {
  if (schedulerRunning) return;
  schedulerRunning = true;
  try {
    const users = await User.find({
      role: 'job_seeker',
      emailVerified: true,
      'jobAlertPreferences.enabled': true,
    })
      .select('_id')
      .sort({ 'jobAlertPreferences.lastDigestCheckAt': 1 });
    for (const user of users) {
      try {
        await deliverJobDigestForUser(user._id);
      } catch (error) {
        console.error(`Scheduled job digest failed for user ${user._id}:`, error.message);
      }
    }
  } finally {
    schedulerRunning = false;
  }
};

export const scheduleJobDigests = () => {
  void runScheduledJobDigests().catch((error) => {
    console.error('Job digest scheduler failed:', error.message);
  });
  const timer = setInterval(() => {
    void runScheduledJobDigests().catch((error) => {
      console.error('Job digest scheduler failed:', error.message);
    });
  }, DIGEST_INTERVAL_MS);
  timer.unref?.();
  return timer;
};

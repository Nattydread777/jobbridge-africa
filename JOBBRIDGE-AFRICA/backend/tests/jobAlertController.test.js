import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import JobAlert from '../models/JobAlert.js';
import User from '../models/userModel.js';
import {
  getJobDigestPreferences,
  unsubscribeFromJobDigests,
  updateJobDigestPreferences,
} from '../controllers/jobAlertController.js';

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('updating digest frequency preserves existing unsubscribe links while opted in', async () => {
  const previousFindById = User.findById;
  const user = {
    _id: new mongoose.Types.ObjectId(),
    role: 'job_seeker',
    emailVerified: true,
    email: 'candidate@example.com',
    jobAlertPreferences: {
      enabled: true,
      frequency: 'daily',
      unsubscribeVersion: 'stable-version',
    },
    newsletterPreferences: { enabled: false },
    save: async () => {},
  };
  User.findById = () => ({ select: async () => user });

  try {
    const res = createResponse();
    await updateJobDigestPreferences(
      {
        user: { _id: user._id, role: user.role, emailVerified: user.emailVerified },
        body: { enabled: true, frequency: 'weekly' },
      },
      res,
      (error) => { throw error; },
    );
    assert.equal(res.body.preferences.frequency, 'weekly');
    assert.equal(user.jobAlertPreferences.unsubscribeVersion, 'stable-version');
  } finally {
    User.findById = previousFindById;
  }
});

test('job seeker profile saves personalized alerts and newsletter preferences together', async () => {
  const previousFindById = User.findById;
  const previousNewsletterUpsert = JobAlert.findOneAndUpdate;
  const previousNewsletterUpdate = JobAlert.updateOne;
  const calls = { upsert: null, update: null, saves: 0 };
  const user = {
    _id: new mongoose.Types.ObjectId(),
    email: 'candidate@example.com',
    role: 'job_seeker',
    emailVerified: true,
    jobAlertPreferences: {
      enabled: false,
      frequency: 'daily',
      unsubscribeVersion: 'stable-version',
    },
    newsletterPreferences: { enabled: false },
    save: async () => { calls.saves += 1; },
  };
  User.findById = () => ({ select: async () => user });
  JobAlert.findOneAndUpdate = async (...args) => { calls.upsert = args; };
  JobAlert.updateOne = async (...args) => { calls.update = args; };

  try {
    const enabledResponse = createResponse();
    await updateJobDigestPreferences({
      user: { _id: user._id, role: user.role, emailVerified: user.emailVerified },
      body: { enabled: true, frequency: 'weekly', newsletterEnabled: true },
    }, enabledResponse, (error) => { throw error; });

    assert.equal(user.jobAlertPreferences.enabled, true);
    assert.equal(user.jobAlertPreferences.frequency, 'weekly');
    assert.equal(user.newsletterPreferences.enabled, true);
    assert.equal(enabledResponse.body.preferences.newsletterEnabled, true);
    assert.deepEqual(calls.upsert[0], { email: 'candidate@example.com' });
    assert.equal(calls.upsert[1].$set.isActive, true);
    assert.ok(calls.upsert[1].$set.consentedAt instanceof Date);

    const disabledResponse = createResponse();
    await updateJobDigestPreferences({
      user: { _id: user._id, role: user.role, emailVerified: user.emailVerified },
      body: { enabled: true, frequency: 'weekly', newsletterEnabled: false },
    }, disabledResponse, (error) => { throw error; });

    assert.equal(user.jobAlertPreferences.enabled, true);
    assert.equal(user.newsletterPreferences.enabled, false);
    assert.equal(disabledResponse.body.preferences.newsletterEnabled, false);
    assert.deepEqual(calls.update, [
      { email: 'candidate@example.com' },
      { $set: { isActive: false } },
    ]);
    assert.equal(calls.saves, 2);
  } finally {
    User.findById = previousFindById;
    JobAlert.findOneAndUpdate = previousNewsletterUpsert;
    JobAlert.updateOne = previousNewsletterUpdate;
  }
});

test('profile preference read reflects an existing public newsletter subscription', async () => {
  const previousFindOne = JobAlert.findOne;
  JobAlert.findOne = async () => ({ isActive: true });

  try {
    const res = createResponse();
    await getJobDigestPreferences({
      user: {
        email: 'candidate@example.com',
        newsletterPreferences: { enabled: false },
        jobAlertPreferences: { enabled: false, frequency: 'daily' },
      },
    }, res, (error) => { throw error; });

    assert.equal(res.body.newsletterEnabled, true);
  } finally {
    JobAlert.findOne = previousFindOne;
  }
});

test('unsubscribe requires the signed confirmation token and invalidates it after use', async () => {
  const previousFindById = User.findById;
  const previousSecret = process.env.JWT_SECRET;
  const previousAlertSecret = process.env.JOB_ALERT_UNSUBSCRIBE_SECRET;
  process.env.JWT_SECRET = 'test-jwt-secret';
  delete process.env.JOB_ALERT_UNSUBSCRIBE_SECRET;
  const user = {
    _id: new mongoose.Types.ObjectId(),
    jobAlertPreferences: {
      enabled: true,
      unsubscribeVersion: 'current-version',
    },
    save: async () => {},
  };
  User.findById = () => ({ select: async () => user });

  try {
    const token = jwt.sign({
      purpose: 'job-alert-unsubscribe',
      version: 'current-version',
    }, process.env.JWT_SECRET, { subject: String(user._id) });
    const res = createResponse();
    await unsubscribeFromJobDigests(
      {
        query: { token },
        body: { 'List-Unsubscribe': 'One-Click' },
      },
      res,
      (error) => { throw error; },
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.preferences.enabled, false);
    assert.match(res.body.message, /unsubscribed/i);
    assert.equal(user.jobAlertPreferences.enabled, false);
    assert.notEqual(user.jobAlertPreferences.unsubscribeVersion, 'current-version');
  } finally {
    User.findById = previousFindById;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    if (previousAlertSecret === undefined) delete process.env.JOB_ALERT_UNSUBSCRIBE_SECRET;
    else process.env.JOB_ALERT_UNSUBSCRIBE_SECRET = previousAlertSecret;
  }
});

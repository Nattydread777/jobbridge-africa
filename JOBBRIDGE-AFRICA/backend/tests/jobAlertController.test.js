import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import {
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
    jobAlertPreferences: {
      enabled: true,
      frequency: 'daily',
      unsubscribeVersion: 'stable-version',
    },
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
      { body: { token } },
      res,
      (error) => { throw error; },
    );
    assert.equal(res.statusCode, 200);
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

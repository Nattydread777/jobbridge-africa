import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import Application from '../models/Application.js';
import CvUsage from '../models/CvUsage.js';
import ExternalApplication from '../models/ExternalApplication.js';
import JobAlert from '../models/JobAlert.js';
import JobOutboundClick from '../models/JobOutboundClick.js';
import JobReport from '../models/JobReport.js';
import TailoredCv from '../models/TailoredCv.js';
import User from '../models/userModel.js';
import { deleteMyAccount } from '../controllers/authController.js';

test('deleteMyAccount anonymizes submitted applications and removes private user data', async () => {
  const originalMethods = [];
  const calls = {};
  const currentUser = {
    _id: new mongoose.Types.ObjectId(),
    role: 'job_seeker',
    email: 'person@example.com',
  };
  const anonymizedApplicant = { _id: new mongoose.Types.ObjectId() };
  let userLookups = 0;
  const session = {
    withTransaction: async (operation) => operation(),
    endSession: async () => {},
  };
  const replacements = [
    [User, 'findById', () => {
      userLookups += 1;
      return userLookups === 1
        ? Promise.resolve(currentUser)
        : { session: async () => currentUser };
    }],
    [User, 'create', async (documents, options) => {
      calls.createTombstone = { documents, options };
      return [anonymizedApplicant];
    }],
    [User, 'deleteOne', async (filter, options) => {
      calls.deleteUser = { filter, options };
      return { deletedCount: 1 };
    }],
    [Application, 'find', () => ({ select: async () => [] })],
    [Application, 'updateMany', async (...args) => { calls.applications = args; }],
    [TailoredCv, 'deleteMany', async (...args) => { calls.tailoredCvs = args; }],
    [ExternalApplication, 'deleteMany', async (...args) => { calls.externalApplications = args; }],
    [JobOutboundClick, 'updateMany', async (...args) => { calls.outboundClicks = args; }],
    [JobAlert, 'deleteMany', async (...args) => { calls.jobAlerts = args; }],
    [JobReport, 'updateMany', async (...args) => { calls.jobReports = args; }],
    [CvUsage, 'deleteMany', async (...args) => { calls.cvUsage = args; }],
    [mongoose, 'startSession', async () => session],
  ];

  for (const [object, method, replacement] of replacements) {
    originalMethods.push([object, method, object[method]]);
    object[method] = replacement;
  }

  try {
    const res = {
      statusCode: null,
      body: null,
      clearedCookie: null,
      status(statusCode) {
        this.statusCode = statusCode;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
      clearCookie(name, options) {
        this.clearedCookie = { name, options };
      },
    };

    await deleteMyAccount({ user: currentUser }, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.match(res.body.message, /anonymized form/);
    assert.equal(res.clearedCookie.name, 'jwt');
    assert.equal(calls.createTombstone.documents[0].accountDeletedAt instanceof Date, true);
    assert.deepEqual(calls.applications[0], { applicant: currentUser._id });
    assert.equal(calls.applications[1].$set.applicant, anonymizedApplicant._id);
    assert.equal(calls.applications[1].$set.coverLetter, '');
    assert.deepEqual(calls.externalApplications[0], { applicant: currentUser._id });
    assert.deepEqual(calls.jobAlerts[0], { email: currentUser.email });
    assert.deepEqual(calls.outboundClicks[1].$set, { userId: null });
    assert.deepEqual(calls.deleteUser.filter, { _id: currentUser._id });
    assert.equal(calls.deleteUser.options.session, session);
  } finally {
    for (const [object, method, original] of originalMethods) {
      object[method] = original;
    }
  }
});

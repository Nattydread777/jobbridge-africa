import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import {
  createUnsubscribeToken,
  isDigestDue,
  selectPersonalizedDigestJobs,
} from '../services/jobDigestService.js';

const createJob = (job) => ({
  ...job,
  toObject() {
    return { ...this };
  },
});

test('digest cadence supports instant, daily, weekly, and first welcome sends', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');
  const checkedAt = new Date('2026-03-01T11:00:00.000Z');

  assert.equal(isDigestDue({ frequency: 'instant', lastDigestCheckAt: checkedAt }, now), true);
  assert.equal(isDigestDue({ frequency: 'daily', lastDigestCheckAt: checkedAt }, now), false);
  assert.equal(isDigestDue({ frequency: 'weekly', lastDigestCheckAt: checkedAt }, now), false);
  assert.equal(isDigestDue({ frequency: 'daily' }, now, true), true);
});

test('personalized digests select profile-matched eligible roles and reject weak or gated roles', () => {
  const user = {
    role: 'job_seeker',
    country: 'Kenya',
    languages: ['English'],
    skills: ['Financial Analysis', 'Excel', 'SQL'],
    skillGroups: { core: ['Financial Analysis'], tools: ['Excel'], technical: ['SQL'] },
    experience: [{
      position: 'Financial Analyst',
      startDate: '2020-01-01',
      endDate: 'Present',
      description: 'Financial analysis, forecasting, Excel reporting, and SQL analysis.',
    }],
    workPreferences: {
      targetRoles: ['Financial Analyst'],
      workModes: ['Remote'],
      preferredLocations: [],
    },
  };
  const jobs = [
    createJob({
      _id: 'matching-role',
      title: 'Financial Analyst',
      location: 'Worldwide remote',
      isRemote: true,
      isWorldwideRemote: true,
      workplaceType: 'remote',
      description: 'Perform financial analysis, forecasting, and reporting.',
      requirements: 'Financial Analysis, Excel, and SQL.',
      pubDate: new Date(),
      source: 'aggregated',
    }),
    createJob({
      _id: 'weak-role',
      title: 'Operations Coordinator',
      location: 'Worldwide remote',
      isRemote: true,
      isWorldwideRemote: true,
      workplaceType: 'remote',
      description: 'Coordinate schedules and communications.',
      requirements: 'Strong organization skills.',
      pubDate: new Date(),
      source: 'aggregated',
    }),
    createJob({
      _id: 'restricted-role',
      title: 'Financial Analyst',
      location: 'Remote - Germany only',
      isRemote: true,
      workplaceType: 'remote',
      description: 'Perform financial analysis.',
      requirements: 'Financial Analysis.',
      pubDate: new Date(),
    }),
    createJob({
      _id: 'language-gated-role',
      title: 'Financial Analyst',
      location: 'Worldwide remote',
      isRemote: true,
      isWorldwideRemote: true,
      workplaceType: 'remote',
      description: 'Fluent French required.',
      requirements: 'Financial Analysis.',
      pubDate: new Date(),
    }),
  ];

  const selected = selectPersonalizedDigestJobs(user, jobs);
  assert.deepEqual(selected.map(({ job }) => job._id), ['matching-role']);
  assert.ok(selected[0].score >= 0.6);
});

test('unsubscribe tokens are signed for one user and alert purpose', () => {
  const previousSecret = process.env.JOB_ALERT_UNSUBSCRIBE_SECRET;
  process.env.JOB_ALERT_UNSUBSCRIBE_SECRET = 'test-alert-secret';
  try {
    const token = createUnsubscribeToken({
      _id: 'candidate-123',
      jobAlertPreferences: { unsubscribeVersion: 'version-1' },
    });
    const payload = jwt.verify(token, 'test-alert-secret');
    assert.equal(payload.sub, 'candidate-123');
    assert.equal(payload.purpose, 'job-alert-unsubscribe');
    assert.equal(payload.version, 'version-1');
  } finally {
    if (previousSecret === undefined) delete process.env.JOB_ALERT_UNSUBSCRIBE_SECRET;
    else process.env.JOB_ALERT_UNSUBSCRIBE_SECRET = previousSecret;
  }
});

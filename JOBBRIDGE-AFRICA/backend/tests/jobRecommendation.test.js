import assert from 'node:assert/strict';
import test from 'node:test';
import { isRecommendationProfileReady, rankJobsForUser } from '../services/jobRecommendationService.js';

const createJob = (job) => ({
  ...job,
  toObject() {
    return { ...this };
  },
});

test('profile readiness requires meaningful job-seeker profile details', () => {
  assert.equal(isRecommendationProfileReady({ role: 'job_seeker' }), false);
  assert.equal(isRecommendationProfileReady({
    role: 'job_seeker',
    workPreferences: { targetRoles: ['Operations Manager'] },
  }), true);
  assert.equal(isRecommendationProfileReady({
    role: 'employer',
    skills: ['Planning'],
  }), false);
});

test('target roles influence ranking while Africa-friendly eligibility is retained', () => {
  const user = {
    role: 'job_seeker',
    country: 'Kenya',
    skills: ['Project management', 'Operations'],
    workPreferences: {
      targetRoles: ['Operations Manager'],
      workModes: ['Remote'],
      preferredLocations: [],
    },
    experience: [],
  };
  const jobs = [
    createJob({
      _id: 'accounting-job',
      title: 'Accountant',
      companyName: 'Finance Co',
      location: 'Worldwide',
      description: 'Manage accounting and financial statements.',
      workplaceType: 'remote',
      isRemote: true,
      isWorldwideRemote: true,
      eligibilityScope: 'worldwide',
      source: 'aggregated',
      createdAt: new Date(),
      tags: [],
    }),
    createJob({
      _id: 'operations-job',
      title: 'Operations Manager',
      companyName: 'Regional Co',
      location: 'Africa',
      description: 'Lead operations and project management.',
      workplaceType: 'remote',
      isRemote: true,
      eligibilityScope: 'africa_friendly',
      source: 'aggregated',
      createdAt: new Date(),
      tags: ['Operations'],
    }),
  ];

  const matches = rankJobsForUser(user, jobs);
  assert.equal(matches[0].job._id, 'operations-job');
  assert.equal(matches[0].matchBreakdown.roles, 1);
  assert.equal(matches[0].job.eligibilityScope, 'africa_friendly');
});

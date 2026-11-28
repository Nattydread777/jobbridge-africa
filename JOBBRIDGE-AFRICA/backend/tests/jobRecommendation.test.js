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

test('role-specific fit rewards matching history and skills while filtering language and region gates', () => {
  const user = {
    role: 'job_seeker',
    country: 'Kenya',
    languages: ['English'],
    skills: ['Financial analysis', 'Excel', 'SQL', 'Business analysis'],
    workPreferences: {
      targetRoles: ['Financial Analyst'],
      workModes: ['Remote'],
      preferredLocations: [],
    },
    experience: [{
      position: 'Financial Analyst',
      startDate: '2020-01-01',
      endDate: '2024-01-01',
      description: 'Financial analysis, forecasting, Excel reporting, and SQL data analysis.',
    }],
  };
  const jobs = [
    createJob({
      _id: 'matching-worldwide',
      title: 'Financial Analyst',
      companyName: 'Global Finance',
      location: 'Worldwide remote',
      isRemote: true,
      isWorldwideRemote: true,
      workplaceType: 'remote',
      description: 'Perform financial analysis, forecasting, and reporting.',
      requirements: 'Financial analysis, Excel, SQL, business analysis.',
      pubDate: new Date(),
      source: 'aggregated',
    }),
    createJob({
      _id: 'matching-africa',
      title: 'Financial Analyst',
      companyName: 'Regional Finance',
      location: 'Remote - Africa',
      isRemote: true,
      workplaceType: 'remote',
      description: 'Perform financial analysis and forecasting.',
      requirements: 'Financial analysis, Excel, SQL.',
      pubDate: new Date(),
      source: 'aggregated',
    }),
    createJob({
      _id: 'weak-title-overlap',
      title: 'Operations Analyst',
      companyName: 'Operations Group',
      location: 'Worldwide remote',
      isRemote: true,
      isWorldwideRemote: true,
      workplaceType: 'remote',
      description: 'Coordinate day-to-day operations.',
      requirements: 'Project management.',
      pubDate: new Date(),
      source: 'aggregated',
    }),
    createJob({
      _id: 'restricted-region',
      title: 'Financial Analyst',
      location: 'Remote - Germany only',
      isRemote: true,
      workplaceType: 'remote',
      description: 'Perform financial analysis.',
      requirements: 'Financial analysis.',
      pubDate: new Date(),
    }),
    createJob({
      _id: 'language-gated',
      title: 'Financial Analyst',
      location: 'Worldwide remote',
      isRemote: true,
      isWorldwideRemote: true,
      workplaceType: 'remote',
      description: 'Fluent Spanish required.',
      requirements: 'Financial analysis.',
      pubDate: new Date(),
    }),
  ];

  const matches = rankJobsForUser(user, jobs);
  assert.deepEqual(
    matches.slice(0, 2).map(({ job }) => job._id).sort(),
    ['matching-africa', 'matching-worldwide'],
  );
  const weakMatch = matches.find(({ job }) => job._id === 'weak-title-overlap');
  assert.equal(weakMatch.matchBreakdown.roles, 0);
  assert.ok(weakMatch.score < 0.6);
  assert.equal(matches.some(({ job }) => ['restricted-region', 'language-gated'].includes(job._id)), false);
  assert.ok(matches[0].score > 0.75);
  assert.ok(matches[0].fit_context.match_reasons.some((reason) => reason.startsWith('Target roles:')));
  assert.ok(matches[0].fit_context.match_reasons.some((reason) => reason.startsWith('Eligibility:')));
});

import assert from 'node:assert/strict';
import test from 'node:test';
import Job from '../models/Job.js';
import { getJobs } from '../controllers/jobController.js';

const response = () => ({
  statusCode: null,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('job discovery hard-excludes restricted listings even when requested explicitly', async () => {
  const originalAggregate = Job.aggregate;
  const pipelines = [];
  Job.aggregate = (pipeline) => {
    pipelines.push(pipeline);
    return Promise.resolve(pipeline.some((stage) => stage.$count) ? [] : []);
  };
  const res = response();

  try {
    await getJobs({ query: {} }, res, (error) => { throw error; });
    const defaultFilters = pipelines[0][0].$match.$and;
    assert.ok(JSON.stringify(defaultFilters).includes('"$nor"'));
    const regionalRankStage = pipelines[0].find((stage) => stage.$addFields?._searchPriority?.$add);
    assert.ok(regionalRankStage.$addFields._searchPriority.$add[0].$multiply[0].$switch);

    pipelines.length = 0;
    await getJobs({ query: { includeRestricted: 'true', timezonePolicy: 'flexible_async' } }, res, (error) => {
      throw error;
    });
    const inclusiveFilters = pipelines[0][0].$match.$and;
    assert.ok(JSON.stringify(inclusiveFilters).includes('"$nor"'));
    assert.ok(inclusiveFilters.some((filter) => filter.$or?.some((clause) => clause.timezonePolicy === 'flexible_async')));

    pipelines.length = 0;
    await getJobs({ query: { eligibilityScope: 'region_restricted' } }, res, (error) => { throw error; });
    const restrictedFilters = pipelines[0][0].$match.$and;
    assert.ok(JSON.stringify(restrictedFilters).includes('"$nor"'));
    assert.ok(restrictedFilters.some((filter) => filter.$or?.some((clause) => clause.eligibilityScope === 'region_restricted')));
  } finally {
    Job.aggregate = originalAggregate;
  }
});

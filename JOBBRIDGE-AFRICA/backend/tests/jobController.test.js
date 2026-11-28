import assert from 'node:assert/strict';
import test from 'node:test';
import Job from '../models/Job.js';
import { getFeaturedEmployers, getJobs } from '../controllers/jobController.js';

test('public jobs listing deduplicates before pagination and counts deduplicated results', async () => {
  const originalAggregate = Job.aggregate;
  const pipelines = [];
  let responseBody;
  Job.aggregate = (pipeline) => {
    pipelines.push(pipeline);
    return Promise.resolve(
      pipeline.some((stage) => stage.$count)
        ? [{ total: 1 }]
        : [{ _id: 'job-id', title: 'Engineer', companyName: 'Example' }],
    );
  };

  try {
    const req = { query: {} };
    const res = {
      statusCode: null,
      status(statusCode) {
        this.statusCode = statusCode;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    await getJobs(req, res, (error) => {
      throw error;
    });

    test('featured employers aggregate all active listings, normalize names, and expose all results', async () => {
      const originalAggregate = Job.aggregate;
      let pipeline;
      let responseBody;
      Job.aggregate = (value) => {
        pipeline = value;
        return Promise.resolve([
          { _id: 'coalition', name: ' Coalition ', listingCount: 2, mostRecent: '2026-11-25', globalRemoteListings: 0 },
          { _id: 'acme-inc', name: 'Acme Inc', listingCount: 3, mostRecent: '2026-11-20', globalRemoteListings: 0 },
          { _id: 'acme--inc', name: 'Acme  Inc', listingCount: 2, mostRecent: '2026-11-26', globalRemoteListings: 1 },
          { _id: 'unknown', name: 'Unknown', listingCount: 4, mostRecent: '2026-11-26', globalRemoteListings: 0 },
        ]);
      };

      try {
        const res = {
          statusCode: null,
          status(statusCode) {
            this.statusCode = statusCode;
            return this;
          },
          json(body) {
            responseBody = body;
            return this;
          },
        };

        await getFeaturedEmployers({ query: { all: 'true', limit: '1' } }, res, (error) => {
          throw error;
        });

        assert.equal(res.statusCode, 200);
        assert.equal(responseBody.total, 2);
        assert.deepEqual(responseBody.employers.map(({ name }) => name), ['Acme Inc', 'Coalition']);
        assert.equal(responseBody.employers[0].listingCount, 5);
        assert.equal(pipeline[0].$match.$and[0].$and[0].$or[0].expiryDate.$gte instanceof Date, true);
        assert.equal(pipeline[0].$match.$and[1].sourceProvider.$ne, 'jobbridge-fallback');
        const listingDeduplicationIndex = pipeline.findIndex((stage) => stage.$group?._id === '$_deduplicationKey');
        const employerAggregationIndex = pipeline.findIndex((stage) => stage.$group?._id === '$_employerKey');
        assert.ok(listingDeduplicationIndex >= 0);
        assert.ok(employerAggregationIndex > listingDeduplicationIndex);
      } finally {
        Job.aggregate = originalAggregate;
      }
    });

    test('job listing supports an exact, case-insensitive company filter', async () => {
      const originalAggregate = Job.aggregate;
      const pipelines = [];
      Job.aggregate = (pipeline) => {
        pipelines.push(pipeline);
        return Promise.resolve(pipeline.some((stage) => stage.$count) ? [{ total: 0 }] : []);
      };

      try {
        const res = {
          status() { return this; },
          json() { return this; },
        };
        await getJobs({ query: { company: 'Coalition' } }, res, (error) => {
          throw error;
        });
        const queryFilters = pipelines[0][0].$match.$and;
        const companyFilter = queryFilters.find((filter) => filter.companyName);
        assert.deepEqual(companyFilter.companyName, {
          $regex: '^Coalition$',
          $options: 'i',
        });
      } finally {
        Job.aggregate = originalAggregate;
      }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(responseBody.total, 1);
    assert.equal(responseBody.totalPages, 1);
    assert.equal(pipelines.length, 2);

    for (const pipeline of pipelines) {
      const deduplicationStage = pipeline.find((stage) => stage.$addFields?._deduplicationKey);
      assert.ok(deduplicationStage);
      assert.ok(deduplicationStage.$addFields._deduplicationKey.title.$toLower);
      assert.ok(deduplicationStage.$addFields._deduplicationKey.title.$toLower.$trim);
      assert.ok(deduplicationStage.$addFields._deduplicationKey.location.$toLower);
      assert.ok(deduplicationStage.$addFields._deduplicationKey.department.$toLower);
      assert.ok(deduplicationStage.$addFields._deduplicationKey.eligibilityScope.$toLower);
      assert.equal(JSON.stringify(pipeline).includes('$regexReplace'), false);
      assert.ok(pipeline.some((stage) => stage.$group?._id === '$_deduplicationKey'));
    }

    const listPipeline = pipelines.find((pipeline) => pipeline.some((stage) => stage.$skip !== undefined));
    const groupIndex = listPipeline.findIndex((stage) => stage.$group);
    const skipIndex = listPipeline.findIndex((stage) => stage.$skip !== undefined);
    assert.ok(groupIndex < skipIndex);
  } finally {
    Job.aggregate = originalAggregate;
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import Job from '../models/Job.js';
import { getJobs } from '../controllers/jobController.js';

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

    assert.equal(res.statusCode, 200);
    assert.equal(responseBody.total, 1);
    assert.equal(responseBody.totalPages, 1);
    assert.equal(pipelines.length, 2);

    for (const pipeline of pipelines) {
      const deduplicationStage = pipeline.find((stage) => stage.$addFields?._deduplicationKey);
      assert.ok(deduplicationStage);
      assert.ok(deduplicationStage.$addFields._deduplicationKey.title.$toLower);
      assert.ok(deduplicationStage.$addFields._deduplicationKey.title.$toLower.$trim);
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

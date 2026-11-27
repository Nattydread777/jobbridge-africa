import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import Application from '../models/Application.js';
import { updateMyApplicationTracker } from '../controllers/applicationController.js';

test('job seekers can save their own application stage and private notes', async () => {
  const originalFindOne = Application.findOne;
  const applicant = new mongoose.Types.ObjectId();
  const id = new mongoose.Types.ObjectId();
  const application = {
    _id: id,
    applicant,
    candidateStage: 'applied',
    candidateNotes: '',
    save: async function save() { this.saved = true; },
  };
  let filter;
  let selection;
  Application.findOne = (query) => {
    filter = query;
    return {
      select: async (fields) => {
        selection = fields;
        return application;
      },
    };
  };

  try {
    const res = {
      statusCode: null,
      body: null,
      status(statusCode) {
        this.statusCode = statusCode;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    await updateMyApplicationTracker({
      params: { id: id.toString() },
      user: { _id: applicant },
      body: { candidateStage: 'interviewing', candidateNotes: 'Follow up Friday.' },
    }, res, (error) => {
      throw error;
    });

    assert.deepEqual(filter, { _id: id.toString(), applicant });
    assert.equal(selection, '+candidateStage +candidateNotes');
    assert.equal(application.saved, true);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.application.candidateStage, 'interviewing');
    assert.equal(res.body.application.candidateNotes, 'Follow up Friday.');
  } finally {
    Application.findOne = originalFindOne;
  }
});

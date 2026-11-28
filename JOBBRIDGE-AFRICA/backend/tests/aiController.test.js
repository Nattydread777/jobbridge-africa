import assert from 'node:assert/strict';
import test from 'node:test';
import { parseProfileCv } from '../controllers/aiController.js';

test('profile CV endpoint returns deterministic structured extraction without external AI', async () => {
  const response = {
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

  await parseProfileCv({
    body: {
      cvText: [
        'Experience',
        'Operations Manager | Example Organization',
        'August 2022 – Present',
        '- Coordinated regional operations.',
      ].join('\n'),
    },
  }, response, (error) => { throw error; });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.cv.experience[0], {
    title: 'Operations Manager',
    company: 'Example Organization',
    dates: 'August 2022 – Present',
    location: '',
    bullets: ['Coordinated regional operations.'],
  });
});

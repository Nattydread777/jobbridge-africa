import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { createUnsubscribeToken, isDigestDue } from '../services/jobDigestService.js';

test('digest cadence supports instant, daily, weekly, and first welcome sends', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');
  const checkedAt = new Date('2026-03-01T11:00:00.000Z');

  assert.equal(isDigestDue({ frequency: 'instant', lastDigestCheckAt: checkedAt }, now), true);
  assert.equal(isDigestDue({ frequency: 'daily', lastDigestCheckAt: checkedAt }, now), false);
  assert.equal(isDigestDue({ frequency: 'weekly', lastDigestCheckAt: checkedAt }, now), false);
  assert.equal(isDigestDue({ frequency: 'daily' }, now, true), true);
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

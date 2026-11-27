import assert from 'node:assert/strict';
import test from 'node:test';
import { buildActiveJobFilter, MAX_FEED_JOB_AGE_DAYS } from '../utils/jobFilters.js';

test('active job filters exclude closed records and stale external-feed listings', () => {
  const now = new Date('2026-11-27T12:00:00.000Z');
  const filter = buildActiveJobFilter(now);
  const clauses = filter.$and;
  const freshness = clauses.find((clause) => clause.$or?.[0]?.source?.$in?.includes('employer'));
  const cutoff = new Date(now.getTime() - MAX_FEED_JOB_AGE_DAYS * 24 * 60 * 60 * 1000);

  assert.equal(clauses[0].$or[0].expiryDate.$gte, now);
  assert.ok(clauses.some((clause) => clause.isActive?.$ne === false));
  assert.ok(clauses.some((clause) => clause.status?.$nin.includes('closed')));
  assert.ok(freshness);
  assert.equal(freshness.$or[0].source.$in.includes('employer'), true);

  const externalSource = freshness.$or.find((condition) => condition.$and);
  const lastSeenClause = externalSource.$and[1].$or[0];
  assert.equal(lastSeenClause.lastSeenAt.$gte.getTime(), cutoff.getTime());
});

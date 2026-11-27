import assert from 'node:assert/strict';
import test from 'node:test';
import Job from '../models/Job.js';
import { extractSalaryCurrency } from '../utils/salary.js';
import {
  africaRelevanceExpression,
  buildEligibilityScopeFilter,
  buildTimezonePolicyFilter,
  deriveJobSignals,
  isRegionRestrictedJob,
} from '../utils/jobSignals.js';

test('classifies worldwide, Africa-friendly, and region-restricted roles', () => {
  assert.deepEqual(deriveJobSignals({
    isRemote: true,
    location: 'Remote - Worldwide',
  }), {
    eligibilityScope: 'worldwide',
    timezonePolicy: 'unspecified',
  });
  assert.deepEqual(deriveJobSignals({
    isRemote: true,
    location: 'Africa',
    description: 'Flexible hours with async collaboration.',
  }), {
    eligibilityScope: 'africa_friendly',
    timezonePolicy: 'flexible_async',
  });
  assert.equal(deriveJobSignals({
    isRemote: true,
    location: 'Lagos, NG',
  }).eligibilityScope, 'africa_friendly');
  assert.equal(deriveJobSignals({
    isRemote: true,
    location: 'St Louis',
  }).eligibilityScope, 'unspecified');
  assert.equal(deriveJobSignals({
    isRemote: true,
    location: 'Remote (United States only)',
  }).eligibilityScope, 'region_restricted');
  assert.equal(deriveJobSignals({
    isRemote: true,
    location: 'Remote in United States',
  }).eligibilityScope, 'region_restricted');
  assert.deepEqual(deriveJobSignals({
    isRemote: true,
    location: 'United States only',
  }), {
    eligibilityScope: 'region_restricted',
    timezonePolicy: 'unspecified',
  });
  assert.equal(isRegionRestrictedJob({
    isRemote: true,
    description: 'We serve customers in the United States.',
  }), false);
  assert.equal(isRegionRestrictedJob({
    isRemote: true,
    location: 'United States',
    locationRestriction: 'United States',
  }), true);
});

test('builds scope and timezone filters without mixing restricted roles into Africa-friendly results', () => {
  const africaFilter = buildEligibilityScopeFilter('africa_friendly');
  assert.ok(africaFilter.$and.some((clause) => clause.$nor));
  assert.ok(buildEligibilityScopeFilter('region_restricted').$or);
  assert.ok(buildTimezonePolicyFilter('africa_eu_friendly').$or);
  assert.equal(buildTimezonePolicyFilter('unknown'), null);
  assert.ok(africaRelevanceExpression().$switch);
});

test('extracts explicit supported salary currencies without guessing ambiguous dollar symbols', () => {
  assert.equal(extractSalaryCurrency('USD', '$90,000–$110,000'), 'USD');
  assert.equal(extractSalaryCurrency(undefined, '£60,000'), 'GBP');
  assert.equal(extractSalaryCurrency(undefined, '₦500,000'), 'NGN');
  assert.equal(extractSalaryCurrency(undefined, '$90,000'), '');
  assert.ok(Job.schema.path('salaryCurrency'));
  assert.ok(Job.schema.path('eligibilityScope').enumValues.includes('region_restricted'));
  assert.ok(Job.schema.path('timezonePolicy').enumValues.includes('flexible_async'));
});

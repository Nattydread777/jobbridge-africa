import assert from 'node:assert/strict';
import test from 'node:test';
import Job from '../models/Job.js';
import { extractSalaryCurrency } from '../utils/salary.js';
import {
  africaRelevanceExpression,
  buildEligibleJobFilter,
  buildEligibilityScopeFilter,
  buildTimezonePolicyFilter,
  deriveJobSignals,
  isEligibleJobForUser,
  isJobLanguageEligibleForUser,
  isRegionRestrictedJob,
} from '../utils/jobSignals.js';

test('classifies worldwide, Africa-friendly, and region-restricted roles', () => {
  assert.deepEqual(deriveJobSignals({
    isRemote: true,
    location: 'Remote - Worldwide',
  }), {
    eligibilityScope: 'worldwide',
    timezonePolicy: 'unspecified',
    languageRequirements: [],
  });
  assert.deepEqual(deriveJobSignals({
    isRemote: true,
    location: 'Africa',
    description: 'Flexible hours with async collaboration.',
  }), {
    eligibilityScope: 'africa_friendly',
    timezonePolicy: 'flexible_async',
    languageRequirements: [],
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
    languageRequirements: [],
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
  assert.ok(JSON.stringify(africaFilter).includes('"$nor"'));
  assert.ok(buildEligibilityScopeFilter('region_restricted').$or);
  assert.ok(buildTimezonePolicyFilter('africa_eu_friendly').$or);
  assert.equal(buildTimezonePolicyFilter('unknown'), null);
  assert.ok(africaRelevanceExpression().$switch);
  assert.ok(JSON.stringify(buildEligibleJobFilter()).includes('"$nor"'));
});

test('geographic eligibility keeps Africa and worldwide remote roles but rejects closed regions', () => {
  const eligibleJobs = [
    { isRemote: true, location: 'Remote - Worldwide' },
    { isRemote: true, location: 'Remote - Africa' },
    { isRemote: true, location: 'EMEA remote' },
    { workplaceType: 'on-site', location: 'Nairobi, Kenya' },
  ];
  const restrictedJobs = [
    { isRemote: true, location: 'Remote - United States only' },
    { isRemote: true, location: 'Remote - UK only' },
    { isRemote: true, location: 'EU-only' },
    { isRemote: true, location: 'Canada' },
    { isRemote: true, location: 'Remote - Latin America' },
    { isRemote: true, location: 'Remote - Worldwide except Canada' },
    { isRemote: true, location: 'Remote' },
    { isRemote: true, location: 'Remote', description: 'Flexible hours and async collaboration.' },
  ];

  for (const job of eligibleJobs) assert.equal(isEligibleJobForUser(job), true);
  for (const job of restrictedJobs) assert.equal(isEligibleJobForUser(job), false);
});

test('language-gated jobs require stated language matches and multilingual capacity', () => {
  const frenchRole = {
    isRemote: true,
    location: 'Worldwide remote',
    requirements: 'Fluent French required for customer communication.',
  };
  const bilingualRole = {
    isRemote: true,
    location: 'Remote - Africa',
    description: 'Must be trilingual for this role.',
  };

  assert.deepEqual(deriveJobSignals(frenchRole).languageRequirements, ['french']);
  assert.equal(isJobLanguageEligibleForUser(frenchRole), false);
  assert.equal(isJobLanguageEligibleForUser(frenchRole, ['English']), false);
  assert.equal(isJobLanguageEligibleForUser(frenchRole, ['English', 'French']), true);
  assert.equal(isJobLanguageEligibleForUser(bilingualRole, ['English', 'French']), false);
  assert.equal(isJobLanguageEligibleForUser(bilingualRole, ['English', 'French', 'Swahili']), true);
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

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeCvMatch,
  createAiReviewPrompt,
  extractLogistics,
  extractSkillPhrases,
  filterSkillNoise,
  normalizeAiRewrites,
  redactCvPii,
  splitCvSections,
} from '../services/cvAnalysisService.js';

test('CV parsing preserves section and bullet boundaries and separates cover letters', () => {
  const parsed = splitCvSections([
    'Ada Example',
    'Professional Summary',
    'Product designer with accessibility testing experience.',
    'Experience',
    '- Led user research for a public service product.',
    '* Improved usability testing across two releases.',
    'Education',
    'BSc Computer Science',
    'Cover Letter',
    'I am applying for the product design role.',
  ].join('\n'));

  assert.equal(parsed.header, 'Ada Example');
  assert.equal(parsed.experienceBullets.length, 2);
  assert.match(parsed.experienceBullets[0], /user research/);
  assert.match(parsed.coverLetter, /applying for the product design role/);
  assert.doesNotMatch(parsed.resumeText, /Cover Letter/);
});

test('skill extraction recognizes phrases while noise filtering removes locations, metrics, and generic words', () => {
  const filtered = filterSkillNoise(
    'Headquartered in Lagos, Nigeria, Texas; 10 years, 25% growth; stakeholder liaison and React.',
  );
  assert.deepEqual(extractSkillPhrases('stakeholder liaison'), ['client coordination']);
  assert.deepEqual(extractSkillPhrases('stakeholder communication'), ['stakeholder management']);
  assert.ok(filtered.skills.includes('client coordination'));
  assert.ok(filtered.skills.includes('react'));
  assert.ok(!filtered.tokens.includes('headquartered'));
  assert.ok(!filtered.tokens.includes('lagos'));
  assert.ok(!filtered.tokens.includes('nigeria'));
  assert.ok(!filtered.tokens.includes('texas'));
  assert.ok(!filtered.tokens.includes('10'));
  assert.ok(!filtered.tokens.includes('25'));
});

test('logistics are surfaced separately from skill gaps and score', () => {
  const logistics = extractLogistics(
    'Based in Lagos and authorized to work in Nigeria.',
    'Fully remote. Remote eligibility: Nigeria. Aligned to US business hours / Eastern Time; visa sponsorship unavailable.',
  );
  assert.equal(logistics.requirements.workMode, 'Fully remote');
  assert.equal(logistics.requirements.hours, 'US business hours');
  assert.match(logistics.requirements.timezone, /Eastern Time/i);
  assert.match(logistics.requirements.authorization, /visa sponsorship/i);
  assert.match(logistics.requirements.remoteScope, /Nigeria/i);
  assert.equal(logistics.status, 'review');

  const match = analyzeCvMatch(
    'Summary\nReact developer\nExperience\n2018-2021 Product Developer\n2020-present Software Developer',
    'Must have 5 years of experience. Must be located in Lagos. Required: React.',
  );
  assert.equal(match.experience.candidate_years, new Date().getFullYear() - 2018);
  assert.ok(!match.must_have_gaps.some((gap) => /Lagos|years of experience/i.test(gap.skill)));
});

test('PII is redacted before provider submission while dates remain intact', () => {
  const cv = [
    'Amina Okafor',
    'amina.okafor@example.com | +234 801 234 5678',
    '12 Market Street, Lagos',
    'Experience',
    '- Delivered React features from 2020-2023.',
  ].join('\n');
  const redacted = redactCvPii(cv);
  assert.doesNotMatch(redacted, /Amina Okafor|amina\.okafor@example\.com|234 801 234 5678|12 Market Street/i);
  assert.match(redacted, /\[CANDIDATE_NAME\]/);
  assert.match(redacted, /\[EMAIL\]/);
  assert.match(redacted, /\[PHONE\]/);
  assert.match(redacted, /2020-2023/);
  assert.match(createAiReviewPrompt(cv, 'React role').user, /\[CANDIDATE_NAME\]/);
});

test('AI rewrites require a source-backed original and facts already present in the CV', () => {
  const cv = 'Experience\nLed customer onboarding with Salesforce in 2020-2022.';
  const result = normalizeAiRewrites({
    rewrites: [
      {
        original: 'Led customer onboarding with Salesforce in 2020-2022.',
        suggested: 'Led customer onboarding with Salesforce in 2020-2022.',
        reason: 'Improves clarity.',
      },
      {
        original: 'Led customer onboarding with Salesforce in 2020-2022.',
        suggested: 'Led a global team of 20 and increased revenue by 50%.',
        reason: 'Adds impact.',
      },
      {
        original: 'Invented original text.',
        suggested: 'Led customer onboarding with Salesforce.',
        reason: 'Not from the CV.',
      },
    ],
  }, cv);

  assert.equal(result.rewrites[0].suggested, 'Led customer onboarding with Salesforce in 2020-2022.');
  assert.equal(result.rewrites[0].add_only_if_true, false);
  assert.equal(result.rewrites[1].suggested, '');
  assert.equal(result.rewrites[1].add_only_if_true, true);
  assert.equal(result.rewrites[2].suggested, '');
  assert.equal(result.rewrites[2].add_only_if_true, true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeCvMatch,
  analyzeJobRequirements,
  createAiReviewPrompt,
  extractLogistics,
  extractSkillPhrases,
  filterSkillNoise,
  mergeGroundedJobRequirements,
  normalizeCvText,
  normalizeTailoredCv,
  parseCvStructure,
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

test('CV normalization rejoins split phrases and parsing keeps skills out of summary', () => {
  const text = normalizeCvText([
    'Summary',
    'Built an end - to - end platform with multi - stakeholder teams',
    'and improved weekly reporting.',
    'Skills',
    'JavaScript, React, SQL',
    'Experience',
    'Senior Engineer | Acme | Lagos | Jan 2020 - Present',
    '- Built customer dashboards that improved',
    'weekly reporting for product teams.',
  ].join('\n'));

  assert.match(text, /end-to-end platform with multi-stakeholder teams and improved weekly reporting/);
  const cv = parseCvStructure(text);
  assert.match(cv.summary, /end-to-end/);
  assert.deepEqual(cv.skills, ['JavaScript', 'React', 'SQL']);
  assert.doesNotMatch(cv.summary, /JavaScript|React|SQL/);
  assert.deepEqual(cv.experience[0], {
    title: 'Senior Engineer',
    company: 'Acme',
    dates: 'Jan 2020 - Present',
    location: 'Lagos',
    bullets: ['Built customer dashboards that improved weekly reporting for product teams.'],
  });
});

test('CV parsing repairs split words, populates competencies, and routes training out of experience', () => {
  const parsed = parseCvStructure([
    'Core Competencies',
    'React, Stakeholder Management, SQL',
    'Experience',
    '2020 - 2022',
    'Product Designer',
    'Acme',
    'Lagos',
    '- Built MERN - stack tools for a nd auto mation workflows.',
    'PLP Digital Skills Program',
    'Packt JavaScript Certificate',
    'Education',
    'BSc Computer Science',
  ].join('\n'));

  assert.deepEqual(parsed.skills, ['React', 'Stakeholder Management', 'SQL']);
  assert.equal(parsed.experience.length, 1);
  assert.equal(parsed.experience[0].title, 'Product Designer');
  assert.equal(parsed.experience[0].company, 'Acme');
  assert.match(parsed.experience[0].dates, /2020/);
  assert.match(parsed.experience[0].bullets[0], /MERN stack tools for and automation workflows/);
  assert.ok(parsed.certifications.some((item) => /PLP/.test(item)));
  assert.ok(parsed.certifications.some((item) => /Packt/.test(item)));
  assert.ok(parsed.education.some((item) => /BSc Computer Science/.test(item.degree)));
});

test('job requirements are categorized and AI rewrites remain source-bullet traceable', () => {
  const jobDescription = [
    'Requirements',
    '- Must have experience with React and customer onboarding.',
    'Nice to have',
    '- Preferred: familiarity with Kubernetes.',
    'Fully remote, aligned to Eastern Time.',
  ].join('\n');
  const requirements = analyzeJobRequirements(jobDescription);
  assert.ok(requirements.must_haves.some((item) => /React/));
  assert.ok(requirements.nice_to_haves.some((item) => /Kubernetes/));
  assert.match(requirements.logistics.timezone, /Eastern Time/);

  const cv = parseCvStructure([
    'Summary',
    'Frontend developer with React experience.',
    'Skills',
    'React, JavaScript',
    'Experience',
    'Senior Engineer | Acme | 2020-2023',
    '- Built React dashboards.',
  ].join('\n'));
  const tailored = normalizeTailoredCv({
    cv,
    sourceText: 'React frontend developer. Built React dashboards.',
    jobRequirements: requirements,
    generated: {
      summary: { summary: { original: cv.summary, suggested: cv.summary, reason: 'Clear and grounded.' } },
      skills: { skills: ['React', 'JavaScript', 'Kubernetes'] },
      experience: {
        experience: [{
          roleIndex: 0,
          bullets: [
            { sourceBullet: 'Built React dashboards.', tailoredBullet: 'Built React dashboards.', reason: 'Clearer.' },
            { sourceBullet: 'Built React dashboards.', tailoredBullet: 'Led 10 engineers.', reason: 'Impact.' },
          ],
        }],
      },
    },
  });
  assert.equal(tailored.experience[0].bullets[0].sourceBullet, 'Built React dashboards.');
  assert.equal(tailored.experience[0].bullets[0].traceable, true);
  assert.ok(tailored.gaps.some((gap) => /Led 10 engineers/.test(gap.requirement) && gap.add_only_if_true));
  assert.ok(tailored.gaps.some((gap) => /Kubernetes/.test(gap.requirement) && gap.add_only_if_true));
  assert.deepEqual(tailored.skills, ['React', 'JavaScript']);

  const groundedRequirements = mergeGroundedJobRequirements(
    { must_haves: [], nice_to_haves: [], logistics: requirements.logistics },
    { must_haves: ['Must have experience with React and customer onboarding.', 'Invented requirement'] },
    jobDescription,
  );
  assert.ok(groundedRequirements.must_haves.includes('Must have experience with React and customer onboarding.'));
  assert.ok(!groundedRequirements.must_haves.includes('Invented requirement'));
});

test('short and external-style job descriptions infer skill phrases without misclassifying nice-to-haves', () => {
  const requirements = analyzeJobRequirements(
    'React developer with experience in SQL and Power BI. Nice to have: Kubernetes or Docker.',
  );
  assert.ok(requirements.must_haves.some((item) => /React/i.test(item)));
  assert.ok(requirements.must_haves.some((item) => /SQL/i.test(item)));
  assert.ok(requirements.must_haves.some((item) => /Power BI/i.test(item)));
  assert.ok(requirements.nice_to_haves.some((item) => /Kubernetes|Docker/i.test(item)));
  assert.ok(!requirements.must_haves.some((item) => /Kubernetes|Docker/i.test(item)));
  for (const skill of ['react', 'sql', 'power bi', 'kubernetes', 'docker']) {
    assert.ok(requirements.skill_phrases.includes(skill));
  }
});

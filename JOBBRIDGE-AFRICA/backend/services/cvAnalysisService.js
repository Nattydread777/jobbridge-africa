const SKILL_FAMILIES = [
  { canonical: 'accessibility testing', variants: ['accessibility testing', 'wcag', 'web accessibility'] },
  { canonical: 'agile delivery', variants: ['agile', 'scrum', 'sprint planning'] },
  { canonical: 'api development', variants: ['api development', 'rest api', 'restful api', 'graphql api'] },
  { canonical: 'aws', variants: ['aws', 'amazon web services'] },
  { canonical: 'business analysis', variants: ['business analysis', 'requirements gathering', 'process analysis'] },
  { canonical: 'client coordination', variants: ['client coordination', 'stakeholder liaison', 'stakeholder engagement', 'client liaison', 'partner coordination'] },
  { canonical: 'cloud infrastructure', variants: ['cloud infrastructure', 'cloud computing', 'infrastructure as code'] },
  { canonical: 'communication', variants: ['communication', 'written communication', 'verbal communication', 'communication skills'] },
  { canonical: 'css', variants: ['css', 'css3'] },
  { canonical: 'customer relationship management', variants: ['customer relationship management', 'crm', 'client relationship management'] },
  { canonical: 'cybersecurity', variants: ['cybersecurity', 'information security', 'application security'] },
  { canonical: 'data analysis', variants: ['data analysis', 'data analytics', 'exploratory data analysis'] },
  { canonical: 'data visualization', variants: ['data visualization', 'data visualisation', 'dashboard development'] },
  { canonical: 'database management', variants: ['database management', 'database administration', 'database design'] },
  { canonical: 'docker', variants: ['docker', 'containerization', 'containerisation'] },
  { canonical: 'excel', variants: ['excel', 'microsoft excel', 'spreadsheet analysis'] },
  { canonical: 'figma', variants: ['figma', 'figma prototyping'] },
  { canonical: 'financial analysis', variants: ['financial analysis', 'financial modelling', 'financial modeling'] },
  { canonical: 'git', variants: ['git', 'github', 'gitlab', 'version control'] },
  { canonical: 'google cloud', variants: ['google cloud', 'gcp'] },
  { canonical: 'html', variants: ['html', 'html5'] },
  { canonical: 'javascript', variants: ['javascript', 'ecmascript'] },
  { canonical: 'kubernetes', variants: ['kubernetes', 'k8s'] },
  { canonical: 'machine learning', variants: ['machine learning', 'supervised learning', 'model training'] },
  { canonical: 'marketing analytics', variants: ['marketing analytics', 'campaign analytics', 'marketing performance'] },
  { canonical: 'microsoft azure', variants: ['microsoft azure', 'azure'] },
  { canonical: 'mongodb', variants: ['mongodb', 'mongo db'] },
  { canonical: 'mysql', variants: ['mysql'] },
  { canonical: 'node.js', variants: ['node.js', 'nodejs', 'node js'] },
  { canonical: 'people management', variants: ['people management', 'team leadership', 'staff supervision'] },
  { canonical: 'postgresql', variants: ['postgresql', 'postgres'] },
  { canonical: 'problem solving', variants: ['problem solving', 'troubleshooting', 'root cause analysis'] },
  { canonical: 'project management', variants: ['project management', 'project coordination', 'program management'] },
  { canonical: 'python', variants: ['python'] },
  { canonical: 'react', variants: ['react', 'react.js', 'reactjs'] },
  { canonical: 'redis', variants: ['redis'] },
  { canonical: 'salesforce', variants: ['salesforce', 'salesforce crm'] },
  { canonical: 'sql', variants: ['sql', 'structured query language'] },
  { canonical: 'stakeholder management', variants: ['stakeholder management', 'stakeholder communication'] },
  { canonical: 'technical writing', variants: ['technical writing', 'technical documentation', 'documentation'] },
  { canonical: 'typescript', variants: ['typescript'] },
  { canonical: 'user experience design', variants: ['user experience design', 'ux design', 'user research', 'usability testing'] },
  { canonical: 'user interface design', variants: ['user interface design', 'ui design', 'interface design'] },
];

const SECTION_HEADINGS = [
  { key: 'summary', pattern: /^(?:professional\s+)?(?:summary|profile|objective|about me)$/i },
  { key: 'skills', pattern: /^(?:core\s+|technical\s+|key\s+)?skills(?:\s+and\s+competencies)?$/i },
  { key: 'experience', pattern: /^(?:(?:professional|work)\s+)?(?:experience|employment history|work history)$/i },
  { key: 'education', pattern: /^(?:education|academic background|qualifications)$/i },
  { key: 'certifications', pattern: /^(?:certifications?|licenses?|professional development)$/i },
  { key: 'projects', pattern: /^(?:selected\s+)?projects?$/i },
  { key: 'coverLetter', pattern: /^(?:cover letter|letter of motivation)$/i },
];

const SKILL_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'have',
  'in', 'into', 'is', 'it', 'of', 'on', 'or', 'our', 'the', 'their', 'this',
  'to', 'with', 'work', 'years', 'year', 'headquartered',
]);

const LOCATION_TERMS = new Set([
  'africa', 'abuja', 'accra', 'addis ababa', 'algeria', 'angola', 'atlanta',
  'australia', 'california', 'canada', 'cape town', 'chicago', 'delhi', 'dubai',
  'egypt', 'ethiopia', 'europe', 'florida', 'georgia', 'ghana', 'houston',
  'india', 'illinois', 'johannesburg', 'kenya', 'lagos', 'london', 'los angeles',
  'massachusetts', 'nairobi', 'new jersey', 'new york', 'nigeria', 'ontario',
  'pretoria', 'south africa', 'texas', 'toronto', 'united kingdom',
  'united states', 'usa', 'washington',
]);
const NON_SKILL_REQUIREMENT_TERMS = /\b(?:headquartered|headquarters|company name|located in|location|relocation|work authorization|authorized to work|authorised to work|visa sponsorship|citizenship|timezone|time zone|business hours|on[- ]site|in[- ]office|remote|hybrid)\b/i;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const containsPhrase = (text, phrase) => new RegExp(
  `(^|[^a-z0-9+#])${escapeRegex(phrase.toLowerCase())}(?=$|[^a-z0-9+#])`,
  'i',
).test(text);

const normalizeLines = (text) => String(text || '')
  .replace(/\u0000/g, ' ')
  .replace(/\r\n?/g, '\n')
  .split('\n')
  .map((line) => line.replace(/[ \t]+$/g, '').trim())
  .filter((line) => line.length > 0);

export const splitCvSections = (text) => {
  const lines = normalizeLines(text);
  const sections = {
    header: [],
    summary: [],
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    other: [],
    coverLetter: [],
  };
  let current = 'header';
  let coverLetterStarted = false;
  let coverLetterIndex = -1;
  const bulletLines = [];

  for (const [index, rawLine] of lines.entries()) {
    const heading = rawLine.replace(/[:\s]+$/, '');
    const matchedHeading = SECTION_HEADINGS.find(({ pattern }) => pattern.test(heading));
    if (matchedHeading) {
      current = matchedHeading.key;
      if (current === 'coverLetter') {
        coverLetterStarted = true;
        coverLetterIndex = index;
      }
      continue;
    }
    const isBullet = /^(?:[-*•▪◦‣]|\d+[.)])\s+/.test(rawLine);
    const line = rawLine.replace(/^(?:[-*•▪◦‣]|\d+[.)])\s+/, '').trim();
    if (!line) continue;
    sections[current].push(line);
    if (current === 'experience' && isBullet) bulletLines.push(line);
  }

  if (!sections.summary.length) {
    sections.summary = sections.other.filter((line) => line.length > 40).slice(0, 3);
  }
  const experienceBullets = bulletLines.length
    ? bulletLines
    : sections.experience.filter((line) => line.length > 20);
  return {
    ...sections,
    header: sections.header.join('\n'),
    summary: sections.summary.join('\n'),
    skills: sections.skills,
    experience: sections.experience,
    education: sections.education,
    certifications: sections.certifications,
    projects: sections.projects,
    other: sections.other,
    coverLetter: sections.coverLetter.join('\n'),
    experienceBullets,
    coverLetterStarted,
    resumeText: coverLetterIndex >= 0 ? lines.slice(0, coverLetterIndex).join('\n') : lines.join('\n'),
    sourceLines: lines,
  };
};

const matchingSkillFamilies = (text) => {
  const source = String(text || '').toLowerCase();
  const matched = SKILL_FAMILIES
    .filter(({ variants }) => variants.some((variant) => containsPhrase(source, variant)))
    .map(({ canonical }) => canonical);
  if (/\bstakeholder communication\b/i.test(source)
    && !/\b(?:written|verbal)?\s*communication skills\b|\bwritten communication\b|\bverbal communication\b/i.test(source)) {
    return matched.filter((skill) => skill !== 'communication');
  }
  return matched;
};

export const extractSkillPhrases = (text) => matchingSkillFamilies(String(text || '').toLowerCase());

export const filterSkillNoise = (text) => {
  const normalized = String(text || '').toLowerCase();
  const withoutLocations = [...LOCATION_TERMS].reduce(
    (value, term) => value.replace(new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi'), ' '),
    normalized,
  );
  const tokens = withoutLocations
    .split(/[^a-z0-9+#.]+/i)
    .filter(Boolean)
    .filter((token) => !SKILL_STOP_WORDS.has(token)
      && !/^\d+(?:[.,]\d+)?(?:%|x|k|m|b)?$/i.test(token));
  const recognized = matchingSkillFamilies(withoutLocations);
  return { tokens, skills: recognized };
};

export const extractLogistics = (cvText, jobDescription) => {
  const extract = (text) => {
    const value = String(text || '');
    const find = (pattern) => value.match(pattern)?.[0]?.trim() || null;
    const hours = find(/(?:\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|to|–)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:daily|per week|weekly)?\b|\b(?:US|U\.S\.)\s+business hours\b)/i);
    const timezone = find(/\b(?:Eastern|Central|Mountain|Pacific|Greenwich|West Africa|Central Africa|East Africa|UTC|GMT)(?:\s*(?:standard|daylight|mean))?(?:\s*time)?(?:\s*[+-]\d{1,2}(?::?\d{2})?)?\b/i);
    const workMode = find(/\b(?:fully remote|remote|hybrid|on[- ]site|in[- ]office|office[- ]based)\b/i);
    const remoteScope = find(/\bremote eligibility\s*[:\-]\s*[^\n.;]+|\bremote\s+(?:within|in|from|only in)\s+[A-Za-z][A-Za-z .,'-]{0,30}|\bremote\s*[-–:]\s*(?:within\s+|in\s+|from\s+)?[A-Za-z][A-Za-z .,'-]{0,30}|\b(?:worldwide|global(?:ly)?|anywhere)\s+remote\b/i);
    const relocation = find(/\b(?:relocation (?:required|available|provided|not available)|must relocate|willing to relocate|no relocation)\b/i);
    const authorization = find(/\b(?:work authorization|authorized to work|authorised to work|visa sponsorship|sponsorship available|must be eligible to work|right to work|citizen(?:ship)?)\b/i);
    return { hours, timezone, workMode, remoteScope, relocation, authorization };
  };

  const candidate = extract(cvText);
  const requirements = extract(jobDescription);
  const notes = [];
  if (requirements.hours) notes.push(`Role schedule: ${requirements.hours}.`);
  if (requirements.timezone) notes.push(`Role timezone: ${requirements.timezone}.`);
  if (requirements.workMode) notes.push(`Work arrangement: ${requirements.workMode}.`);
  if (requirements.remoteScope) notes.push(`Remote eligibility: ${requirements.remoteScope}.`);
  if (requirements.relocation) notes.push(`Relocation condition: ${requirements.relocation}.`);
  if (requirements.authorization) notes.push(`Work authorization: ${requirements.authorization}.`);
  if (candidate.timezone && requirements.timezone
    && candidate.timezone.toLowerCase() !== requirements.timezone.toLowerCase()) {
    notes.push(`Confirm timezone overlap; your CV mentions ${candidate.timezone}.`);
  }
  if (candidate.authorization && requirements.authorization) {
    notes.push('Confirm that your work authorization meets the role requirement.');
  }
  if (candidate.relocation && requirements.relocation) {
    notes.push('Confirm that your relocation availability meets the role requirement.');
  }
  const status = notes.length
    ? 'review'
    : Object.values(requirements).some(Boolean)
      ? 'check_required'
      : 'not_specified';
  return { status, candidate, requirements, notes };
};

const extractExperienceYears = (text) => {
  const section = splitCvSections(text).experience.join('\n');
  const ranges = [...section.matchAll(/\b((?:19|20)\d{2})\s*(?:-|–|to|through)\s*((?:19|20)\d{2}|present|current)\b/gi)];
  if (!ranges.length) return null;
  const currentYear = new Date().getFullYear();
  const intervals = ranges.map(([, start, end]) => {
    const startYear = Number(start);
    const endYear = /present|current/i.test(end) ? currentYear : Number(end);
    return { start: startYear, end: Math.max(startYear, endYear) };
  }).sort((left, right) => left.start - right.start);
  const merged = [];
  for (const interval of intervals) {
    const previous = merged.at(-1);
    if (previous && interval.start <= previous.end) {
      previous.end = Math.max(previous.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }
  return Math.min(50, merged.reduce((sum, interval) => sum + interval.end - interval.start, 0));
};

const extractRequiredYears = (text) => {
  const years = String(text || '').match(/\b(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:relevant\s+)?experience\b/i);
  return years ? Number(years[1]) : null;
};

const extractMustHaveRequirements = (text) => normalizeLines(text)
  .map((line) => line.replace(/^(?:[-*•▪◦‣]|\d+[.)])\s+/, '').trim())
  .filter((line) => /\b(?:must|required|essential|minimum|at least|proven experience)\b/i.test(line))
  .filter((line) => line.length >= 12)
  .filter((line) => extractRequiredYears(line) === null)
  .filter((line) => !/\b\d+(?:[,.]\d+)?\s*(?:%|x|k|m|b)\b/i.test(line))
  .filter((line) => !NON_SKILL_REQUIREMENT_TERMS.test(line))
  .filter((line) => ![...LOCATION_TERMS].some((term) => containsPhrase(line, term)))
  .slice(0, 12);

export const getAtsFlags = (text) => {
  const source = String(text || '');
  const lines = source.split(/\r?\n/);
  const flags = [];
  if (/\t{1,}|\|.{2,}\|/.test(source) || lines.some((line) => /\S {3,}\S/.test(line))) {
    flags.push('Possible table or multi-column layout may parse out of order.');
  }
  if (source.length > 800 && lines.filter((line) => line.trim()).length <= 3) {
    flags.push('Dense text blocks may be difficult for applicant tracking systems to parse.');
  }
  const sections = splitCvSections(source);
  if (!sections.experience.length) flags.push('No clearly labeled experience section was detected.');
  if (sections.experience.length && !/\b(?:19|20)\d{2}\b/.test(sections.experience.join(' '))) {
    flags.push('Experience dates were not detected; add clear month/year ranges where applicable.');
  }
  if (!sections.skills.length) flags.push('No clearly labeled skills section was detected.');
  return flags;
};

export const analyzeCvMatch = (cvText, jobDescription) => {
  const cvLower = String(cvText || '').toLowerCase();
  const jobText = String(jobDescription || '');
  const cvSkills = new Set(matchingSkillFamilies(cvLower));
  const requiredSkills = matchingSkillFamilies(jobText);
  const matched = requiredSkills.filter((skill) => cvSkills.has(skill));
  const missing = requiredSkills.filter((skill) => !cvSkills.has(skill));
  const skillScore = requiredSkills.length
    ? Math.round((matched.length / requiredSkills.length) * 100)
    : 50;

  const requiredYears = extractRequiredYears(jobText);
  const candidateYears = extractExperienceYears(cvText);
  let experienceScore = 60;
  let experienceStatus = 'not_specified';
  let experienceNotes = 'The role does not state a clear minimum years-of-experience requirement.';
  if (requiredYears !== null && candidateYears !== null) {
    experienceScore = Math.min(100, Math.round((candidateYears / requiredYears) * 100));
    experienceStatus = candidateYears >= requiredYears ? 'evidence_found' : 'potential_gap';
    experienceNotes = `The role asks for ${requiredYears}+ years; approximately ${candidateYears} years were detected in dated CV experience entries.`;
  } else if (requiredYears !== null) {
    experienceScore = 50;
    experienceStatus = 'needs_review';
    experienceNotes = `The role asks for ${requiredYears}+ years; clear dated experience ranges were not detected in the CV.`;
  }

  const mustHaveLines = extractMustHaveRequirements(jobText);
  const skillGaps = missing.map((skill) => ({
    skill,
    evidence: null,
    guidance: `If you have verifiable ${skill} experience, add a specific example to your CV; otherwise, treat this as a development gap.`,
  }));
  const otherGaps = mustHaveLines
    .filter((requirement) => !requiredSkills.some((skill) => containsPhrase(requirement, skill)))
    .filter((requirement) => !containsPhrase(cvLower, requirement))
    .map((requirement) => ({
      skill: requirement,
      evidence: null,
      guidance: 'Review the requirement and add a concrete CV example only if it reflects your actual experience.',
    }));
  const logistics = extractLogistics(cvText, jobText);

  return {
    overall_score: Math.round(skillScore * 0.7 + experienceScore * 0.3),
    skills: { score: skillScore, matched, required: requiredSkills },
    experience: {
      score: experienceScore,
      status: experienceStatus,
      required_years: requiredYears,
      candidate_years: candidateYears,
      notes: experienceNotes,
    },
    logistics,
    must_have_gaps: [...skillGaps, ...otherGaps].slice(0, 5),
    ats_flags: getAtsFlags(cvText),
  };
};

const GROUNDING_STOP_WORDS = new Set([
  ...SKILL_STOP_WORDS,
  'a', 'achieved', 'across', 'an', 'as', 'at', 'built', 'by', 'delivered',
  'for', 'from', 'in', 'including', 'led', 'of', 'on', 'or', 'the', 'to',
  'using', 'with',
]);

const hasGroundedFacts = (original, suggestion, sourceText) => {
  const suggestionTokens = String(suggestion || '').toLowerCase().match(/[a-z][a-z0-9+#.-]*/g) || [];
  const sourceTokens = new Set(`${sourceText} ${original}`.toLowerCase().match(/[a-z][a-z0-9+#.-]*/g) || []);
  const unsupported = suggestionTokens.filter((token) =>
    token.length > 2
    && !GROUNDING_STOP_WORDS.has(token)
    && !sourceTokens.has(token));
  const suggestionNumbers = String(suggestion || '').match(/\b\d+(?:[.,]\d+)?%?\b/g) || [];
  const sourceNumbers = new Set(`${sourceText} ${original}`.match(/\b\d+(?:[.,]\d+)?%?\b/g) || []);
  return unsupported.length === 0 && suggestionNumbers.every((number) => sourceNumbers.has(number));
};

export const normalizeAiRewrites = (payload, sourceText) => {
  const rewrites = Array.isArray(payload?.rewrites)
    ? payload.rewrites.slice(0, 8).map((entry) => {
      const original = typeof entry?.original === 'string' ? entry.original.slice(0, 800) : '';
      const proposed = typeof entry?.suggested === 'string' ? entry.suggested.slice(0, 1000) : '';
      const reason = typeof entry?.reason === 'string' ? entry.reason.slice(0, 500) : '';
      const source = String(sourceText || '').toLowerCase().replace(/\s+/g, ' ');
      const originalGrounded = original
        && source.includes(original.toLowerCase().replace(/\s+/g, ' '));
      const grounded = originalGrounded && proposed && hasGroundedFacts(original, proposed, sourceText);
      return {
        original,
        suggested: grounded ? proposed : '',
        reason,
        accepted: false,
        requires_review: true,
        add_only_if_true: Boolean(proposed && !grounded),
        unverified_addition: proposed && !grounded ? proposed : '',
      };
    })
    : [];
  const summaryOriginal = typeof payload?.summary_rewrite?.original === 'string'
    ? payload.summary_rewrite.original.slice(0, 1200)
    : '';
  const summaryProposed = typeof payload?.summary_rewrite?.suggested === 'string'
    ? payload.summary_rewrite.suggested.slice(0, 1200)
    : '';
  const source = String(sourceText || '').toLowerCase().replace(/\s+/g, ' ');
  const originalSummaryGrounded = summaryOriginal
    && source.includes(summaryOriginal.toLowerCase().replace(/\s+/g, ' '));
  const summaryGrounded = originalSummaryGrounded && summaryProposed
    && hasGroundedFacts(summaryOriginal, summaryProposed, sourceText);
  return {
    rewrites,
    summary_rewrite: {
      original: summaryOriginal,
      suggested: summaryGrounded ? summaryProposed : '',
      reason: typeof payload?.summary_rewrite?.reason === 'string'
        ? payload.summary_rewrite.reason.slice(0, 500)
        : '',
      accepted: false,
      requires_review: true,
      add_only_if_true: Boolean(summaryProposed && !summaryGrounded),
      unverified_addition: summaryProposed && !summaryGrounded ? summaryProposed : '',
    },
  };
};

export const redactCvPii = (text) => {
  let redacted = String(text || '');
  redacted = redacted.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]');
  redacted = redacted.replace(
    /\b(?:\+?\d{1,3}[\s().-]?)?(?:\d[\s().-]?){7,14}\d\b/g,
    (match) => /^(?:19|20)\d{2}\s*[-–]\s*(?:19|20)\d{2}$/i.test(match) ? match : '[PHONE]',
  );
  redacted = redacted.replace(
    /^\s*(?:address|home address|street address|residential address)\s*[:\-].*$/gim,
    '[ADDRESS]',
  );
  redacted = redacted.replace(
    /^\s*\d{1,6}\s+[\w.'-]+(?:\s+[\w.'-]+){0,5}\s+(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd)\b.*$/gim,
    '[ADDRESS]',
  );
  const candidateName = splitCvSections(text).header.split('\n')
    .slice(0, 4)
    .map((line) => line
      .split(/\s*(?:\||•|·|,|\s+-\s+)\s*/)[0]
      .replace(/^(?:candidate\s+)?name\s*[:\-]\s*/i, '')
      .replace(/\s*\([^)]*\).*$/, '')
      .trim())
    .find((line) => /^[A-Za-z][A-Za-z.'-]+(?:\s+[A-Za-z][A-Za-z.'-]+){1,3}$/.test(line)
      && !/\b(?:curriculum vitae|resume|résumé|cv|engineer|developer|manager|analyst|designer|consultant|specialist|director|officer)\b/i.test(line));
  if (candidateName) {
    redacted = redacted.replace(new RegExp(escapeRegex(candidateName), 'gi'), '[CANDIDATE_NAME]');
  }
  return redacted;
};

export const createAiReviewPrompt = (cvText, jobDescription) => ({
  system: [
    'You are a CV editor. Return only valid JSON with keys rewrites and summary_rewrite.',
    'Never invent employers, job titles, tools, skills, certifications, dates, metrics, or achievements.',
    'Use only verifiable facts explicitly present in the redacted CV. You may reorganize and clarify existing wording.',
    'If a useful addition is not explicitly supported, place it in an unverified suggestion and flag it Add only if true.',
    'Keep PII placeholders unchanged and do not infer their values.',
  ].join(' '),
  user: JSON.stringify({
    cv: redactCvPii(cvText),
    job_description: redactCvPii(jobDescription),
    output_schema: {
      rewrites: [{ original: 'existing CV sentence', suggested: 'grounded rewrite', reason: 'short explanation' }],
      summary_rewrite: { original: 'existing summary', suggested: 'grounded summary', reason: 'short explanation' },
    },
  }),
});

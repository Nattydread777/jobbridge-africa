import { analyzeCvMatch, extractSkillPhrases } from './cvAnalysisService.js';
import {
  deriveJobSignals,
  isEligibleJobForUser,
} from '../utils/jobSignals.js';

const SCORE_WEIGHTS = {
  roles: 0.28,
  skills: 0.28,
  experience: 0.19,
  location: 0.07,
  workArrangement: 0.04,
  salary: 0.03,
  recency: 0.03,
  africaFirst: 0.02,
  eligibility: 0.06,
};

const GENERIC_ROLE_WORDS = new Set([
  'a',
  'an',
  'and',
  'assistant',
  'associate',
  'analyst',
  'chief',
  'consultant',
  'coordinator',
  'developer',
  'director',
  'designer',
  'engineer',
  'engineering',
  'executive',
  'head',
  'intern',
  'junior',
  'lead',
  'leader',
  'manager',
  'management',
  'officer',
  'of',
  'principal',
  'professional',
  'representative',
  'senior',
  'specialist',
  'supervisor',
  'the',
]);

const experienceYearsFor = (user) => {
  const totalMilliseconds = (user.experience || []).reduce((total, entry) => {
    const start = new Date(entry.startDate);
    const end = entry.endDate && !/present|current/i.test(entry.endDate)
      ? new Date(entry.endDate)
      : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return total;
    return total + (end.getTime() - start.getTime());
  }, 0);
  if (totalMilliseconds === 0) return null;
  return totalMilliseconds / (1000 * 60 * 60 * 24 * 365.25);
};

const seniorityScore = (experienceYears, seniority) => {
  const level = String(seniority || '').toLowerCase();
  if (!level || experienceYears === null) return 0.5;
  if (/entry|junior|graduate|intern/.test(level)) return experienceYears <= 2 ? 1 : 0.4;
  if (/mid|intermediate/.test(level)) return experienceYears >= 2 && experienceYears <= 7 ? 1 : 0.5;
  if (/senior|lead|principal|executive/.test(level)) return experienceYears >= 5 ? 1 : 0.3;
  return 0.5;
};

const salaryScore = (job) => {
  const salary = String(job.salary || job.salaryRange || '');
  return salary && !/^competitive$/i.test(salary) ? 0.75 : 0.4;
};

const normalizeWords = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .trim()
  .split(/\s+/)
  .filter(Boolean);

const roleWords = (value) => normalizeWords(value)
  .filter((word) => !GENERIC_ROLE_WORDS.has(word));

const roleSimilarity = (profileRole, jobRole) => {
  const profileWords = roleWords(profileRole);
  const jobWords = roleWords(jobRole);
  if (!profileWords.length || !jobWords.length) return 0;
  const jobWordSet = new Set(jobWords);
  const sharedWords = profileWords.filter((word) => jobWordSet.has(word)).length;
  if (!sharedWords) return 0;
  return Number((sharedWords / Math.max(profileWords.length, jobWords.length)).toFixed(3));
};

const roleFitScore = (targetRoles, jobRoleText) => {
  if (!targetRoles.length) return null;
  return Math.max(...targetRoles.map((role) => roleSimilarity(role, jobRoleText)));
};

const uniqueSkillPhrases = (text) => [...new Set(extractSkillPhrases(text))];

const eligibilityDescription = (scope) => ({
  worldwide: 'Worldwide / anywhere remote',
  africa_friendly: 'Africa/EMEA-open remote or an African work location',
}[scope] || 'Geographic eligibility could not be confirmed');

const scoreLabel = (score) => (
  score >= 0.75 ? 'strong' : score >= 0.4 ? 'partial' : 'limited'
);

export const isRecommendationProfileReady = (user) => Boolean(
  user?.role === 'job_seeker'
  && (
    user.workPreferences?.targetRoles?.some((role) => String(role).trim())
    || user.skills?.some((skill) => String(skill).trim())
    || user.experience?.some((entry) => String(entry.position || '').trim())
  ),
);

export const rankJobsForUser = (user, jobs) => {
  const experiences = user.experience || [];
  const experienceText = experiences.map((entry) => [
    entry.position,
    entry.company,
    entry.startDate,
    entry.endDate,
    entry.description,
  ].filter(Boolean).join(' ')).join('\n');
  const profileText = [
    `Summary:\n${user.bio || ''}`,
    `Skills:\n${(user.skills || []).join(', ')}`,
    `Core skills:\n${Object.values(user.skillGroups || {}).flat().join(', ')}`,
    `Experience:\n${experienceText}`,
  ].join('\n');
  const profileSkills = uniqueSkillPhrases(profileText);
  const userSkillSet = new Set(profileSkills);
  const experienceSkills = uniqueSkillPhrases(experienceText);
  const experienceSkillSet = new Set(experienceSkills);
  const userCountry = String(user.country || '').toLowerCase();
  const preferredLocations = (user.workPreferences?.preferredLocations || [])
    .map((location) => String(location).toLowerCase());
  const targetRoles = (user.workPreferences?.targetRoles || [])
    .map((role) => String(role).trim())
    .filter(Boolean);
  const experienceRoles = experiences
    .map((entry) => String(entry.position || '').trim())
    .filter(Boolean);
  const experienceYears = experienceYearsFor(user);
  const bio = (user.bio || '').toLowerCase();
  const userPrefersRemote = (user.workPreferences?.workModes || [])
    .some((mode) => String(mode).toLowerCase() === 'remote') || /\bremote\b/.test(bio);

  return jobs
    .filter((job) => isEligibleJobForUser(job, user.languages))
    .map((job) => {
      const jobSignals = deriveJobSignals(job);
      const globalRemote = jobSignals.eligibilityScope === 'worldwide';
      const remoteRole = job.isRemote
        || job.isWorldwideRemote
        || String(job.workplaceType || '').toLowerCase() === 'remote'
        || String(job.jobType || '').toLowerCase() === 'remote'
        || /\bremote\b/i.test(`${job.location || ''} ${job.locationRestriction || ''}`);
      const jobText = [
        job.title,
        job.department,
        job.description,
        job.fullDescription,
        job.requirements,
        job.qualifications,
        job.responsibilities,
        ...(job.categories || []),
        ...(job.tags || []),
      ].filter(Boolean).join(' ');
      const jobRoleText = [
        job.title,
        job.department,
        ...(job.categories || []),
      ].filter(Boolean).join(' ');
      const requiredSkills = uniqueSkillPhrases(jobText);
      const matchedSkills = requiredSkills.filter((skill) => userSkillSet.has(skill));
      const experienceMatchedSkills = requiredSkills.filter((skill) => experienceSkillSet.has(skill));
      const skillScore = requiredSkills.length
        ? matchedSkills.length / requiredSkills.length
        : (profileSkills.length ? 0.25 : 0);
      const targetRoleScore = roleFitScore(targetRoles, jobRoleText);
      const experienceRoleScore = experienceRoles.length
        ? Math.max(...experienceRoles.map((role) => roleSimilarity(role, jobRoleText)))
        : null;
      const roleScore = targetRoleScore ?? experienceRoleScore ?? 0;
      const experienceSkillScore = requiredSkills.length
        ? experienceMatchedSkills.length / requiredSkills.length
        : 0;
      const experienceDomainScore = experienceRoleScore === null
        ? 0.25
        : Math.min(1, (experienceRoleScore * 0.7) + (experienceSkillScore * 0.3));
      const experienceScore = experiences.length
        ? (experienceDomainScore * 0.8) + (seniorityScore(experienceYears, job.seniority) * 0.2)
        : 0.25;
      const locationText = `${job.location || ''} ${job.locationRestriction || ''}`.toLowerCase();
      const locationScore = userCountry && locationText.includes(userCountry)
        ? 1
        : preferredLocations.some((location) => locationText.includes(location))
          ? 1
          : globalRemote
            ? 0.85
            : jobSignals.eligibilityScope === 'africa_friendly'
              ? 0.75
              : 0;
      const remoteScore = userPrefersRemote
        ? (remoteRole ? 1 : 0.35)
        : (remoteRole ? 0.7 : 1);
      const postedAt = new Date(job.pubDate || job.createdAt);
      const daysOld = Number.isNaN(postedAt.getTime())
        ? 30
        : (Date.now() - postedAt.getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, Math.min(1, 1 - daysOld / 30));
      const isAfricanDirectPosting = job.source === 'employer'
        && job.isDirectPosting !== false
        && jobSignals.eligibilityScope === 'africa_friendly';
      const breakdown = {
        roles: roleScore,
        skills: skillScore,
        experience: experienceScore,
        location: locationScore,
        workArrangement: remoteScore,
        salary: salaryScore(job),
        recency: recencyScore,
        africaFirst: isAfricanDirectPosting ? 1 : (job.source === 'employer' ? 0.7 : 0.4),
        eligibility: globalRemote ? 1 : 0.95,
      };
      let score = Object.entries(SCORE_WEIGHTS)
        .reduce((sum, [factor, weight]) => sum + weight * breakdown[factor], 0);
      const hasRoleMismatch = (targetRoleScore !== null && targetRoleScore < 0.25)
        || (experienceRoleScore !== null && experienceRoleScore < 0.25);
      if (hasRoleMismatch) score = Math.min(score, 0.59);

      const fitContext = analyzeCvMatch(profileText, jobText);
      const targetRoleSummary = targetRoles.length
        ? `${scoreLabel(targetRoleScore)} alignment with ${targetRoles.join(', ')}`
        : experienceRoles.length
          ? `${scoreLabel(experienceRoleScore)} alignment with your recorded work titles`
          : 'Add target roles or job titles to improve role alignment.';
      const experienceSummary = experienceRoles.length
        ? `${scoreLabel(experienceRoleScore)} title/domain alignment across ${experienceRoles.length} recorded role${experienceRoles.length === 1 ? '' : 's'}; ${experienceMatchedSkills.length} required skill${experienceMatchedSkills.length === 1 ? '' : 's'} found in work history.`
        : 'No work experience titles are available for comparison.';
      const matchReasons = [
        matchedSkills.length
          ? `Skills: ${matchedSkills.length} of ${requiredSkills.length} recognized job requirements match your profile (${matchedSkills.slice(0, 5).join(', ')}).`
          : 'Skills: no recognized core skill overlap was found.',
        `Experience: ${experienceSummary}`,
        `Target roles: ${targetRoleSummary}`,
        `Eligibility: ${eligibilityDescription(jobSignals.eligibilityScope)}; location fit is ${scoreLabel(locationScore)}.`,
        `Logistics: ${fitContext.logistics.status.replaceAll('_', ' ')}${fitContext.logistics.notes.length ? ` — ${fitContext.logistics.notes.join(' ')}` : ''}`,
      ];

      return {
        job: {
          ...(typeof job.toObject === 'function' ? job.toObject() : job),
          ...jobSignals,
        },
        score: Number(score.toFixed(4)),
        matchBreakdown: Object.fromEntries(
          Object.entries(breakdown).map(([factor, value]) => [factor, Number(value.toFixed(3))]),
        ),
        fit_context: {
          overall_score: fitContext.overall_score,
          skills: {
            score: fitContext.skills.score,
            matched: matchedSkills,
            required: requiredSkills,
          },
          experience: {
            ...fitContext.experience,
            roleFit: {
              score: experienceRoleScore ?? 0,
              roles: experienceRoles,
              status: experienceRoleScore === null ? 'not_provided' : scoreLabel(experienceRoleScore),
            },
          },
          target_role: {
            score: targetRoleScore ?? 0,
            targets: targetRoles,
            status: targetRoleScore === null ? 'not_provided' : scoreLabel(targetRoleScore),
          },
          eligibility: {
            scope: jobSignals.eligibilityScope,
            status: 'eligible',
            explanation: eligibilityDescription(jobSignals.eligibilityScope),
            languageRequirements: jobSignals.languageRequirements,
          },
          logistics: fitContext.logistics,
          must_have_gaps: fitContext.must_have_gaps,
          match_reasons: matchReasons,
        },
      };
    })
    .sort((a, b) => b.score - a.score);
};

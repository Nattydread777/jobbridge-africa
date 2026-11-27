import { analyzeCvMatch, extractSkillPhrases } from './cvAnalysisService.js';
import { deriveJobSignals } from '../utils/jobSignals.js';

const SCORE_WEIGHTS = {
  roles: 0.14,
  skills: 0.24,
  experience: 0.12,
  location: 0.14,
  workArrangement: 0.07,
  salary: 0.05,
  recency: 0.07,
  africaFirst: 0.05,
  eligibility: 0.12,
};

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

const roleFitScore = (targetRoles, job) => {
  if (!targetRoles.length) return 0.5;
  const jobTitle = normalizeWords([job.title, ...(job.categories || [])].join(' '));
  const jobWords = new Set(jobTitle);
  return Math.max(...targetRoles.map((role) => {
    const roleWords = normalizeWords(role);
    if (!roleWords.length) return 0;
    if (jobTitle.join(' ').includes(roleWords.join(' ')) || roleWords.join(' ').includes(jobTitle.join(' '))) {
      return 1;
    }
    return roleWords.filter((word) => jobWords.has(word)).length / roleWords.length;
  }));
};

export const isRecommendationProfileReady = (user) => Boolean(
  user?.role === 'job_seeker'
  && (
    user.workPreferences?.targetRoles?.some((role) => String(role).trim())
    || user.skills?.some((skill) => String(skill).trim())
    || user.experience?.some((entry) => String(entry.position || '').trim())
  ),
);

export const rankJobsForUser = (user, jobs) => {
  const experienceText = (user.experience || []).map((entry) => [
    entry.position,
    entry.company,
    entry.startDate,
    entry.endDate,
    entry.description,
  ].filter(Boolean).join(' ')).join('\n');
  const profileText = [
    `Summary:\n${user.bio || ''}`,
    `Skills:\n${(user.skills || []).join(', ')}`,
    `Experience:\n${experienceText}`,
  ].join('\n');
  const userSkills = extractSkillPhrases(profileText);
  const userSkillSet = new Set(userSkills);
  const userCountry = (user.country || '').toLowerCase();
  const preferredLocations = (user.workPreferences?.preferredLocations || [])
    .map((location) => String(location).toLowerCase());
  const targetRoles = (user.workPreferences?.targetRoles || []).filter((role) => String(role).trim());
  const experienceYears = experienceYearsFor(user);
  const bio = (user.bio || '').toLowerCase();
  const userPrefersRemote = (user.workPreferences?.workModes || [])
    .some((mode) => String(mode).toLowerCase() === 'remote') || /\bremote\b/.test(bio);

  return jobs.map((job) => {
    const jobSignals = deriveJobSignals(job);
    const globalRemote = jobSignals.eligibilityScope === 'worldwide';
    const remoteRole = job.isRemote
      || job.isWorldwideRemote
      || job.workplaceType === 'remote'
      || job.jobType === 'Remote';
    const jobText = [
      job.title,
      job.description,
      job.fullDescription,
      job.requirements,
      job.qualifications,
      job.responsibilities,
      ...(job.tags || []),
    ].filter(Boolean).join(' ');
    const requiredSkills = extractSkillPhrases(jobText);
    const matchedSkills = requiredSkills.filter((skill) => userSkillSet.has(skill));
    const skillScore = requiredSkills.length
      ? matchedSkills.length / requiredSkills.length
      : (userSkills.length ? 0.5 : 0);
    const locationText = `${job.location || ''} ${job.locationRestriction || ''}`.toLowerCase();
    const locationScore = userCountry && locationText.includes(userCountry)
      ? 1
      : preferredLocations.some((location) => locationText.includes(location))
        ? 1
        : userCountry
          ? (globalRemote ? 0.85 : jobSignals.eligibilityScope === 'africa_friendly' ? 0.75 : 0)
          : (globalRemote ? 0.75 : 0.5);
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
      && /\b(africa|algeria|angola|benin|botswana|burkina faso|burundi|cabo verde|cameroon|central african republic|chad|comoros|democratic republic of the congo|djibouti|egypt|equatorial guinea|eritrea|eswatini|ethiopia|gabon|gambia|ghana|guinea|guinea-bissau|ivory coast|kenya|lesotho|liberia|libya|madagascar|malawi|mali|mauritania|mauritius|morocco|mozambique|namibia|niger|nigeria|republic of the congo|rwanda|sao tome and principe|senegal|seychelles|sierra leone|somalia|south africa|south sudan|sudan|tanzania|togo|tunisia|uganda|zambia|zimbabwe)\b/i
        .test(`${job.location || ''} ${job.locationRestriction || ''}`);
    const breakdown = {
      roles: roleFitScore(targetRoles, job),
      skills: skillScore,
      experience: seniorityScore(experienceYears, job.seniority),
      location: locationScore,
      workArrangement: remoteScore,
      salary: salaryScore(job),
      recency: recencyScore,
      africaFirst: isAfricanDirectPosting ? 1 : (job.source === 'employer' ? 0.7 : 0.4),
      eligibility: {
        worldwide: 1,
        africa_friendly: 0.95,
        region_restricted: 0,
        unspecified: 0.5,
      }[jobSignals.eligibilityScope],
    };
    const score = Object.entries(SCORE_WEIGHTS)
      .reduce((sum, [factor, weight]) => sum + weight * breakdown[factor], 0);
    const fitContext = analyzeCvMatch(profileText, jobText);

    return {
      job: { ...job.toObject(), ...jobSignals },
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
        experience: fitContext.experience,
        logistics: fitContext.logistics,
        must_have_gaps: fitContext.must_have_gaps,
      },
    };
  }).sort((a, b) => b.score - a.score);
};

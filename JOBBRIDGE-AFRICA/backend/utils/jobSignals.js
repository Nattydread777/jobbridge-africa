const NON_AFRICAN_REGION = String.raw`(?:united states|u\.?\s*s\.?a?\.?|u\.?s\.?|usa|canada|united kingdom|u\.?k\.?|great britain|european union|europe|e\.?u\.?|north america|south america|latin america|asia(?:\s*[-/]?\s*pacific)?|apac|australia|new zealand|india|pakistan|singapore|japan|germany|france|ireland|netherlands|switzerland|mexico|brazil)`;
const RESTRICTION_CONTEXT = String.raw`(?:only|restricted|limited|resident|residents|citizen|citizens|citizenship|authorization|authorisation|eligible|eligibility|except|excluding|must\s+(?:be\s+)?based|must\s+reside)`;

export const REGION_RESTRICTION_PATTERN = String.raw`(?:\b(?:${NON_AFRICAN_REGION})\b.{0,45}\b${RESTRICTION_CONTEXT}\b|\b${RESTRICTION_CONTEXT}\b.{0,45}\b(?:${NON_AFRICAN_REGION})\b|\bfederal(?:\s+government)?\s+(?:role|position|job|agency|contract|clearance)\b|\bcitizenship required\b|\bactive security clearance\b)`;
export const REGION_LOCATION_PATTERN = String.raw`^\s*[(),]*\s*(?:remote\s*[-–:,()]?\s*(?:(?:in|within|from)\s*)?)?(?:${NON_AFRICAN_REGION})(?:\s*[-–:,()]?\s*(?:only|remote))?\s*[(),]*\s*$`;
export const AFRICA_REGION_PATTERN = String.raw`\b(?:africa|algeria|angola|benin|botswana|burkina faso|burundi|cabo verde|cameroon|central african republic|chad|comoros|democratic republic of the congo|djibouti|egypt|equatorial guinea|eritrea|eswatini|ethiopia|gabon|gambia|ghana|guinea|guinea-bissau|ivory coast|kenya|lesotho|liberia|libya|madagascar|malawi|mali|mauritania|mauritius|morocco|mozambique|namibia|niger|nigeria|republic of the congo|rwanda|sao tome and principe|senegal|seychelles|sierra leone|somalia|south africa|south sudan|sudan|tanzania|togo|tunisia|uganda|zambia|zimbabwe)\b`;
export const AFRICA_COUNTRY_CODE_PATTERN = String.raw`(?:^\s*(?:DZ|AO|BJ|BW|BF|BI|CV|CM|CF|TD|KM|CG|CD|CI|DJ|EG|GQ|ER|SZ|ET|GA|GM|GH|GN|GW|KE|LS|LR|LY|MG|MW|ML|MR|MU|MA|MZ|NE|NG|RW|ST|SN|SC|SL|SO|ZA|SS|SD|TZ|TG|TN|UG|ZM|ZW)\s*$|[,(·/]\s*(?:DZ|AO|BJ|BW|BF|BI|CV|CM|CF|TD|KM|CG|CD|CI|DJ|EG|GQ|ER|SZ|ET|GA|GM|GH|GN|GW|KE|LS|LR|LY|MG|MW|ML|MR|MU|MA|MZ|NE|NG|RW|ST|SN|SC|SL|SO|ZA|SS|SD|TZ|TG|TN|UG|ZM|ZW)\s*(?:[),·/]|$))`;
export const WORLDWIDE_PATTERN = String.raw`\b(?:worldwide|global(?:ly)?|anywhere|any location|no geographic restrictions)\b`;
export const GLOBAL_SCOPE_EXCEPTION_PATTERN = String.raw`(?:\b(?:worldwide|global(?:ly)?|anywhere)\b.{0,60}\b(?:except|excluding|not available in|not open to)\b|\b(?:except|excluding|not available in|not open to)\b.{0,60}\b(?:worldwide|global(?:ly)?|anywhere)\b)`;
export const AFRICA_EMEA_PATTERN = String.raw`\b(?:africa|emea)\b`;
export const WORLDWIDE_REMOTE_OPEN_PATTERN = String.raw`(?:\b(?:remote|work\s+from\s+anywhere|open\s+to\s+(?:candidates|applicants))\b.{0,55}\b(?:worldwide|global(?:ly)?|anywhere)\b|\b(?:worldwide|global(?:ly)?|anywhere)\b.{0,55}\b(?:remote|open\s+to\s+(?:candidates|applicants)|eligible|accepting)\b)`;
export const AFRICA_REMOTE_OPEN_PATTERN = String.raw`(?:\bremote\b.{0,55}\b${AFRICA_EMEA_PATTERN}\b|\b${AFRICA_EMEA_PATTERN}\b.{0,55}\b(?:remote|open\s+to\s+(?:candidates|applicants)|eligible|accepting)\b)`;
export const CLOSED_LOCATION_REQUIREMENT_PATTERN = String.raw`\b(?:must\s+be\s+based\s+in|must\s+reside\s+in|must\s+live\s+in|residents?\s+only|citizens?\s+only|only\s+available\s+(?:to|in)|eligible\s+only\s+(?:in|from)|restricted\s+to|authorized\s+to\s+work\s+only\s+in|work\s+authorization\s+(?:is\s+)?required\s+in)\b`;
export const FLEXIBLE_SCHEDULE_PATTERN = String.raw`\b(?:async(?:hronous)?|flexible (?:hours|schedule)|set your own hours|no fixed hours|work any hours)\b`;
export const AFRICA_EU_TIMEZONE_PATTERN = String.raw`\b(?:west africa time|central africa time|east africa time|wat|cat|eat|cet|cest|eet|eest|wet|west european time|utc|gmt)(?:\s*[+-]\s*\d{1,2}(?::?\d{2})?)?\b`;
export const SPECIFIC_TIMEZONE_PATTERN = String.raw`\b(?:time ?zones?|timezone overlap|business hours|must overlap|overlap with|eastern time|central time|mountain time|pacific time|pst|pdt|est|edt|cst|cdt|mst|mdt)\b`;

const TEXT_FIELDS = [
  'title',
  'locationRestriction',
  'location',
  'excerpt',
  'description',
  'fullDescription',
  'requirements',
  'qualifications',
  'responsibilities',
  'benefits',
];

const LANGUAGE_REQUIREMENT_CONTEXT = String.raw`(?:required|requirement|must|fluent|proficien(?:t|cy)|native|speaker|speak(?:ing)?|written|verbal|bilingual|trilingual|multilingual|language proficiency)`;
const LANGUAGE_DEFINITIONS = [
  { id: 'arabic', pattern: String.raw`arabic|العربية` },
  { id: 'afrikaans', pattern: String.raw`afrikaans` },
  { id: 'amharic', pattern: String.raw`amharic` },
  { id: 'bengali', pattern: String.raw`bengali|bangla` },
  { id: 'chinese', pattern: String.raw`mandarin|cantonese|chinese` },
  { id: 'dutch', pattern: String.raw`dutch|flemish` },
  { id: 'english', pattern: String.raw`english` },
  { id: 'french', pattern: String.raw`french|francophone|français` },
  { id: 'german', pattern: String.raw`german|deutsch` },
  { id: 'greek', pattern: String.raw`greek` },
  { id: 'hausa', pattern: String.raw`hausa` },
  { id: 'hebrew', pattern: String.raw`hebrew` },
  { id: 'hindi', pattern: String.raw`hindi` },
  { id: 'igbo', pattern: String.raw`igbo` },
  { id: 'indonesian', pattern: String.raw`indonesian|bahasa indonesia` },
  { id: 'italian', pattern: String.raw`italian` },
  { id: 'japanese', pattern: String.raw`japanese` },
  { id: 'korean', pattern: String.raw`korean` },
  { id: 'malay', pattern: String.raw`malay|bahasa malaysia` },
  { id: 'norwegian', pattern: String.raw`norwegian` },
  { id: 'persian', pattern: String.raw`persian|farsi` },
  { id: 'polish', pattern: String.raw`polish` },
  { id: 'portuguese', pattern: String.raw`portuguese` },
  { id: 'russian', pattern: String.raw`russian` },
  { id: 'spanish', pattern: String.raw`spanish|castilian|español` },
  { id: 'swahili', pattern: String.raw`swahili` },
  { id: 'swedish', pattern: String.raw`swedish` },
  { id: 'tagalog', pattern: String.raw`tagalog|filipino` },
  { id: 'tamil', pattern: String.raw`tamil` },
  { id: 'thai', pattern: String.raw`thai` },
  { id: 'turkish', pattern: String.raw`turkish` },
  { id: 'ukrainian', pattern: String.raw`ukrainian` },
  { id: 'urdu', pattern: String.raw`urdu` },
  { id: 'vietnamese', pattern: String.raw`vietnamese` },
  { id: 'yoruba', pattern: String.raw`yoruba` },
  { id: 'zulu', pattern: String.raw`zulu` },
];

const languageRequirementPattern = (languagePattern) => String.raw`(?:\b${LANGUAGE_REQUIREMENT_CONTEXT}\b.{0,45}\b(?:${languagePattern})\b|\b(?:${languagePattern})\b.{0,45}\b${LANGUAGE_REQUIREMENT_CONTEXT}\b|\b(?:${languagePattern})[- ](?:speaking|language)\b)`;
const MULTILINGUAL_REQUIREMENT_PATTERNS = [
  { count: 3, pattern: String.raw`\b(?:trilingual|three languages?)\b` },
  { count: 2, pattern: String.raw`\b(?:bilingual|multilingual|two languages?)\b` },
];

const combineFields = (job, fields = TEXT_FIELDS) => fields
  .map((field) => String(job?.[field] || ''))
  .filter(Boolean)
  .join(' ');

const isRemoteJob = (job) => (
  job?.isRemote === true
  || job?.isWorldwideRemote === true
  || String(job?.workplaceType || '').toLowerCase() === 'remote'
  || String(job?.jobType || '').toLowerCase() === 'remote'
  || /\bremote\b/i.test(`${job?.location || ''} ${job?.locationRestriction || ''}`)
);

export const isRegionRestrictedJob = (job) => {
  if (job?.eligibilityScope === 'region_restricted') return true;
  const allText = combineFields(job);
  const locationValues = [job?.locationRestriction, job?.location]
    .map((value) => String(value || ''));
  const closedLocationRequirement = new RegExp(CLOSED_LOCATION_REQUIREMENT_PATTERN, 'i').test(allText);
  const locationNamesAfricaOrEmea = locationValues.some((value) => (
    new RegExp(AFRICA_REGION_PATTERN, 'i').test(value)
    || new RegExp(AFRICA_EMEA_PATTERN, 'i').test(value)
    || new RegExp(AFRICA_COUNTRY_CODE_PATTERN, 'i').test(value)
  ));
  const globalScopeException = TEXT_FIELDS.some((field) => {
    const fieldText = String(job?.[field] || '');
    return new RegExp(WORLDWIDE_PATTERN, 'i').test(fieldText)
      && new RegExp(GLOBAL_SCOPE_EXCEPTION_PATTERN, 'i').test(fieldText);
  });
  return new RegExp(REGION_RESTRICTION_PATTERN, 'i').test(allText)
    || locationValues.some((value) => new RegExp(REGION_LOCATION_PATTERN, 'i').test(value))
    || globalScopeException
    || (closedLocationRequirement && !locationNamesAfricaOrEmea);
};

export const getJobLanguageRequirements = (job) => {
  const text = combineFields(job);
  return LANGUAGE_DEFINITIONS
    .filter(({ pattern }) => new RegExp(languageRequirementPattern(pattern), 'i').test(text))
    .filter(({ id }) => id !== 'english')
    .map(({ id }) => id);
};

const normalizeLanguage = (value) => String(value || '').trim().toLowerCase();
const userLanguageIds = (languages = []) => {
  const values = Array.isArray(languages) ? languages : [languages];
  return new Set(LANGUAGE_DEFINITIONS
    .filter(({ pattern }) => values.some((value) => new RegExp(`^(?:${pattern})$`, 'i').test(normalizeLanguage(value))))
    .map(({ id }) => id));
};

export const isJobLanguageEligibleForUser = (job, languages = []) => {
  const userLanguages = userLanguageIds(languages);
  if (!getJobLanguageRequirements(job).every((language) => userLanguages.has(language))) return false;
  const languageCount = Array.isArray(languages) ? languages.filter((language) => String(language).trim()).length : 0;
  const text = combineFields(job);
  return MULTILINGUAL_REQUIREMENT_PATTERNS.every(({ count, pattern }) => (
    languageCount >= count || !new RegExp(pattern, 'i').test(text)
  ));
};

export const classifyTimezonePolicy = (job) => {
  const text = combineFields(job);
  if (job?.timezonePolicy && ['africa_eu_friendly', 'flexible_async', 'specific_timezone'].includes(job.timezonePolicy)) {
    return job.timezonePolicy;
  }
  if (new RegExp(FLEXIBLE_SCHEDULE_PATTERN, 'i').test(text)) return 'flexible_async';
  if (new RegExp(AFRICA_EU_TIMEZONE_PATTERN, 'i').test(text)) return 'africa_eu_friendly';
  if (new RegExp(SPECIFIC_TIMEZONE_PATTERN, 'i').test(text)) return 'specific_timezone';
  return 'unspecified';
};

export const deriveJobSignals = (job) => {
  const locationText = combineFields(job, ['locationRestriction', 'location']);
  const locationValues = [job?.locationRestriction, job?.location]
    .map((value) => String(value || ''));
  const remote = isRemoteJob(job);
  const timezonePolicy = classifyTimezonePolicy(job);
  const regionRestricted = isRegionRestrictedJob(job);
  const allText = combineFields(job);
  const globalScope = remote && (
    job?.eligibilityScope === 'worldwide'
    || job?.isWorldwideRemote === true
    || new RegExp(WORLDWIDE_PATTERN, 'i').test(locationText)
    || new RegExp(WORLDWIDE_REMOTE_OPEN_PATTERN, 'i').test(allText)
  );
  const africaLocation = locationValues.some((value) => (
    new RegExp(AFRICA_REGION_PATTERN, 'i').test(value)
    || new RegExp(AFRICA_COUNTRY_CODE_PATTERN, 'i').test(value)
  ));
  const africaRemoteScope = remote && (
    new RegExp(AFRICA_EMEA_PATTERN, 'i').test(locationText)
    || new RegExp(AFRICA_REMOTE_OPEN_PATTERN, 'i').test(allText)
  );
  const eligibilityScope = regionRestricted
    ? 'region_restricted'
    : globalScope
      ? 'worldwide'
      : africaLocation || africaRemoteScope
        ? 'africa_friendly'
        : 'unspecified';

  return {
    eligibilityScope,
    timezonePolicy,
    languageRequirements: getJobLanguageRequirements(job),
  };
};

export const buildRegionRestrictedJobFilter = () => ({
  $or: [
    { eligibilityScope: 'region_restricted' },
    ...TEXT_FIELDS.map((field) => ({ [field]: { $regex: REGION_RESTRICTION_PATTERN, $options: 'i' } })),
    ...['locationRestriction', 'location'].map((field) => ({
      [field]: { $regex: REGION_LOCATION_PATTERN, $options: 'i' },
    })),
    {
      $or: TEXT_FIELDS.map((field) => ({
        $and: [
          {
            [field]: { $regex: WORLDWIDE_PATTERN, $options: 'i' },
          },
          {
            [field]: { $regex: GLOBAL_SCOPE_EXCEPTION_PATTERN, $options: 'i' },
          },
        ],
      })),
    },
    {
      $and: [
        {
          $or: TEXT_FIELDS.map((field) => ({
            [field]: { $regex: CLOSED_LOCATION_REQUIREMENT_PATTERN, $options: 'i' },
          })),
        },
        {
          $nor: [
            ...['locationRestriction', 'location'].flatMap((field) => [
              { [field]: { $regex: AFRICA_REGION_PATTERN, $options: 'i' } },
              { [field]: { $regex: AFRICA_EMEA_PATTERN, $options: 'i' } },
              { [field]: { $regex: AFRICA_COUNTRY_CODE_PATTERN, $options: 'i' } },
            ]),
          ],
        },
      ],
    },
  ],
});

const remoteJobFilter = () => ({
  $or: [
    { isRemote: true },
    { isWorldwideRemote: true },
    { workplaceType: 'remote' },
    { jobType: 'Remote' },
    { location: { $regex: String.raw`\bremote\b`, $options: 'i' } },
    { locationRestriction: { $regex: String.raw`\bremote\b`, $options: 'i' } },
  ],
});

export const buildGeographicallyEligibleJobFilter = () => ({
  $and: [
    {
      $or: [
        {
          $and: [
            remoteJobFilter(),
            {
              $or: [
                { isWorldwideRemote: true },
                { eligibilityScope: 'worldwide' },
                { locationRestriction: { $regex: WORLDWIDE_PATTERN, $options: 'i' } },
                { location: { $regex: WORLDWIDE_PATTERN, $options: 'i' } },
                ...TEXT_FIELDS.map((field) => ({
                  [field]: { $regex: WORLDWIDE_REMOTE_OPEN_PATTERN, $options: 'i' },
                })),
              ],
            },
          ],
        },
        {
          $and: [
            remoteJobFilter(),
            {
              $or: [
                { locationRestriction: { $regex: AFRICA_EMEA_PATTERN, $options: 'i' } },
                { location: { $regex: AFRICA_EMEA_PATTERN, $options: 'i' } },
                ...TEXT_FIELDS.map((field) => ({
                  [field]: {
                    $regex: AFRICA_REMOTE_OPEN_PATTERN,
                    $options: 'i',
                  },
                })),
              ],
            },
          ],
        },
        {
          $or: [
            { locationRestriction: { $regex: AFRICA_REGION_PATTERN, $options: 'i' } },
            { location: { $regex: AFRICA_REGION_PATTERN, $options: 'i' } },
            { locationRestriction: { $regex: AFRICA_COUNTRY_CODE_PATTERN, $options: 'i' } },
            { location: { $regex: AFRICA_COUNTRY_CODE_PATTERN, $options: 'i' } },
          ],
        },
      ],
    },
    { $nor: [buildRegionRestrictedJobFilter()] },
  ],
});

export const buildLanguageEligibilityFilter = (languages = []) => {
  const knownLanguages = userLanguageIds(languages);
  const unmetLanguagePatterns = LANGUAGE_DEFINITIONS
    .filter(({ id }) => id !== 'english' && !knownLanguages.has(id))
    .map(({ pattern }) => pattern);
  const restrictionsToExclude = unmetLanguagePatterns.length
    ? [{
      $or: TEXT_FIELDS.map((field) => ({
        [field]: {
          $regex: languageRequirementPattern(`(?:${unmetLanguagePatterns.join('|')})`),
          $options: 'i',
        },
      })),
    }]
    : [];
  const languageCount = Array.isArray(languages) ? languages.filter((language) => String(language).trim()).length : 0;
  restrictionsToExclude.push(...MULTILINGUAL_REQUIREMENT_PATTERNS
    .filter(({ count }) => languageCount < count)
    .map(({ pattern }) => ({
      $or: TEXT_FIELDS.map((field) => ({ [field]: { $regex: pattern, $options: 'i' } })),
    })));
  return { $nor: restrictionsToExclude };
};

export const buildEligibleJobFilter = (languages = []) => ({
  $and: [
    buildGeographicallyEligibleJobFilter(),
    buildLanguageEligibilityFilter(languages),
  ],
});

export const isGeographicallyEligibleJob = (job) => (
  ['worldwide', 'africa_friendly'].includes(deriveJobSignals(job).eligibilityScope)
);

export const isEligibleJobForUser = (job, languages = []) => (
  isGeographicallyEligibleJob(job)
  && isJobLanguageEligibleForUser(job, languages)
);

export const buildEligibilityScopeFilter = (scope) => {
  if (scope === 'region_restricted') return buildRegionRestrictedJobFilter();
  if (scope === 'worldwide') {
    return {
      $and: [
        buildGeographicallyEligibleJobFilter(),
        {
          $or: [
            { isWorldwideRemote: true },
            { eligibilityScope: 'worldwide' },
            { locationRestriction: { $regex: WORLDWIDE_PATTERN, $options: 'i' } },
            { location: { $regex: WORLDWIDE_PATTERN, $options: 'i' } },
            ...TEXT_FIELDS.map((field) => ({
              [field]: { $regex: WORLDWIDE_REMOTE_OPEN_PATTERN, $options: 'i' },
            })),
          ],
        },
      ],
    };
  }
  if (scope === 'africa_friendly') {
    return {
      $and: [
        buildGeographicallyEligibleJobFilter(),
        {
          $or: [
            { locationRestriction: { $regex: AFRICA_EMEA_PATTERN, $options: 'i' } },
            { location: { $regex: AFRICA_EMEA_PATTERN, $options: 'i' } },
            { locationRestriction: { $regex: AFRICA_REGION_PATTERN, $options: 'i' } },
            { location: { $regex: AFRICA_REGION_PATTERN, $options: 'i' } },
            { locationRestriction: { $regex: AFRICA_COUNTRY_CODE_PATTERN, $options: 'i' } },
            { location: { $regex: AFRICA_COUNTRY_CODE_PATTERN, $options: 'i' } },
            ...TEXT_FIELDS.map((field) => ({
              [field]: { $regex: AFRICA_REMOTE_OPEN_PATTERN, $options: 'i' },
            })),
          ],
        },
      ],
    };
  }
  return null;
};

export const buildTimezonePolicyFilter = (policy) => {
  const patterns = {
    africa_eu_friendly: AFRICA_EU_TIMEZONE_PATTERN,
    flexible_async: FLEXIBLE_SCHEDULE_PATTERN,
    specific_timezone: SPECIFIC_TIMEZONE_PATTERN,
  };
  if (!patterns[policy]) return null;
  return {
    $or: [
      { timezonePolicy: policy },
      ...TEXT_FIELDS.map((field) => ({ [field]: { $regex: patterns[policy], $options: 'i' } })),
    ],
  };
};

export const africaRelevanceExpression = () => {
  const fieldExpression = (field) => ({
    $convert: { input: `$${field}`, to: 'string', onError: '', onNull: '' },
  });
  const textExpression = (fields) => ({
    $concat: fields.flatMap((field) => [fieldExpression(field), ' ']),
  });
  const isMatch = (text, regex) => ({ $regexMatch: { input: text, regex, options: 'i' } });
  const allText = textExpression(TEXT_FIELDS);
  const locationText = textExpression(['locationRestriction', 'location']);
  const isRemote = {
    $or: [
      { $eq: ['$isRemote', true] },
      { $eq: ['$isWorldwideRemote', true] },
      { $eq: ['$workplaceType', 'remote'] },
      { $eq: ['$jobType', 'Remote'] },
    ],
  };
  const regionRestricted = isMatch(allText, REGION_RESTRICTION_PATTERN);
  const worldwideScope = {
    $or: [
      { $eq: ['$isWorldwideRemote', true] },
      isMatch(locationText, WORLDWIDE_PATTERN),
      isMatch(allText, WORLDWIDE_REMOTE_OPEN_PATTERN),
    ],
  };
  const isAfricanLocation = {
    $or: [
      isMatch(fieldExpression('locationRestriction'), AFRICA_REGION_PATTERN),
      isMatch(fieldExpression('location'), AFRICA_REGION_PATTERN),
      isMatch(fieldExpression('locationRestriction'), AFRICA_COUNTRY_CODE_PATTERN),
      isMatch(fieldExpression('location'), AFRICA_COUNTRY_CODE_PATTERN),
    ],
  };
  const africaRemoteScope = {
    $and: [
      isRemote,
      {
        $or: [
          isMatch(locationText, AFRICA_EMEA_PATTERN),
          isMatch(allText, AFRICA_REMOTE_OPEN_PATTERN),
        ],
      },
    ],
  };
  const globalRemoteScope = { $and: [isRemote, worldwideScope] };
  const isDirectPosting = {
    $and: [
      { $eq: [{ $ifNull: ['$source', 'employer'] }, 'employer'] },
      { $ne: [{ $ifNull: ['$isDirectPosting', true] }, false] },
    ],
  };

  return {
    $switch: {
      branches: [
        { case: regionRestricted, then: 0 },
        { case: globalRemoteScope, then: 5 },
        { case: africaRemoteScope, then: 4 },
        { case: isAfricanLocation, then: 3 },
        { case: isDirectPosting, then: 1 },
      ],
      default: 0,
    },
  };
};

const NON_AFRICAN_REGION = String.raw`(?:united states|u\.?\s*s\.?a?\.?|u\.?s\.?|usa|canada|united kingdom|u\.?k\.?|great britain|european union|europe|e\.?u\.?|north america|south america|latin america|asia(?:\s*[-/]?\s*pacific)?|apac|australia|new zealand|india|pakistan|singapore|japan|germany|france|ireland|netherlands|switzerland|mexico|brazil)`;
const RESTRICTION_CONTEXT = String.raw`(?:only|restricted|limited|resident|residents|citizen|citizens|citizenship|authorization|authorisation|eligible|eligibility|must\s+(?:be\s+)?based|must\s+reside)`;

export const REGION_RESTRICTION_PATTERN = String.raw`(?:\b(?:${NON_AFRICAN_REGION})\b.{0,45}\b${RESTRICTION_CONTEXT}\b|\b${RESTRICTION_CONTEXT}\b.{0,45}\b(?:${NON_AFRICAN_REGION})\b|\bfederal(?:\s+government)?\s+(?:role|position|job|agency|contract|clearance)\b|\bcitizenship required\b|\bactive security clearance\b)`;
export const REGION_LOCATION_PATTERN = String.raw`^\s*[(),]*\s*(?:remote\s*[-–:,()]?\s*(?:(?:in|within|from)\s*)?)?(?:${NON_AFRICAN_REGION})(?:\s*[-–:,()]?\s*(?:only|remote))?\s*[(),]*\s*$`;
export const AFRICA_REGION_PATTERN = String.raw`\b(?:africa|algeria|angola|benin|botswana|burkina faso|burundi|cabo verde|cameroon|central african republic|chad|comoros|democratic republic of the congo|djibouti|egypt|equatorial guinea|eritrea|eswatini|ethiopia|gabon|gambia|ghana|guinea|guinea-bissau|ivory coast|kenya|lesotho|liberia|libya|madagascar|malawi|mali|mauritania|mauritius|morocco|mozambique|namibia|niger|nigeria|republic of the congo|rwanda|sao tome and principe|senegal|seychelles|sierra leone|somalia|south africa|south sudan|sudan|tanzania|togo|tunisia|uganda|zambia|zimbabwe)\b`;
export const AFRICA_COUNTRY_CODE_PATTERN = String.raw`(?:^\s*(?:DZ|AO|BJ|BW|BF|BI|CV|CM|CF|TD|KM|CG|CD|CI|DJ|EG|GQ|ER|SZ|ET|GA|GM|GH|GN|GW|KE|LS|LR|LY|MG|MW|ML|MR|MU|MA|MZ|NE|NG|RW|ST|SN|SC|SL|SO|ZA|SS|SD|TZ|TG|TN|UG|ZM|ZW)\s*$|[,(·/]\s*(?:DZ|AO|BJ|BW|BF|BI|CV|CM|CF|TD|KM|CG|CD|CI|DJ|EG|GQ|ER|SZ|ET|GA|GM|GH|GN|GW|KE|LS|LR|LY|MG|MW|ML|MR|MU|MA|MZ|NE|NG|RW|ST|SN|SC|SL|SO|ZA|SS|SD|TZ|TG|TN|UG|ZM|ZW)\s*(?:[),·/]|$))`;
export const WORLDWIDE_PATTERN = String.raw`\b(?:worldwide|global(?:ly)?|anywhere|any location|no geographic restrictions)\b`;
export const FLEXIBLE_SCHEDULE_PATTERN = String.raw`\b(?:async(?:hronous)?|flexible (?:hours|schedule)|set your own hours|no fixed hours|work any hours)\b`;
export const AFRICA_EU_TIMEZONE_PATTERN = String.raw`\b(?:west africa time|central africa time|east africa time|wat|cat|eat|cet|cest|eet|eest|wet|west european time|utc|gmt)(?:\s*[+-]\s*\d{1,2}(?::?\d{2})?)?\b`;
export const SPECIFIC_TIMEZONE_PATTERN = String.raw`\b(?:time ?zones?|timezone overlap|business hours|must overlap|overlap with|eastern time|central time|mountain time|pacific time|pst|pdt|est|edt|cst|cdt|mst|mdt)\b`;

const TEXT_FIELDS = [
  'locationRestriction',
  'location',
  'description',
  'fullDescription',
  'requirements',
  'qualifications',
  'responsibilities',
  'benefits',
];

const combineFields = (job, fields = TEXT_FIELDS) => fields
  .map((field) => String(job?.[field] || ''))
  .filter(Boolean)
  .join(' ');

const isRemoteJob = (job) => (
  job?.isRemote === true
  || job?.isWorldwideRemote === true
  || job?.workplaceType === 'remote'
  || job?.jobType === 'Remote'
);

export const isRegionRestrictedJob = (job) => {
  if (job?.eligibilityScope === 'region_restricted') return true;
  const allText = combineFields(job);
  const locationValues = [job?.locationRestriction, job?.location]
    .map((value) => String(value || ''));
  return new RegExp(REGION_RESTRICTION_PATTERN, 'i').test(allText)
    || locationValues.some((value) => new RegExp(REGION_LOCATION_PATTERN, 'i').test(value));
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
  const globalScope = job?.eligibilityScope === 'worldwide'
    || job?.isWorldwideRemote === true
    || new RegExp(WORLDWIDE_PATTERN, 'i').test(locationText);
  const africaScope = job?.eligibilityScope === 'africa_friendly'
    || locationValues.some((value) => (
      new RegExp(AFRICA_REGION_PATTERN, 'i').test(value)
      || new RegExp(AFRICA_COUNTRY_CODE_PATTERN, 'i').test(value)
    ));

  return {
    eligibilityScope: regionRestricted
      ? 'region_restricted'
      : globalScope
        ? 'worldwide'
        : africaScope || (remote && ['africa_eu_friendly', 'flexible_async'].includes(timezonePolicy))
          ? 'africa_friendly'
          : 'unspecified',
    timezonePolicy,
  };
};

export const buildRegionRestrictedJobFilter = () => ({
  $or: [
    { eligibilityScope: 'region_restricted' },
    ...TEXT_FIELDS.map((field) => ({ [field]: { $regex: REGION_RESTRICTION_PATTERN, $options: 'i' } })),
    ...['locationRestriction', 'location'].map((field) => ({
      [field]: { $regex: REGION_LOCATION_PATTERN, $options: 'i' },
    })),
  ],
});

export const buildEligibilityScopeFilter = (scope) => {
  if (scope === 'region_restricted') return buildRegionRestrictedJobFilter();
  if (scope === 'worldwide') {
    return {
      $and: [
        {
          $or: [
            { isWorldwideRemote: true },
            { locationRestriction: { $regex: WORLDWIDE_PATTERN, $options: 'i' } },
            { location: { $regex: WORLDWIDE_PATTERN, $options: 'i' } },
          ],
        },
        { $nor: [buildRegionRestrictedJobFilter()] },
      ],
    };
  }
  if (scope === 'africa_friendly') {
    return {
      $and: [
        {
          $or: [
            { eligibilityScope: 'africa_friendly' },
            { locationRestriction: { $regex: AFRICA_REGION_PATTERN, $options: 'i' } },
            { location: { $regex: AFRICA_REGION_PATTERN, $options: 'i' } },
            { locationRestriction: { $regex: AFRICA_COUNTRY_CODE_PATTERN, $options: 'i' } },
            { location: { $regex: AFRICA_COUNTRY_CODE_PATTERN, $options: 'i' } },
          ],
        },
        { $nor: [buildRegionRestrictedJobFilter()] },
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
  const globalScope = {
    $or: [
      { $eq: ['$isWorldwideRemote', true] },
      isMatch(locationText, WORLDWIDE_PATTERN),
    ],
  };
  const flexible = isMatch(allText, FLEXIBLE_SCHEDULE_PATTERN);
  const africaTimezone = isMatch(allText, AFRICA_EU_TIMEZONE_PATTERN);
  const isAfricanLocation = {
    $or: [
      isMatch(fieldExpression('locationRestriction'), AFRICA_REGION_PATTERN),
      isMatch(fieldExpression('location'), AFRICA_REGION_PATTERN),
      isMatch(fieldExpression('locationRestriction'), AFRICA_COUNTRY_CODE_PATTERN),
      isMatch(fieldExpression('location'), AFRICA_COUNTRY_CODE_PATTERN),
    ],
  };
  const africaScope = isAfricanLocation;
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
        { case: { $and: [isRemote, { $or: [globalScope, africaScope] }] }, then: 5 },
        { case: { $and: [isRemote, flexible] }, then: 4 },
        { case: { $and: [isRemote, africaTimezone] }, then: 4 },
        { case: isAfricanLocation, then: 3 },
        { case: isRemote, then: 2 },
        { case: isDirectPosting, then: 1 },
      ],
      default: 0,
    },
  };
};

const API_BASE_URL = () => (
  process.env.AI_BASE_URL
  || (process.env.GEMINI_API_KEY
    ? 'https://generativelanguage.googleapis.com/v1beta/openai/'
    : 'https://api.openai.com/v1')
).replace(/\/+$/, '');

export const getAiApiKey = () => process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

export const getAiModel = () => (
  process.env.AI_MODEL
  || (process.env.GEMINI_API_KEY ? 'gemini-2.5-flash' : 'gpt-4o-mini')
);

export const getAiFastModel = () => (
  process.env.AI_FAST_MODEL || getAiModel()
);

const isRetryable = (error) => {
  const status = error.status || error.response?.status;
  return error.name === 'AbortError'
    || !status
    || status === 408
    || status === 425
    || status === 429
    || status >= 500;
};

const getTimeout = () => {
  const configured = Number.parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '12000', 10);
  return Number.isInteger(configured) ? Math.min(25000, Math.max(3000, configured)) : 12000;
};

export const requestChatCompletion = async ({
  system,
  user,
  model = getAiModel(),
  fetchImpl = fetch,
  timeoutMs = getTimeout(),
  retryDelayMs = 250,
}) => {
  const apiKey = getAiApiKey();
  if (!apiKey) {
    const error = new Error('Optional AI review is not configured. You can still use the free diagnostic review.');
    error.status = 503;
    throw error;
  }

  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${API_BASE_URL()}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });
      if (!response.ok) {
        const error = new Error(`AI provider returned HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      const responseBody = await response.json();
      const content = responseBody.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('AI provider returned no structured response.');
      return JSON.parse(content);
    } catch (error) {
      lastError = error;
      if (attempt === 1 || !isRetryable(error)) break;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError?.name === 'AbortError') {
    const timeoutError = new Error('AI review timed out after one retry. Your free diagnostic is still available.');
    timeoutError.status = 504;
    throw timeoutError;
  }
  if (lastError?.status === 429) {
    const rateLimitError = new Error('The AI provider is busy. Please try tailoring again shortly; your diagnostic is still available.');
    rateLimitError.status = 429;
    throw rateLimitError;
  }
  const providerError = new Error('AI review is temporarily unavailable after one retry. Your diagnostic results are still available.');
  providerError.status = lastError?.status >= 400 && lastError?.status < 500 ? lastError.status : 502;
  throw providerError;
};

const groundedSystem = [
  'You tailor CV content for one job. Return only valid JSON.',
  'Use only facts explicitly present in the supplied CV structure. Never invent or change names, employers, titles, dates, locations, skills, credentials, tools, metrics, or achievements.',
  'Return a sourceBullet copied verbatim for every tailored bullet. If there is no exact source bullet, do not produce a tailored bullet.',
  'Requirements not supported by the CV must be listed as gaps with guidance, not added to CV content.',
  'Keep candidate contact information and PII placeholders unchanged; do not infer missing information.',
].join(' ');

export const tailorCvInParallel = async ({
  cv,
  job,
  jobRequirements,
  requestCompletion = requestChatCompletion,
}) => {
  const cvPayload = JSON.stringify(cv);
  const jobPayload = JSON.stringify({ description: job, requirements: jobRequirements });
  const sharedUser = JSON.stringify({
    cv: cvPayload,
    job: jobPayload,
    constraints: 'CV content only; no cover letter. Preserve source facts and provide exact sourceBullet links.',
  });
  const tasks = [
    requestCompletion({
      model: getAiModel(),
      system: `${groundedSystem} Focus only on the professional summary. JSON schema: {"summary":{"original":"exact source summary or empty","suggested":"grounded rewrite","reason":"brief"}}`,
      user: sharedUser,
    }),
    requestCompletion({
      model: getAiModel(),
      system: `${groundedSystem} Focus only on ordering and grouping existing CV skills. JSON schema: {"skills":["existing skill"],"gaps":[{"requirement":"job requirement","guidance":"add only if true"}]}. Never add a skill not in the CV.`,
      user: sharedUser,
    }),
    requestCompletion({
      model: getAiModel(),
      system: `${groundedSystem} Focus only on experience bullets. JSON schema: {"experience":[{"roleIndex":0,"bullets":[{"sourceBullet":"verbatim CV bullet","tailoredBullet":"grounded rewrite","reason":"brief"}]}]}. Do not generate role headers or metadata.`,
      user: sharedUser,
    }),
    requestCompletion({
      model: getAiFastModel(),
      system: 'Extract job requirements. Return JSON with arrays must_haves and nice_to_haves and object logistics. Preserve only explicit job-description content. Do not include employer marketing or infer unstated requirements.',
      user: JSON.stringify({ job_description: job }),
    }),
  ];
  const [summary, skills, experience, jobAnalysisResult] = await Promise.all([
    ...tasks.slice(0, 3),
    tasks[3].then(
      (jobAnalysis) => ({ jobAnalysis, unavailable: false }),
      () => ({ jobAnalysis: null, unavailable: true }),
    ),
  ]);
  return {
    summary,
    skills,
    experience,
    jobAnalysis: jobAnalysisResult.jobAnalysis,
    jobAnalysisUnavailable: jobAnalysisResult.unavailable,
  };
};

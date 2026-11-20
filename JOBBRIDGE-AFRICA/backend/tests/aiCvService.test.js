import test from 'node:test';
import assert from 'node:assert/strict';
import { requestChatCompletion, tailorCvInParallel } from '../services/aiCvService.js';

const withAiKey = async (testBody) => {
  const oldGemini = process.env.GEMINI_API_KEY;
  const oldOpenAi = process.env.OPENAI_API_KEY;
  const oldBase = process.env.AI_BASE_URL;
  process.env.OPENAI_API_KEY = 'test-key';
  delete process.env.GEMINI_API_KEY;
  delete process.env.AI_BASE_URL;
  try {
    await testBody();
  } finally {
    if (oldGemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldGemini;
    if (oldOpenAi === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldOpenAi;
    if (oldBase === undefined) delete process.env.AI_BASE_URL;
    else process.env.AI_BASE_URL = oldBase;
  }
};

test('transient AI provider failures retry once then return structured JSON', async () => {
  await withAiKey(async () => {
    let attempts = 0;
    let submittedModel = '';
    const result = await requestChatCompletion({
      system: 'Return JSON.',
      user: '{}',
      model: 'test-fast-model',
      retryDelayMs: 0,
      fetchImpl: async (url, options) => {
        assert.match(url, /api\.openai\.com\/v1\/chat\/completions$/);
        const body = JSON.parse(options.body);
        submittedModel = body.model;
        attempts += 1;
        if (attempts === 1) return { ok: false, status: 503 };
        return { ok: true, json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }) };
      },
    });
    assert.equal(attempts, 2);
    assert.equal(submittedModel, 'test-fast-model');
    assert.deepEqual(result, { ok: true });
  });
});

test('AI request timeout is retried once and then surfaced as a timeout error', async () => {
  await withAiKey(async () => {
    let attempts = 0;
    await assert.rejects(
      requestChatCompletion({
        system: 'Return JSON.',
        user: '{}',
        timeoutMs: 3000,
        retryDelayMs: 0,
        fetchImpl: async () => {
          attempts += 1;
          const error = new Error('timed out');
          error.name = 'AbortError';
          throw error;
        },
      }),
      (error) => error.status === 504 && /one retry/.test(error.message),
    );
    assert.equal(attempts, 2);
  });
});

test('job analysis failures are reported while parallel CV tailoring remains available', async () => {
  const generated = await tailorCvInParallel({
    cv: { summary: 'Developer', skills: ['React'], experience: [] },
    job: 'React developer',
    jobRequirements: { must_haves: [], nice_to_haves: [], logistics: {} },
    requestCompletion: async ({ system }) => {
      if (system.startsWith('Extract job requirements')) throw new Error('Provider unavailable');
      return { summary: { original: 'Developer', suggested: 'Developer', reason: 'Grounded.' } };
    },
  });

  assert.equal(generated.jobAnalysisUnavailable, true);
  assert.equal(generated.jobAnalysis, null);
  assert.ok(generated.summary);
  assert.ok(generated.skills);
  assert.ok(generated.experience);
});

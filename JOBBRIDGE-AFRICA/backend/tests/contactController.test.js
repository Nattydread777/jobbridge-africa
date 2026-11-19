import assert from 'node:assert/strict';
import test from 'node:test';
import { sendContactEmail } from '../controllers/contactController.js';

test('sends contact notification and auto-reply through Resend when configured', async () => {
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.RESEND_FROM;
  const previousAdminEmail = process.env.ADMIN_EMAIL;
  const previousRecaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
  const previousNodeEnv = process.env.NODE_ENV;
  const previousFetch = globalThis.fetch;
  const requests = [];
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.RESEND_FROM = 'verified@example.com';
  process.env.ADMIN_EMAIL = 'info@jobbridgeafrica.com';
  delete process.env.RECAPTCHA_SECRET_KEY;
  process.env.NODE_ENV = 'test';
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, status: 200, text: async () => '' };
  };

  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  try {
    await sendContactEmail({
      body: {
        name: 'Test Candidate',
        email: 'candidate@example.com',
        subject: 'Support request',
        message: 'Please help.',
      },
      headers: {},
      ip: '127.0.0.1',
    }, response, (error) => {
      if (error) throw error;
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.transport, 'resend-api');
    assert.equal(requests.length, 2);
    assert.ok(requests.every(({ url }) => url === 'https://api.resend.com/emails'));
    assert.ok(requests.every(({ options }) => options.headers.Authorization === 'Bearer test-resend-key'));

    const adminMail = JSON.parse(requests[0].options.body);
    assert.equal(adminMail.from, 'verified@example.com');
    assert.deepEqual(adminMail.to, ['info@jobbridgeafrica.com']);
    assert.equal(adminMail.reply_to, 'candidate@example.com');

    const autoReply = JSON.parse(requests[1].options.body);
    assert.deepEqual(autoReply.to, ['candidate@example.com']);
    assert.equal(autoReply.reply_to, 'info@jobbridgeafrica.com');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousApiKey;
    if (previousFrom === undefined) delete process.env.RESEND_FROM;
    else process.env.RESEND_FROM = previousFrom;
    if (previousAdminEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previousAdminEmail;
    if (previousRecaptchaSecret === undefined) delete process.env.RECAPTCHA_SECRET_KEY;
    else process.env.RECAPTCHA_SECRET_KEY = previousRecaptchaSecret;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

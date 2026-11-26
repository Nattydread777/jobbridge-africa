import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPasswordResetUrl,
  isEmailConfigured,
  sendEmailVerification,
  sendPasswordResetEmail,
} from '../services/emailService.js';

test('password reset URLs use configured frontend domains and the production default', () => {
  const environmentKeys = ['FRONTEND_URL', 'CLIENT_URL', 'APP_URL', 'NODE_ENV', 'RENDER', 'RENDER_SERVICE_ID'];
  const previous = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));

  try {
    environmentKeys.forEach((key) => delete process.env[key]);
    process.env.NODE_ENV = 'production';
    assert.equal(
      createPasswordResetUrl('reset-token'),
      'https://jobbridgeafrica.com/reset-password/reset-token',
    );
    delete process.env.NODE_ENV;
    process.env.RENDER = 'true';
    assert.equal(
      createPasswordResetUrl('reset-token'),
      'https://jobbridgeafrica.com/reset-password/reset-token',
    );
    delete process.env.RENDER;
    assert.equal(
      createPasswordResetUrl('reset-token'),
      'http://localhost:5173/reset-password/reset-token',
    );
    process.env.NODE_ENV = 'production';

    process.env.APP_URL = 'https://app.example.com/';
    assert.equal(
      createPasswordResetUrl('reset-token'),
      'https://app.example.com/reset-password/reset-token',
    );
    process.env.CLIENT_URL = 'https://client.example.com';
    assert.equal(
      createPasswordResetUrl('reset-token'),
      'https://client.example.com/reset-password/reset-token',
    );
    process.env.FRONTEND_URL = 'https://frontend.example.com/';
    assert.equal(
      createPasswordResetUrl('reset-token'),
      'https://frontend.example.com/reset-password/reset-token',
    );
  } finally {
    environmentKeys.forEach((key) => {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    });
  }
});

test('password reset and verification emails use Resend when it is the configured provider', async () => {
  const previous = {
    apiKey: process.env.RESEND_API_KEY,
    resendFrom: process.env.RESEND_FROM,
    emailFrom: process.env.EMAIL_FROM,
    emailUser: process.env.EMAIL_USER,
    emailPass: process.env.EMAIL_PASS,
    fetch: globalThis.fetch,
  };
  const messages = [];
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.RESEND_FROM = 'verified@example.com';
  delete process.env.EMAIL_FROM;
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.headers.Authorization, 'Bearer test-resend-key');
    messages.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ id: `email-${messages.length}` }) };
  };

  try {
    assert.equal(isEmailConfigured(), true);
    await sendPasswordResetEmail({
      recipient: 'candidate@example.com',
      name: 'Candidate',
      resetUrl: 'https://jobbridgeafrica.com/reset-password/token',
    });
    await sendEmailVerification({
      recipient: 'candidate@example.com',
      name: 'Candidate',
      verificationUrl: 'https://jobbridgeafrica.com/verify-email/token',
    });
    assert.equal(messages.length, 2);
    assert.equal(messages[0].from, 'verified@example.com');
    assert.match(messages[0].text, /reset-password\/token/);
    assert.match(messages[1].text, /verify-email\/token/);
  } finally {
    if (previous.apiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous.apiKey;
    if (previous.resendFrom === undefined) delete process.env.RESEND_FROM;
    else process.env.RESEND_FROM = previous.resendFrom;
    if (previous.emailFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = previous.emailFrom;
    if (previous.emailUser === undefined) delete process.env.EMAIL_USER;
    else process.env.EMAIL_USER = previous.emailUser;
    if (previous.emailPass === undefined) delete process.env.EMAIL_PASS;
    else process.env.EMAIL_PASS = previous.emailPass;
    globalThis.fetch = previous.fetch;
  }
});

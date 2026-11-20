import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isEmailConfigured,
  sendEmailVerification,
  sendPasswordResetEmail,
} from '../services/emailService.js';

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

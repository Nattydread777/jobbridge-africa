import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createJobAlertUnsubscribeApiUrl,
  createPasswordResetUrl,
  formatEmailFrom,
  getEmailFromAddress,
  isEmailConfigured,
  sendEmailVerification,
  sendJobDigestEmail,
  sendPasswordResetEmail,
} from '../services/emailService.js';

test('formats bare sender addresses with the brand and preserves configured display names', () => {
  const previous = {
    emailFrom: process.env.EMAIL_FROM,
    smtpFrom: process.env.SMTP_FROM,
    emailUser: process.env.EMAIL_USER,
    resendFrom: process.env.RESEND_FROM,
    backendUrl: process.env.BACKEND_URL,
  };
  try {
    assert.equal(formatEmailFrom('info@example.com'), '"JobBridge Africa" <info@example.com>');
    assert.equal(
      formatEmailFrom('"Support Team" <support@example.com>'),
      '"Support Team" <support@example.com>',
    );
    assert.throws(() => formatEmailFrom('Support <support@example.com'));
    assert.throws(() => formatEmailFrom('Support <support@example.com> trailing'));
    process.env.SMTP_FROM = 'alerts@example.com';
    process.env.EMAIL_FROM = 'info@example.com';
    delete process.env.EMAIL_USER;
    delete process.env.RESEND_FROM;
    process.env.BACKEND_URL = 'http://localhost:4000';
    assert.equal(getEmailFromAddress('smtp'), '"JobBridge Africa" <alerts@example.com>');
    assert.equal(
      getEmailFromAddress('resend'),
      '"JobBridge Africa" <info@example.com>',
    );
    assert.equal(
      createJobAlertUnsubscribeApiUrl('signed token'),
      `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/job-alerts/unsubscribe?token=signed+token`,
    );
  } finally {
    if (previous.emailFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = previous.emailFrom;
    if (previous.smtpFrom === undefined) delete process.env.SMTP_FROM;
    else process.env.SMTP_FROM = previous.smtpFrom;
    if (previous.emailUser === undefined) delete process.env.EMAIL_USER;
    else process.env.EMAIL_USER = previous.emailUser;
    if (previous.resendFrom === undefined) delete process.env.RESEND_FROM;
    else process.env.RESEND_FROM = previous.resendFrom;
    if (previous.backendUrl === undefined) delete process.env.BACKEND_URL;
    else process.env.BACKEND_URL = previous.backendUrl;
  }
});

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

test('job digest email includes structured role details and a confirmed unsubscribe URL', async () => {
  const previous = {
    apiKey: process.env.RESEND_API_KEY,
    resendFrom: process.env.RESEND_FROM,
    frontendUrl: process.env.FRONTEND_URL,
    backendUrl: process.env.BACKEND_URL,
    fetch: globalThis.fetch,
  };
  const messages = [];
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.RESEND_FROM = 'verified@example.com';
  process.env.FRONTEND_URL = 'https://jobbridgeafrica.com';
  process.env.BACKEND_URL = 'https://api.jobbridgeafrica.com';
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    messages.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ id: 'digest-email' }) };
  };

  try {
    await sendJobDigestEmail({
      recipient: 'candidate@example.com',
      name: 'Candidate',
      unsubscribeUrl: 'https://jobbridgeafrica.com/unsubscribe-job-alerts?token=signed-token',
      listUnsubscribeUrl: 'https://api.jobbridgeafrica.com/api/job-alerts/unsubscribe?token=signed-token',
      jobs: [{
        score: 0.9,
        job: {
          _id: 'job-123',
          title: '<Operations Manager>',
          companyName: 'Example Co',
          location: 'Remote, Africa',
          workplaceType: 'remote',
          jobType: 'Full-Time',
          seniority: 'Mid-level',
          salary: '70000–85000',
          salaryCurrency: 'GBP',
          responsibilities: 'Lead planning and delivery across regional teams.',
          tags: ['Operations', 'Project Management'],
          pubDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      }],
    });

    assert.equal(messages.length, 1);
    assert.equal(messages[0].to, 'candidate@example.com');
    assert.equal(messages[0].from, '"JobBridge Africa" <verified@example.com>');
    assert.equal(
      messages[0].headers['List-Unsubscribe'],
      '<https://api.jobbridgeafrica.com/api/job-alerts/unsubscribe?token=signed-token>',
    );
    assert.equal(messages[0].headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
    assert.match(messages[0].text, /Posted 2 hours ago/);
    assert.match(messages[0].text, /70000–85000 GBP/);
    assert.match(messages[0].text, /Project Management/);
    assert.match(messages[0].html, /&lt;Operations Manager&gt;/);
    assert.match(messages[0].html, /https:\/\/jobbridgeafrica\.com\/jobs\/job-123/);
    assert.match(messages[0].html, /unsubscribe-job-alerts\?token=signed-token/);
    assert.match(messages[0].html, /Unsubscribe from email alerts/);
    assert.match(messages[0].text, /Unsubscribe from these alerts:/);
  } finally {
    if (previous.apiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous.apiKey;
    if (previous.resendFrom === undefined) delete process.env.RESEND_FROM;
    else process.env.RESEND_FROM = previous.resendFrom;
    if (previous.frontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = previous.frontendUrl;
    if (previous.backendUrl === undefined) delete process.env.BACKEND_URL;
    else process.env.BACKEND_URL = previous.backendUrl;
    globalThis.fetch = previous.fetch;
  }
});

test('password reset and verification emails use Resend when it is the configured provider', async () => {
  const previous = {
    apiKey: process.env.RESEND_API_KEY,
    resendFrom: process.env.RESEND_FROM,
    emailFrom: process.env.EMAIL_FROM,
    smtpFrom: process.env.SMTP_FROM,
    emailUser: process.env.EMAIL_USER,
    emailPass: process.env.EMAIL_PASS,
    fetch: globalThis.fetch,
  };
  const messages = [];
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.RESEND_FROM = 'verified@example.com';
  delete process.env.EMAIL_FROM;
  delete process.env.SMTP_FROM;
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
    assert.equal(messages[0].from, '"JobBridge Africa" <verified@example.com>');
    assert.match(messages[0].text, /reset-password\/token/);
    assert.match(messages[1].text, /verify-email\/token/);
  } finally {
    if (previous.apiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous.apiKey;
    if (previous.resendFrom === undefined) delete process.env.RESEND_FROM;
    else process.env.RESEND_FROM = previous.resendFrom;
    if (previous.emailFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = previous.emailFrom;
    if (previous.smtpFrom === undefined) delete process.env.SMTP_FROM;
    else process.env.SMTP_FROM = previous.smtpFrom;
    if (previous.emailUser === undefined) delete process.env.EMAIL_USER;
    else process.env.EMAIL_USER = previous.emailUser;
    if (previous.emailPass === undefined) delete process.env.EMAIL_PASS;
    else process.env.EMAIL_PASS = previous.emailPass;
    globalThis.fetch = previous.fetch;
  }
});

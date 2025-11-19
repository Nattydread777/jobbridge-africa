import nodemailer from 'nodemailer';
import asyncHandler from 'express-async-handler';
// Do not import SendGrid at top-level. We'll dynamically import it only when a key is configured.
let sgMail = null;

// @desc    Send contact form email
// @route   POST /api/contact
// @access  Public
const sendContactEmail = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    res.status(400);
    throw new Error('Please fill in all fields');
  }

  // Build SMTP configs
  const primaryPort = Number(process.env.EMAIL_PORT || 587);
  const primarySecure = process.env.EMAIL_SECURE !== undefined
    ? String(process.env.EMAIL_SECURE).toLowerCase() === 'true'
    : primaryPort === 465;

  const primaryConfig = {
    host: process.env.EMAIL_HOST || 'smtp.zoho.com',
    port: primaryPort,
    secure: primarySecure,
    requireTLS: !primarySecure,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  };

  const fallbackConfig = {
    host: process.env.EMAIL_HOST || 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  };

  const diagnostics = { attempts: [], providerUsed: null };
  let transporter = null;
  let smtpReady = false;

  // mailOptions and autoReplyOptions are defined earlier now

  // Prefer SendGrid in production to avoid SMTP egress blocks (Render blocks outbound SMTP).
  const preferSendGrid = Boolean(process.env.SENDGRID_API_KEY && process.env.NODE_ENV === 'production');
  // Try SendGrid first when preferred
  if (preferSendGrid) {
    try {
      const { default: SG } = await import('@sendgrid/mail');
      sgMail = SG;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      diagnostics.attempts.push({ provider: 'sendgrid', init: true });
      diagnostics.providerUsed = 'sendgrid';
      // Send via SendGrid right away
      await sgMail.send({ to: mailOptions.to, from: mailOptions.from, subject: mailOptions.subject, html: mailOptions.html, replyTo: mailOptions.replyTo });
      await sgMail.send({ to: autoReplyOptions.to, from: autoReplyOptions.from, subject: autoReplyOptions.subject, html: autoReplyOptions.html, replyTo: autoReplyOptions.replyTo });
      return res.status(200).json({ success: true, message: 'Message sent via SendGrid (preferred)', transport: diagnostics.providerUsed, diagnostics });
    } catch (e) {
      console.error('SendGrid send error:', e?.message || String(e));
      diagnostics.attempts.push({ provider: 'sendgrid', send_failed: true, error: e?.message || String(e), code: e?.code });
      // fallthrough to SMTP
    }
  }

  // Try primary
  try {
    transporter = nodemailer.createTransport(primaryConfig);
    const start = Date.now();
    await transporter.verify();
    diagnostics.attempts.push({ provider: 'smtp', config: 'primary', ok: true, ms: Date.now() - start });
    smtpReady = true;
    diagnostics.providerUsed = 'smtp-primary';
  } catch (e) {
    diagnostics.attempts.push({ provider: 'smtp', config: 'primary', ok: false, error: e?.message || String(e) });
    // Try fallback
    try {
      transporter = nodemailer.createTransport(fallbackConfig);
      const start2 = Date.now();
      await transporter.verify();
      diagnostics.attempts.push({ provider: 'smtp', config: 'fallback', ok: true, ms: Date.now() - start2 });
      smtpReady = true;
      diagnostics.providerUsed = 'smtp-fallback';
    } catch (e2) {
      diagnostics.attempts.push({ provider: 'smtp', config: 'fallback', ok: false, error: e2?.message || String(e2) });
    }
  }

  // Optionally init SendGrid
  const canUseSendGrid = !smtpReady && process.env.SENDGRID_API_KEY;
  if (canUseSendGrid) {
    try {
      // Dynamically import SendGrid so we don't crash when the package is missing
      // (Render might not have installed it or it may fail during deploy). This keeps startup safe.
      // eslint-disable-next-line no-await-in-loop
      const { default: SG } = await import('@sendgrid/mail');
      sgMail = SG;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      diagnostics.attempts.push({ provider: 'sendgrid', init: true });
      diagnostics.providerUsed = 'sendgrid';
    } catch (e) {
      diagnostics.attempts.push({ provider: 'sendgrid', init: false, error: e?.message || String(e) });
    }
  }

  const defaultFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'info@jobbridgeafrica.org';
  const mailOptions = {
    from: defaultFrom,
    to: 'info@jobbridgeafrica.org',
    subject: `JobBridge Contact: ${subject}`,
    replyTo: email,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">New Contact Form Submission</h2>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>From:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
        </div>
        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h3 style="color:#374151; margin-top:0;">Message:</h3>
          <p style="color:#4b5563; line-height:1.6;">${message.replace(/\n/g,'<br>')}</p>
        </div>
        <div style="margin-top: 20px; padding: 15px; background-color: #ecfdf5; border-left: 4px solid #16a34a; border-radius: 4px;">
          <p style="margin: 0; color: #065f46; font-size: 14px;">📧 <strong>Reply to:</strong> <a href="mailto:${email}" style="color:#16a34a;">${email}</a></p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">This email was sent from the JobBridge Africa contact form.</p>
      </div>
    `,
  };

  const autoReplyOptions = {
    from: defaultFrom,
    to: email,
    subject: 'We received your message - JobBridge Africa',
    replyTo: 'info@jobbridgeafrica.org',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(to right, #16a34a, #15803d); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">JobBridge Africa</h1>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #16a34a; margin-top: 0;">Thank you for contacting us!</h2>
          <p style="color: #4b5563; line-height: 1.6;">Hi ${name},</p>
          <p style="color: #4b5563; line-height: 1.6;">We've received your message and our team will get back to you within 24-48 hours.</p>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>Your message:</strong></p>
            <p style="color: #4b5563; margin-top: 10px;">${message.substring(0, 200)}${message.length > 200 ? '...' : ''}</p>
          </div>
          <div style="margin: 30px 0;">
            <a href="https://www.jobbridgeafrica.org/jobs" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Browse Jobs</a>
          </div>
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              <strong>JobBridge Africa</strong><br>📧 info@jobbridgeafrica.org<br>📞 +234 807 320 8945
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">Supporting UN SDG 8: Decent Work and Economic Growth</p>
          </div>
        </div>
      </div>
    `,
  };

  try {
    if (smtpReady) {
      await transporter.sendMail(mailOptions);
      await transporter.sendMail(autoReplyOptions);
    } else if (diagnostics.providerUsed === 'sendgrid') {
      await sgMail.send({ to: mailOptions.to, from: mailOptions.from, subject: mailOptions.subject, html: mailOptions.html, replyTo: mailOptions.replyTo });
      await sgMail.send({ to: autoReplyOptions.to, from: autoReplyOptions.from, subject: autoReplyOptions.subject, html: autoReplyOptions.html, replyTo: autoReplyOptions.replyTo });
    } else {
      throw new Error('No email transport available (SMTP and SendGrid both unavailable).');
    }

    res.status(200).json({ success: true, message: 'Message sent successfully', transport: diagnostics.providerUsed, diagnostics });
  } catch (error) {
    diagnostics.finalError = error?.message || String(error);
    diagnostics.finalErrorCode = error?.code;
    diagnostics.finalErrorResponse = error?.response?.body || error?.response;
    console.error('Email send error diagnostics:', JSON.stringify(diagnostics, null, 2));
    res.status(500).json({ success: false, message: 'Failed to send email. Please try again later or contact us directly at info@jobbridgeafrica.org', diagnostics });
  }
});

export { sendContactEmail };

// @desc    Email transport health check (no email sent)
// @route   GET /api/contact/health
// @access  Public (read-only)
export const checkEmailHealth = asyncHandler(async (req, res) => {
  // Prefer SendGrid health check in production when an API key is present
  if (process.env.SENDGRID_API_KEY) {
    try {
      const { default: SG } = await import('@sendgrid/mail');
      SG.setApiKey(process.env.SENDGRID_API_KEY);
      return res.json({ ok: true, using: 'sendgrid', results: [{ provider: 'sendgrid', ok: true }] });
    } catch (e) {
      // Fall through to SMTP checks
    }
  }
  const port = Number(process.env.EMAIL_PORT || 587);
  const secure = process.env.EMAIL_SECURE !== undefined
    ? String(process.env.EMAIL_SECURE).toLowerCase() === 'true'
    : port === 465;

  const primaryConfig = {
    host: process.env.EMAIL_HOST || 'smtp.zoho.com',
    port,
    secure,
    requireTLS: !secure,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  };

  const fallbackConfig = {
    host: process.env.EMAIL_HOST || 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  };

  const results = [];

  // Try primary
  try {
    const t1 = nodemailer.createTransport(primaryConfig);
    await t1.verify();
    results.push({ config: 'primary', host: primaryConfig.host, port: primaryConfig.port, secure: primaryConfig.secure, ok: true });
    return res.json({ ok: true, using: 'primary', results });
  } catch (e) {
    results.push({ config: 'primary', host: primaryConfig.host, port: primaryConfig.port, secure: primaryConfig.secure, ok: false, error: e?.message || String(e) });
  }

  // Try fallback
  try {
    const t2 = nodemailer.createTransport(fallbackConfig);
    await t2.verify();
    results.push({ config: 'fallback', host: fallbackConfig.host, port: fallbackConfig.port, secure: fallbackConfig.secure, ok: true });
    return res.json({ ok: true, using: 'fallback', results });
  } catch (e2) {
    results.push({ config: 'fallback', host: fallbackConfig.host, port: fallbackConfig.port, secure: fallbackConfig.secure, ok: false, error: e2?.message || String(e2) });
  }

  res.status(503).json({ ok: false, results, message: 'SMTP connectivity failed for both primary and fallback.' });
});

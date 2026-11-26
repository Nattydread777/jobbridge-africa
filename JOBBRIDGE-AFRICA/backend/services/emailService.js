import nodemailer from 'nodemailer';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

export const isEmailConfigured = () =>
  Boolean(process.env.RESEND_API_KEY?.trim()
    || (process.env.EMAIL_USER?.trim() && process.env.EMAIL_PASS?.trim()));

export const createPasswordResetUrl = (resetToken) => {
  const configuredFrontendUrl = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.APP_URL,
  ].map((url) => url?.trim()).find(Boolean);
  const isProduction = process.env.NODE_ENV === 'production'
    || process.env.RENDER === 'true'
    || Boolean(process.env.RENDER_SERVICE_ID);
  const frontendUrl = configuredFrontendUrl
    || (isProduction ? 'https://jobbridgeafrica.com' : 'http://localhost:5173');

  return new URL(`/reset-password/${encodeURIComponent(resetToken)}`, frontendUrl).toString();
};

const createTransporter = () => {
  const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const emailHost = process.env.EMAIL_HOST || 'smtp.zoho.com';
  if (!emailHost || !emailFrom || !isEmailConfigured()) {
    throw new Error('Email delivery is not configured (EMAIL_USER and EMAIL_PASS are required).');
  }

  const port = Number(process.env.EMAIL_PORT || 465);
  return nodemailer.createTransport({
    host: emailHost,
    port,
    secure: process.env.EMAIL_SECURE
      ? process.env.EMAIL_SECURE === 'true'
      : port === 465,
    auth: {
      user: process.env.EMAIL_USER || emailFrom,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
};

const sendTransactionalEmail = async (message) => {
  const from = process.env.RESEND_FROM || process.env.EMAIL_FROM || process.env.EMAIL_USER;
  if (!from) throw new Error('Email delivery is not configured (RESEND_FROM or EMAIL_FROM is required).');
  if (process.env.RESEND_API_KEY?.trim()) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...message, from }),
    });
    if (!response.ok) {
      throw new Error(`Email delivery provider returned HTTP ${response.status}.`);
    }
    return response.json();
  }
  const transporter = createTransporter();
  return transporter.sendMail({ ...message, from });
};

export const sendEmployerApplicationNotification = async ({ recipient, job, applicant, application }) => {
  if (!recipient) throw new Error('Employer notification recipient is not configured.');
  const transporter = createTransporter();
  const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const name = escapeHtml(applicant.name);
  const email = escapeHtml(applicant.email);
  const phone = escapeHtml(applicant.phone || 'Not provided');
  const country = escapeHtml(applicant.country || 'Not provided');
  const summary = escapeHtml(applicant.bio || 'Not provided');
  const skills = applicant.skills?.length
    ? applicant.skills.map(escapeHtml).join(', ')
    : 'Not provided';
  const education = applicant.education?.length
    ? applicant.education.map((item) => [
      item.degree,
      item.field,
      item.school,
      [item.startYear, item.endYear].filter(Boolean).join('–'),
    ].filter(Boolean).map(escapeHtml).join(' · ')).join('\n')
    : 'Not provided';
  const experience = applicant.experience?.length
    ? applicant.experience.map((item) => [
      item.position,
      item.company,
      [item.startDate, item.endDate].filter(Boolean).join('–'),
      item.description,
    ].filter(Boolean).map(escapeHtml).join(' · ')).join('\n\n')
    : 'Not provided';
  const coverLetter = escapeHtml(application.coverLetter || 'No cover letter provided.');
  const resumeUrl = application.resumeUrl ? escapeHtml(application.resumeUrl) : '';
  const tailoredSections = application.tailoredCv?.sections;
  const tailoredSummary = tailoredSections?.summary
    ? escapeHtml(tailoredSections.summary)
    : '';
  const tailoredExperience = Array.isArray(tailoredSections?.experience)
    ? tailoredSections.experience.map((role) => {
      const heading = [role.title, role.company, role.dates, role.location].filter(Boolean).map(escapeHtml).join(' · ');
      const bullets = (role.bullets || []).map((bullet) => bullet.editedText || (bullet.accepted ? bullet.tailoredBullet : bullet.sourceBullet))
        .filter(Boolean)
        .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
        .join('');
      return `<p><strong>${heading}</strong></p><ul>${bullets}</ul>`;
    }).join('')
    : '';

  return transporter.sendMail({
    from: emailFrom,
    to: recipient,
    subject: `New application: ${job.title} — ${applicant.name}`,
    text: [
      `A new application was submitted for ${job.title} at ${job.companyName}.`,
      `Applicant: ${applicant.name} (${applicant.email})`,
      `Phone: ${applicant.phone || 'Not provided'}`,
      `Country: ${applicant.country || 'Not provided'}`,
      `Summary: ${applicant.bio || 'Not provided'}`,
      `Skills: ${applicant.skills?.join(', ') || 'Not provided'}`,
      `Education:\n${applicant.education?.map((item) => [item.degree, item.field, item.school, item.endYear].filter(Boolean).join(' · ')).join('\n') || 'Not provided'}`,
      `Experience:\n${applicant.experience?.map((item) => [item.position, item.company, item.description].filter(Boolean).join(' · ')).join('\n') || 'Not provided'}`,
      `Resume: ${application.resumeUrl || (tailoredSections ? 'Job-specific tailored CV is available in the employer dashboard.' : 'Not provided')}`,
      ...(tailoredSections ? [
        `Tailored CV summary: ${tailoredSections.summary || 'Not provided'}`,
        `Tailored CV experience:\n${tailoredSections.experience?.map((role) => [
          [role.title, role.company, role.dates].filter(Boolean).join(' · '),
          ...(role.bullets || []).map((bullet) => bullet.editedText || (bullet.accepted ? bullet.tailoredBullet : bullet.sourceBullet)),
        ].filter(Boolean).join('\n')).join('\n\n') || 'Not provided'}`,
      ] : []),
      `Cover letter: ${application.coverLetter || 'No cover letter provided.'}`,
    ].join('\n'),
    html: `<h2>New application for ${escapeHtml(job.title)}</h2>
      <p><strong>Applicant:</strong> ${name} (${email})</p>
      <p><strong>Phone:</strong> ${phone}<br><strong>Country:</strong> ${country}</p>
      <p><strong>Summary:</strong> ${summary}</p>
      <p><strong>Skills:</strong> ${skills}</p>
      <h3>Education</h3><p>${education.replace(/\n/g, '<br>')}</p>
      <h3>Experience</h3><p>${experience.replace(/\n/g, '<br>')}</p>
      <p><strong>Resume:</strong> ${resumeUrl ? `<a href="${resumeUrl}">View candidate resume</a>` : tailoredSections ? 'A job-specific tailored CV is available in the employer dashboard.' : 'Not provided'}</p>
      ${tailoredSummary ? `<h3>Tailored CV summary</h3><p>${tailoredSummary}</p>` : ''}
      ${tailoredExperience ? `<h3>Tailored CV experience</h3>${tailoredExperience}` : ''}
      <h3>Cover letter</h3><p>${coverLetter.replace(/\n/g, '<br>')}</p>`,
  });
};

export const sendPasswordResetEmail = async ({ recipient, name, resetUrl }) => {
  if (!recipient || !resetUrl) {
    throw new Error('Password reset email requires a recipient and reset URL.');
  }
  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(resetUrl);

  return sendTransactionalEmail({
    to: recipient,
    subject: 'Reset your JobBridge Africa password',
    text: [
      `Hello ${name || 'there'},`,
      '',
      'We received a request to reset the password for your JobBridge Africa account.',
      `Use this link to choose a new password: ${resetUrl}`,
      '',
      'This link expires in 60 minutes and can only be used once. If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `<p>Hello ${safeName},</p>
      <p>We received a request to reset the password for your JobBridge Africa account.</p>
      <p><a href="${safeUrl}">Choose a new password</a></p>
      <p>This link expires in 60 minutes and can only be used once. If you did not request this, you can ignore this email.</p>`,
  });
};

export const sendEmailVerification = async ({ recipient, name, verificationUrl }) => {
  if (!recipient || !verificationUrl) {
    throw new Error('Email verification requires a recipient and verification URL.');
  }
  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(verificationUrl);

  return sendTransactionalEmail({
    to: recipient,
    subject: 'Verify your JobBridge Africa email',
    text: [
      `Hello ${name || 'there'},`,
      '',
      'Confirm your email address to activate your JobBridge Africa account.',
      `Verify your email: ${verificationUrl}`,
      '',
      'This link expires in 24 hours. If you did not create an account, you can ignore this email.',
    ].join('\n'),
    html: `<p>Hello ${safeName},</p>
      <p>Confirm your email address to activate your JobBridge Africa account.</p>
      <p><a href="${safeUrl}">Verify your email</a></p>
      <p>This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>`,
  });
};

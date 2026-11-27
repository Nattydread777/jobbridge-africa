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

export const getFrontendBaseUrl = () => {
  const configuredFrontendUrl = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.APP_URL,
  ].map((url) => url?.trim()).find(Boolean);
  const isProduction = process.env.NODE_ENV === 'production'
    || process.env.RENDER === 'true'
    || Boolean(process.env.RENDER_SERVICE_ID);
  return configuredFrontendUrl
    || (isProduction ? 'https://jobbridgeafrica.com' : 'http://localhost:5173');
};

export const createPasswordResetUrl = (resetToken) => {
  const frontendUrl = getFrontendBaseUrl();
  return new URL(`/reset-password/${encodeURIComponent(resetToken)}`, frontendUrl).toString();
};

const postedTimeFor = (value) => {
  const postedAt = new Date(value);
  if (!value || Number.isNaN(postedAt.getTime())) return 'Posted recently';
  const hours = Math.max(0, Math.floor((Date.now() - postedAt.getTime()) / (60 * 60 * 1000)));
  if (hours < 1) {
    const minutes = Math.max(1, Math.floor((Date.now() - postedAt.getTime()) / (60 * 1000)));
    return `Posted ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (hours < 24) return `Posted ${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `Posted ${days} day${days === 1 ? '' : 's'} ago`;
};

const digestText = (value, limit = 420) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  const excerpt = text.slice(0, limit);
  const boundary = excerpt.lastIndexOf(' ');
  return `${excerpt.slice(0, boundary > limit * 0.6 ? boundary : limit).trim()}…`;
};

const digestListingUrl = (job) => {
  const id = job._id || job.id;
  if (!id) throw new Error('Job digest entries must have an ID.');
  return new URL(`/jobs/${encodeURIComponent(id)}`, getFrontendBaseUrl()).toString();
};

export const sendJobDigestEmail = async ({
  recipient,
  name,
  jobs,
  unsubscribeUrl,
  context = 'These roles were selected using the skills, experience, and work preferences on your profile.',
}) => {
  if (!recipient || !Array.isArray(jobs) || !jobs.length || !unsubscribeUrl) {
    throw new Error('A job digest requires a recipient, matching roles, and an unsubscribe URL.');
  }
  const safeName = escapeHtml(name || 'there');
  const safeContext = escapeHtml(context);
  const safeUnsubscribeUrl = escapeHtml(unsubscribeUrl);
  const entries = jobs.map(({ job }) => {
    if (!job) throw new Error('Job digest entries must include a job.');
    const title = escapeHtml(job.title || 'Job opportunity');
    const company = escapeHtml(job.companyName || 'Company not listed');
    const location = escapeHtml(job.location || 'Location not specified');
    const mode = escapeHtml(job.workplaceType || (job.isRemote ? 'Remote' : 'Not specified'));
    const type = escapeHtml(job.jobType || 'Not specified');
    const level = escapeHtml(job.seniority || 'Not specified');
    const compensationValue = job.salary || job.salaryRange;
    const compensation = compensationValue
      ? `${escapeHtml(compensationValue)}${job.salaryCurrency ? ` ${escapeHtml(job.salaryCurrency)}` : ''}`
      : 'Not listed';
    const posted = postedTimeFor(job.pubDate || job.createdAt);
    const highlights = digestText(
      job.responsibilities || job.fullDescription || job.description || job.excerpt || 'View the listing for role details.',
    );
    const tags = [...new Set([...(job.tags || []), ...(job.categories || [])])]
      .filter(Boolean)
      .slice(0, 8);
    const url = digestListingUrl(job);
    const safeUrl = escapeHtml(url);
    const safeHighlights = escapeHtml(highlights);
    const tagText = tags.length ? tags.join(', ') : 'Not specified';
    const htmlTags = tags.map((tag) => `<span style="display:inline-block;margin:3px;padding:4px 8px;border-radius:12px;background:#f1f5f9;color:#334155">${escapeHtml(tag)}</span>`).join('');
    return {
      text: [
        `${job.title || 'Job opportunity'} — ${job.companyName || 'Company not listed'}`,
        posted,
        `Location: ${job.location || 'Not specified'} · ${job.workplaceType || (job.isRemote ? 'Remote' : 'Not specified')}`,
        `Type: ${job.jobType || 'Not specified'} · Level: ${job.seniority || 'Not specified'} · Compensation: ${compensationValue || 'Not listed'}${job.salaryCurrency ? ` ${job.salaryCurrency}` : ''}`,
        `Highlights: ${highlights}`,
        `Skills / domain: ${tagText}`,
        `Apply ↗: ${url}`,
      ].join('\n'),
      html: `<article style="margin:20px 0;padding:20px;border:1px solid #e2e8f0;border-radius:12px">
        <p style="margin:0;color:#64748b">${escapeHtml(posted)}</p>
        <h2 style="margin:8px 0"><a href="${safeUrl}" style="color:#92400e">${title}</a></h2>
        <p style="margin:0 0 12px;color:#334155">${company}</p>
        <p><strong>Location:</strong> ${location} · ${mode}<br>
          <strong>Type:</strong> ${type} · <strong>Level:</strong> ${level}<br>
          <strong>Compensation:</strong> ${compensation}</p>
        <p><strong>Responsibilities / highlights:</strong> ${safeHighlights}</p>
        <p><strong>Skills / domain:</strong> ${htmlTags || escapeHtml(tagText)}</p>
        <p><a href="${safeUrl}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#b45309;color:#fff;text-decoration:none;font-weight:bold">View role &amp; apply ↗</a></p>
      </article>`,
    };
  });
  const text = [
    `Hello ${name || 'there'},`,
    '',
    context,
    '',
    ...entries.map((entry) => entry.text),
    '',
    `Manage or unsubscribe from these alerts: ${unsubscribeUrl}`,
  ].join('\n\n');
  const html = `<main style="max-width:680px;margin:auto;font-family:Arial,sans-serif;color:#0f172a;line-height:1.55">
    <h1 style="color:#0f172a">Roles that fit your profile</h1>
    <p>Hello ${safeName},</p>
    <p>${safeContext}</p>
    ${entries.map((entry) => entry.html).join('')}
    <hr style="border:0;border-top:1px solid #e2e8f0;margin-top:28px">
    <p style="font-size:13px;color:#64748b">You received this because you opted in to personalized JobBridge Africa job alerts. <a href="${safeUnsubscribeUrl}">Manage or unsubscribe</a>.</p>
  </main>`;

  return sendTransactionalEmail({
    to: recipient,
    subject: `Job matches for your profile (${jobs.length})`,
    text,
    html,
  });
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

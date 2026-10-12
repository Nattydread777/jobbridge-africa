import nodemailer from 'nodemailer';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

const createTransporter = () => {
  const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const emailHost = process.env.EMAIL_HOST || 'smtp.zoho.com';
  if (!emailHost || !emailFrom || !process.env.EMAIL_PASS) {
    throw new Error('Email delivery is not configured (EMAIL_USER/EMAIL_FROM and EMAIL_PASS are required).');
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
  });
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
  const resumeUrl = escapeHtml(application.resumeUrl);

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
      `Resume: ${application.resumeUrl}`,
      `Cover letter: ${application.coverLetter || 'No cover letter provided.'}`,
    ].join('\n'),
    html: `<h2>New application for ${escapeHtml(job.title)}</h2>
      <p><strong>Applicant:</strong> ${name} (${email})</p>
      <p><strong>Phone:</strong> ${phone}<br><strong>Country:</strong> ${country}</p>
      <p><strong>Summary:</strong> ${summary}</p>
      <p><strong>Skills:</strong> ${skills}</p>
      <h3>Education</h3><p>${education.replace(/\n/g, '<br>')}</p>
      <h3>Experience</h3><p>${experience.replace(/\n/g, '<br>')}</p>
      <p><strong>Resume:</strong> <a href="${resumeUrl}">View candidate resume</a></p>
      <h3>Cover letter</h3><p>${coverLetter.replace(/\n/g, '<br>')}</p>`,
  });
};

export const sendPasswordResetEmail = async ({ recipient, name, resetUrl }) => {
  if (!recipient || !resetUrl) {
    throw new Error('Password reset email requires a recipient and reset URL.');
  }
  const transporter = createTransporter();
  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(resetUrl);

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
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

import nodemailer from 'nodemailer';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

export const sendEmployerApplicationNotification = async ({ recipient, job, applicant, application }) => {
  if (!recipient) throw new Error('Employer notification recipient is not configured.');
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_FROM || !process.env.EMAIL_PASS) {
    throw new Error('Email delivery is not configured (EMAIL_HOST, EMAIL_FROM, EMAIL_PASS).');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: Number(process.env.EMAIL_PORT || 587) === 465,
    auth: {
      user: process.env.EMAIL_USER || process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASS,
    },
  });
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
    from: process.env.EMAIL_FROM,
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

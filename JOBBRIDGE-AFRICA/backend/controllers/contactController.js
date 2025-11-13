import nodemailer from 'nodemailer';
import asyncHandler from 'express-async-handler';

// @desc    Send contact form email
// @route   POST /api/contact
// @access  Public
const sendContactEmail = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    res.status(400);
    throw new Error('Please fill in all fields');
  }

  // Create transporter using Zoho SMTP
  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER, // Your Zoho email
      pass: process.env.EMAIL_PASS, // Your Zoho app password
    },
  });

  // Email to admin
  const mailOptions = {
    from: process.env.EMAIL_USER,
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
          <h3 style="color: #374151; margin-top: 0;">Message:</h3>
          <p style="color: #4b5563; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
        </div>
        <div style="margin-top: 20px; padding: 15px; background-color: #ecfdf5; border-left: 4px solid #16a34a; border-radius: 4px;">
          <p style="margin: 0; color: #065f46; font-size: 14px;">
            📧 <strong>Reply to:</strong> <a href="mailto:${email}" style="color: #16a34a;">${email}</a>
          </p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
          This email was sent from the JobBridge Africa contact form.
        </p>
      </div>
    `,
  };

  // Auto-reply to sender
  const autoReplyOptions = {
    from: process.env.EMAIL_USER,
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
          <p style="color: #4b5563; line-height: 1.6;">
            Hi ${name},
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            We've received your message and our team will get back to you within 24-48 hours. 
            We appreciate your interest in JobBridge Africa!
          </p>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>Your message:</strong></p>
            <p style="color: #4b5563; margin-top: 10px;">${message.substring(0, 200)}${message.length > 200 ? '...' : ''}</p>
          </div>
          <p style="color: #4b5563; line-height: 1.6;">
            In the meantime, feel free to explore our platform and discover opportunities across Africa.
          </p>
          <div style="margin: 30px 0;">
            <a href="https://www.jobbridgeafrica.org/jobs" 
               style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Browse Jobs
            </a>
          </div>
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              <strong>JobBridge Africa</strong><br>
              📧 info@jobbridgeafrica.org<br>
              📞 +234 807 320 8945
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">
              Supporting UN SDG 8: Decent Work and Economic Growth
            </p>
          </div>
        </div>
      </div>
    `,
  };

  try {
    // Send both emails
    await transporter.sendMail(mailOptions);
    await transporter.sendMail(autoReplyOptions);

    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500);
    throw new Error('Failed to send email. Please try again later or contact us directly at info@jobbridgeafrica.org');
  }
});

export { sendContactEmail };

const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

/**
 * Send a generic email
 * @param {Object} options - { to, subject, html, text }
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"EcoREALM Command Center" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 Email sent: ${info.messageId} → ${to}`);
  return info;
};

/**
 * Send email verification link
 */
const sendVerificationEmail = async (user, verificationToken) => {
  const url = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
  await sendEmail({
    to: user.email,
    subject: '🌱 EcoREALM — Verify Your Guardian Account',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a1628;color:#e2e8f0;padding:40px;border-radius:16px;">
        <h1 style="color:#00ff88;font-size:24px;">Welcome, Guardian ${user.username}!</h1>
        <p style="color:#94a3b8;">Your EcoREALM account has been created. Verify your email to activate your Guardian profile and begin your restoration mission.</p>
        <a href="${url}" style="display:inline-block;margin:24px 0;padding:14px 32px;background:linear-gradient(135deg,#00ff88,#00d4aa);color:#0a1628;font-weight:700;border-radius:8px;text-decoration:none;">
          VERIFY GUARDIAN IDENTITY
        </a>
        <p style="color:#64748b;font-size:12px;">This link expires in 24 hours. If you did not create this account, ignore this email.</p>
      </div>
    `
  });
};

/**
 * Send password reset link
 */
const sendPasswordResetEmail = async (user, resetToken) => {
  const url = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: user.email,
    subject: '🔐 EcoREALM — Password Reset Request',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a1628;color:#e2e8f0;padding:40px;border-radius:16px;">
        <h1 style="color:#f59e0b;font-size:24px;">Password Reset — EcoREALM</h1>
        <p style="color:#94a3b8;">A password reset was requested for your account. Click the button below to set a new password.</p>
        <a href="${url}" style="display:inline-block;margin:24px 0;padding:14px 32px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;font-weight:700;border-radius:8px;text-decoration:none;">
          RESET COMMAND ACCESS
        </a>
        <p style="color:#64748b;font-size:12px;">This link expires in 1 hour. If you did not request this, your account is safe — ignore this email.</p>
      </div>
    `
  });
};

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };

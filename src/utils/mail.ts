// src/utils/mail.ts
// ✔ This file handles all email sending (OTP, alerts, notifications)
// ✔ Uses Nodemailer with Gmail App Password (Most reliable method)

import nodemailer from 'nodemailer';

const EMAIL_USER = process.env.SMTP_USER || '';
const EMAIL_PASS = process.env.SMTP_PASS || '';

// Create reusable transporter
export const mailTransporter = nodemailer.createTransport({
  service: 'gmail', // Gmail SMTP
  auth: {
    user: EMAIL_USER, // Gmail address
    pass: EMAIL_PASS, // Gmail App password (NOT your login password)
  },
});

/**
 * Send OTP Email
 * @param email - Target email
 * @param otp - 6-digit OTP
 */
export const sendOtpEmail = async (email: string, otp: string) => {
  const mailOptions = {
    from: `"Parent Tracker App" <${EMAIL_USER}>`,
    to: email,
    subject: 'Your Verification OTP Code',
    html: `
      <div style="font-family: Arial; padding: 20px;">
        <h2>Your OTP Code</h2>
        <p style="font-size: 20px; font-weight: bold;">${otp}</p>
        <p>This OTP is valid for <b>5 minutes</b>.</p>
        <br/>
        <p>Thank you,<br/>Parent Tracker Team</p>
      </div>
    `,
  };

  // Send email
  await mailTransporter.sendMail(mailOptions);
};

"use strict";
// src/utils/mail.ts
// ✔ This file handles all email sending (OTP, alerts, notifications)
// ✔ Uses Nodemailer with Gmail App Password (Most reliable method)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpEmail = exports.mailTransporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const EMAIL_USER = process.env.SMTP_USER || '';
const EMAIL_PASS = process.env.SMTP_PASS || '';
// Create reusable transporter
exports.mailTransporter = nodemailer_1.default.createTransport({
    // service: 'gmail', // Gmail SMTP
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});
/**
 * Send OTP Email
 * @param email - Target email
 * @param otp - 6-digit OTP
 */
const sendOtpEmail = async (email, otp) => {
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
    await exports.mailTransporter.sendMail(mailOptions);
};
exports.sendOtpEmail = sendOtpEmail;

// src/utils/mail.ts
// ✔ Email sending using RESEND (No SMTP timeout issues)

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send OTP Email
 * @param email - Target email
 * @param otp - 6-digit OTP
 */
export const sendOtpEmail = async (email: string, otp: string) => {

  try {

    const response = await resend.emails.send({
      from: "Parent Tracker App <onboarding@resend.dev>",
      to: email,
      subject: "Your Verification OTP Code",
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>Your OTP Code</h2>
          <p style="font-size: 20px; font-weight: bold;">${otp}</p>
          <p>This OTP is valid for <b>5 minutes</b>.</p>
          <br/>
          <p>Thank you,<br/>Parent Tracker Team</p>
        </div>
      `,
    });

    console.log("Email sent:", response);

  } catch (error) {

    console.error("SEND OTP ERROR:", error);
    throw error;

  }

};

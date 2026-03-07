
import { Router } from "express";
import { z } from 'zod';

import { upload } from "../middlewares/upload";
import Otp from '../models/Otp';
import User from '../models/user';
import { signAccessToken, signRefreshToken } from '../utils/jwt.js';
import { sendOtpEmail } from '../utils/mail';
import { uploadToS3 } from "../utils/uploadToS3";
import jwt from "jsonwebtoken";
import RefreshToken from "../models/refreshtoken";
const router = Router();

/* ---------------------------------------------------------
   📌 1. SEND OTP
---------------------------------------------------------- */

router.post('/send-otp', async (req, res) => {
  try {
    const bodySchema = z.object({
      email: z.string().email(),
    });


    const parsed = bodySchema.safeParse(req.body);

    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: 'Invalid input',
        errors: parsed.error, // optional
      });

    const { email } = parsed.data;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000)?.toString();

    console.log(otp, "Otpd")
    // Remove existing OTP (cleanup)
    await Otp.deleteMany({ email });

    // Save OTP with 5 min expiry
    await Otp.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });


    await sendOtpEmail(email, otp); // <<--- real email send

    res.status(200).json({
      status: true,
      message: 'OTP sent successfully',
      otp: otp
    });
  } catch (err) {
    console.error('SEND OTP ERROR:', err);
    res.status(500).json({ status: false, message: 'Failed to send OTP' });
  }
});

/* ---------------------------------------------------------
   📌 2. VERIFY OTP
---------------------------------------------------------- */

interface VerifyOtpResponse {
  status: boolean;
  message: string;
  refreshToken?: string;
  AuthenticationToken?: string;
  user?: any;
  otp?: string;
}
router.post('/verify-otp', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      otp: z.string().length(6),
    });


    const parsed = schema.safeParse(req.body);

    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: 'Invalid input',
        errors: parsed.error, // optional
      });

    const { email, otp } = parsed.data;

    // Check in DB
    const record = await Otp.findOne({ email, otp });

    if (!record)
      return res.status(400).json({ status: false, message: 'Invalid OTP' });

    if (record.expiresAt < new Date())
      return res.status(400).json({ status: false, message: 'OTP Expired' });

    // Mark OTP as verified
    record.verified = true;
    await record.save();

    //  Check user is exit or not
    let exists = await User.findOne({ email }).lean();;
    let response: VerifyOtpResponse = {
      status: true,
      message: 'OTP Verified',
    };
    if (exists) {

      const accessToken = signAccessToken(exists);
      const refreshToken = signRefreshToken(exists);

      await RefreshToken.deleteMany({ userId: exists._id });
      await RefreshToken.create({
        userId: exists._id,
        token: refreshToken,
      });


      response.AuthenticationToken = accessToken;
      response.refreshToken = refreshToken;
      response.user = exists;


    }



    res.status(200).json(response);
  } catch (err) {
    console.error('VERIFY OTP ERROR:', err);
    res.status(500).json({ status: false, message: 'OTP Verification Failed' });
  }
});

/* ---------------------------------------------------------
   📌 3. COMPLETE PROFILE (Register User)
---------------------------------------------------------- */

async function generateUniqueInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  while (true) {
    let code = '';
    for (let i = 0; i < 9; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const exists = await User.findOne({ inviteCode: code }).lean();
    if (!exists) return code; // Unique → return this
  }
}


router.post('/complete-profile',
  upload.single("profilePhoto"),   // <- IMPORTANT
  async (req, res) => {

    try {
      const schema = z.object({
        email: z.string().email(),
        gender: z.string().optional(),
        name: z.string().min(2),
        role: z.enum(['parent', 'child',]),
        phone: z.string().optional(),
      });


      console.log(req.file, "req.file")



      const parsed = schema.safeParse(req.body);

      if (!parsed.success) return res.status(400).json({
        success: false,
        message: 'Invalid input',
        errors: parsed.error, // optional
      });
      // tempToken,
      const { name, role, phone, email, gender } = parsed.data;


      let exists = await Otp.findOne({ email, verified: true }).lean();;



      if (!exists) {
        return res.status(400).json({
          status: false,
          message: 'Email is not Verify',
        });
      }





      // 👇 Generate invite code ONLY for parent
      let inviteCode: string | undefined = undefined;
      if (role === 'parent') {
        inviteCode = await generateUniqueInviteCode();
      }

      // Upload image to S3
      let profilePhotoUrl: string | null = null;
      if (req.file) {
        profilePhotoUrl = await uploadToS3(req.file);
      }




      // Create new user
      const user = await User.create({
        name,
        email,
        role,
        phone,
        gender,
        avatarUrl: profilePhotoUrl,
        inviteCode,
      });


      // Generate final login token
      const accessToken = signAccessToken(user);
      const refreshToken = signRefreshToken(user);


      await RefreshToken.deleteMany({ userId: user._id });
      await RefreshToken.create({
        userId: user._id,
        token: refreshToken,
      });
      res.status(200).json({
        status: true,
        message: 'Profile Completed',
        AuthenticationToken: accessToken,
        user: {
          name,
          email,
          role,
          phone,
          gender,
          avatarUrl: profilePhotoUrl,
          inviteCode,
        },
        refreshToken
      });
    } catch (err) {
      console.error('COMPLETE PROFILE ERROR:', err);
      res
        .status(500)
        .json({ status: false, message: 'Failed to complete profile' });
    }
  });







router.post("/refresh", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      return res.status(401).json({ code: "REFRESH_MISSING" });
    }

    const refreshToken = auth.split(" ")[1];

    const payload: any = jwt.verify(
      refreshToken,
      process.env.REFRESH_SECRET!
    );


    const stored = await RefreshToken.findOne({
      userId: payload?._id,
      token: refreshToken,
    });


    if (!stored) {
      return res.status(401).json({ code: "REFRESH_INVALID" });
    }

    const user = await User.findById(payload._id);
    if (!user || user.isBlocked) {
      return res.status(403).json({ code: "USER_BLOCKED" });
    }

    const newAccessToken = signAccessToken(user);
    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.log(err, "err")
    return res.status(401).json({ code: "REFRESH_EXPIRED" });
  }
});



export default router;

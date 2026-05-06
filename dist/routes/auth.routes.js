"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const upload_1 = require("../middlewares/upload");
const Otp_1 = __importDefault(require("../models/Otp"));
const user_1 = __importDefault(require("../models/user"));
const jwt_js_1 = require("../utils/jwt.js");
const mail_1 = require("../utils/mail");
const uploadToS3_1 = require("../utils/uploadToS3");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const refreshtoken_1 = __importDefault(require("../models/refreshtoken"));
const router = (0, express_1.Router)();
/* ---------------------------------------------------------
   📌 1. SEND OTP
---------------------------------------------------------- */
router.post('/send-otp', async (req, res) => {
    try {
        const bodySchema = zod_1.z.object({
            email: zod_1.z.string().email(),
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
        console.log(otp, "Otpd");
        // Remove existing OTP (cleanup)
        await Otp_1.default.deleteMany({ email });
        // Save OTP with 5 min expiry
        await Otp_1.default.create({
            email,
            otp,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });
        await (0, mail_1.sendOtpEmail)(email, otp); // <<--- real email send
        res.status(200).json({
            status: true,
            message: 'OTP sent successfully',
            otp: otp
        });
    }
    catch (err) {
        console.error('SEND OTP ERROR:', err);
        res.status(500).json({ status: false, message: 'Failed to send OTP' });
    }
});
router.post('/verify-otp', async (req, res) => {
    try {
        const schema = zod_1.z.object({
            email: zod_1.z.string().email(),
            otp: zod_1.z.string().length(6),
            deviceId: zod_1.z.string().optional(),
            deviceName: zod_1.z.string().optional(),
            deviceType: zod_1.z.string().optional(),
            platform: zod_1.z.string().optional(),
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({
                success: false,
                message: 'Invalid input',
                errors: parsed.error, // optional
            });
        const { email, otp, deviceId, deviceName, deviceType, platform } = parsed.data;
        console.log(deviceId, deviceName, deviceType, platform, "deviceId, deviceName, deviceType, platform");
        // Check in DB
        const record = await Otp_1.default.findOne({ email, otp });
        if (!record)
            return res.status(400).json({ status: false, message: 'Invalid OTP' });
        if (record.expiresAt < new Date())
            return res.status(400).json({ status: false, message: 'OTP Expired' });
        // Mark OTP as verified
        record.verified = true;
        await record.save();
        //  Check user is exit or not
        let exists = await user_1.default.findOne({ email }).lean();
        ;
        let response = {
            status: true,
            message: 'OTP Verified',
        };
        if (exists) {
            const accessToken = (0, jwt_js_1.signAccessToken)(exists);
            const refreshToken = (0, jwt_js_1.signRefreshToken)(exists);
            await refreshtoken_1.default.deleteMany({ userId: exists._id });
            await refreshtoken_1.default.create({
                userId: exists._id,
                token: refreshToken,
            });
            // 🔥 DEVICE SAVE LOGIC START
            if (deviceId) {
                const alreadyExists = exists.devices?.find((d) => d.deviceId === deviceId);
                if (alreadyExists) {
                    // update existing device
                    await user_1.default.updateOne({
                        _id: exists._id,
                        "devices.deviceId": deviceId
                    }, {
                        $set: {
                            "devices.$.isOnline": true,
                            "devices.$.lastSeen": new Date(),
                            // 🔥 IMPORTANT
                            "devices.$.deviceName": deviceName,
                            "devices.$.deviceType": deviceType,
                            "devices.$.platform": platform
                        }
                    });
                }
                else {
                    // add new device
                    await user_1.default.updateOne({ _id: exists._id }, {
                        $push: {
                            devices: {
                                deviceId,
                                deviceName,
                                deviceType,
                                platform,
                                isOnline: true,
                                lastSeen: new Date(),
                                isTrusted: false
                            }
                        }
                    });
                }
            }
            // 🔥 DEVICE SAVE LOGIC END
            // fresh user return karo
            const updatedUser = await user_1.default.findById(exists._id);
            response.AuthenticationToken = accessToken;
            response.refreshToken = refreshToken;
            response.user = updatedUser;
        }
        res.status(200).json(response);
    }
    catch (err) {
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
        const exists = await user_1.default.findOne({ inviteCode: code }).lean();
        if (!exists)
            return code; // Unique → return this
    }
}
router.post('/complete-profile', upload_1.upload.single("profilePhoto"), // <- IMPORTANT
async (req, res) => {
    try {
        const schema = zod_1.z.object({
            email: zod_1.z.string().email(),
            gender: zod_1.z.string().optional(),
            name: zod_1.z.string().min(2),
            role: zod_1.z.enum(['parent', 'child',]),
            phone: zod_1.z.string().optional(),
            deviceId: zod_1.z.string().optional(),
            deviceName: zod_1.z.string().optional(),
            deviceType: zod_1.z.string().optional(),
            platform: zod_1.z.string().optional(),
        });
        console.log(req.file, "req.file");
        const parsed = schema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({
                success: false,
                message: 'Invalid input',
                errors: parsed.error, // optional
            });
        // tempToken,
        const { name, role, phone, email, gender, deviceId, deviceName, deviceType, platform } = parsed.data;
        let exists = await Otp_1.default.findOne({ email, verified: true }).lean();
        ;
        if (!exists) {
            return res.status(400).json({
                status: false,
                message: 'Email is not Verify',
            });
        }
        // 👇 Generate invite code ONLY for parent
        let inviteCode = undefined;
        if (role === 'parent') {
            inviteCode = await generateUniqueInviteCode();
        }
        // Upload image to S3
        let profilePhotoUrl = null;
        if (req.file) {
            profilePhotoUrl = await (0, uploadToS3_1.uploadToS3)(req.file);
        }
        // Create new user
        const user = await user_1.default.create({
            name,
            email,
            role,
            phone,
            gender,
            avatarUrl: profilePhotoUrl,
            inviteCode,
            devices: deviceId
                ? [
                    {
                        deviceId,
                        deviceName,
                        deviceType,
                        platform,
                        isOnline: true,
                        lastSeen: new Date(),
                        isTrusted: true // first device trusted 🔥
                    }
                ]
                : []
        });
        // Generate final login token
        const accessToken = (0, jwt_js_1.signAccessToken)(user);
        const refreshToken = (0, jwt_js_1.signRefreshToken)(user);
        await refreshtoken_1.default.deleteMany({ userId: user._id });
        await refreshtoken_1.default.create({
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
    }
    catch (err) {
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
        const payload = jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_SECRET);
        const stored = await refreshtoken_1.default.findOne({
            userId: payload?._id,
            token: refreshToken,
        });
        if (!stored) {
            return res.status(401).json({ code: "REFRESH_INVALID" });
        }
        const user = await user_1.default.findById(payload._id);
        if (!user || user.isBlocked) {
            return res.status(403).json({ code: "USER_BLOCKED" });
        }
        const newAccessToken = (0, jwt_js_1.signAccessToken)(user);
        return res.json({ accessToken: newAccessToken });
    }
    catch (err) {
        console.log(err, "err");
        return res.status(401).json({ code: "REFRESH_EXPIRED" });
    }
});
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_js_1 = __importDefault(require("./auth.routes.js"));
const connection_routes_js_1 = __importDefault(require("./connection.routes.js"));
const notification_routes_js_1 = __importDefault(require("./notification.routes.js"));
const authMiddleware_js_1 = require("../middlewares/authMiddleware.js");
const user_js_1 = __importDefault(require("../models/user.js"));
const tracking_routes_js_1 = __importDefault(require("./tracking.routes.js"));
const mongoose_1 = __importDefault(require("mongoose"));
const addsafezone_routes_js_1 = __importDefault(require("./addsafezone.routes.js"));
const Notification_js_1 = __importDefault(require("../models/Notification.js"));
const notificationService_js_1 = require("../services/notificationService.js");
const index_js_1 = require("../index.js");
const router = (0, express_1.Router)();
router.use('/auth/v1', auth_routes_js_1.default);
router.use('/connection/v1', connection_routes_js_1.default);
router.use('/notification/v1', notification_routes_js_1.default);
router.use('/tracking/v1', tracking_routes_js_1.default);
router.use('/safe-zone/v1', addsafezone_routes_js_1.default);
//  Genrate FireBase Token  ----- start
// "api//tracking/v1/child/update-live",
router.post("/user/fcm-token", (0, authMiddleware_js_1.verifyUser)(), async (req, res) => {
    const { token } = req.body;
    console.log("📲 Saving token for user:", req.user._id);
    console.log("📲 Token:", token);
    await user_js_1.default.updateOne({ _id: req.user._id }, { $addToSet: { fcmTokens: token } });
    res.json({ success: true });
});
// get children parent wise ---------------- start
/**
 * ✅ Get all children of logged-in parent (FAST + CLEAN)
 * -
 *  parent login required
 * - returns children list with basic profile fields
 */
router.get("/parent/children/v1", (0, authMiddleware_js_1.verifyUser)("parent"), async (req, res) => {
    try {
        const parentId = new mongoose_1.default.Types.ObjectId(req.user._id);
        const result = await user_js_1.default.aggregate([
            // 1️⃣ Match logged-in parent
            {
                $match: {
                    _id: parentId,
                    role: "parent",
                },
            },
            // 2️⃣ Convert children array into documents
            {
                $lookup: {
                    from: "users",
                    localField: "children", // parent.children = [childId1, childId2]
                    foreignField: "_id",
                    as: "childrenData",
                    pipeline: [
                        // ✅ Return only required fields (FAST)
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                email: 1,
                                avatarUrl: 1,
                                // 🔥 NEW (IMPORTANT)
                                devices: 1,
                                lastActiveDeviceId: 1,
                                lastLocation: 1,
                                lastLocationTime: 1,
                                createdAt: 1,
                            },
                        }
                    ],
                },
            },
            // 3️⃣ Final response shape
            {
                $project: {
                    _id: 0,
                    parentId: "$_id",
                    children: "$childrenData",
                },
            },
        ]);
        const data = result?.[0] || { parentId: req.user._id, children: [] };
        console.log(data, 'data Parent Child');
        return res.status(200).json({
            success: true,
            parentId: data.parentId,
            children: data.children,
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});
router.get("/parent/children/:childId/v1", (0, authMiddleware_js_1.verifyUser)("parent"), async (req, res) => {
    try {
        const parentId = new mongoose_1.default.Types.ObjectId(req.user._id);
        const childId = new mongoose_1.default.Types.ObjectId(req.params.childId);
        const result = await user_js_1.default.aggregate([
            // 1️⃣ Match parent
            {
                $match: {
                    _id: parentId,
                    role: "parent",
                },
            },
            // 2️⃣ Lookup only that specific child
            {
                $lookup: {
                    from: "users",
                    let: { childrenIds: "$children" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: ["$_id", "$$childrenIds"] }, // ✅ child belongs to parent
                                        { $eq: ["$_id", childId] }, // ✅ specific child
                                    ],
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                email: 1,
                                avatarUrl: 1,
                                // 🔥 NEW (IMPORTANT)
                                devices: 1,
                                lastActiveDeviceId: 1,
                                lastLocation: 1,
                                lastLocationTime: 1,
                                createdAt: 1,
                            },
                        },
                    ],
                    as: "child",
                },
            },
            // 3️⃣ Convert array → object
            {
                $unwind: {
                    path: "$child",
                    preserveNullAndEmptyArrays: true,
                },
            },
            // 4️⃣ Final shape
            {
                $project: {
                    _id: 0,
                    parentId: "$_id",
                    child: "$child",
                },
            },
        ]);
        const data = result?.[0];
        // ❌ Child not found or not belongs to parent
        if (!data || !data.child) {
            return res.status(404).json({
                success: false,
                message: "Child not found",
            });
        }
        return res.status(200).json({
            success: true,
            parentId: data.parentId,
            child: data.child,
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
});
// get Single Child
//   Genrate FireBase Token  ------- end
// logout start
router.post("/logout", (0, authMiddleware_js_1.verifyUser)(), async (req, res) => {
    try {
        const userId = req.user._id;
        const { deviceId } = req.body;
        if (!deviceId) {
            return res.status(400).json({ message: "deviceId required" });
        }
        const user = await user_js_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const device = user.devices?.find((d) => d.deviceId === deviceId);
        if (!device) {
            return res.status(400).json({ message: "Device not found" });
        }
        // 🔥 LOGOUT STATE
        device.isOnline = false;
        device.isTracking = false;
        device.trackingStatus = "OFFLINE";
        device.lastSeen = new Date();
        await user.save();
        // ===================================
        // 🔥 SOCKET (REAL-TIME UPDATE)
        // ===================================
        if (user.role === "child" && user.parentId) {
            index_js_1.io.to(`parent:${user.parentId}`).emit("child-device-logout", {
                childId: user._id,
                deviceId,
                message: "Child device logged out"
            });
        }
        // ===================================
        // 🔥 PUSH NOTIFICATION (IMPORTANT)
        // ===================================
        if (user.role === "child" && user.parentId) {
            const parent = await user_js_1.default.findById(user.parentId).select("fcmTokens");
            const notifyParent = () => Promise.all([
                Notification_js_1.default.create({
                    userId: user.parentId,
                    title: "Device Logged Out ⚠️",
                    body: `${user.name}'s device has been logged out. Live tracking has stopped.`,
                    data: {
                        type: "DEVICE_LOGOUT",
                        childId: user._id.toString(),
                        deviceId
                    },
                }),
                (0, notificationService_js_1.sendPush)(parent?.fcmTokens || [], "Device Logged Out ⚠️", `${user.name}'s device has been logged out. Live tracking has stopped.`, {
                    type: "DEVICE_LOGOUT",
                    childId: user._id.toString(),
                    deviceId
                }),
            ]);
            await notifyParent();
        }
        return res.json({
            success: true,
            message: "Logged out successfully"
        });
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Logout failed" });
    }
});
//logout end
exports.default = router;
//   # combines all routes

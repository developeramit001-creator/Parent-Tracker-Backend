import { Router, Response } from 'express';
import authRoutes from './auth.routes.js';

import connection from './connection.routes.js'
import notification from './notification.routes.js'
import { verifyUser } from '../middlewares/authMiddleware.js';
import UserModal from '../models/user.js';
import trackingRoutes from "./tracking.routes.js";
import mongoose from "mongoose";
import addsafezone from './addsafezone.routes.js';
import Notification from '../models/Notification.js';
import { sendPush } from '../services/notificationService.js';
import { io } from '../index.js';

const router = Router();
router.use('/auth/v1', authRoutes);
router.use('/connection/v1', connection);
router.use('/notification/v1', notification);
router.use('/tracking/v1', trackingRoutes);
router.use('/safe-zone/v1', addsafezone);
//  Genrate FireBase Token  ----- start
// "api//tracking/v1/child/update-live",

router.post("/user/fcm-token", verifyUser(), async (req: any, res: Response) => {
    const { token } = req.body;
    console.log("📲 Saving token for user:", req.user._id);
    console.log("📲 Token:", token);
    await UserModal.updateOne(
        { _id: req.user._id },
        { $addToSet: { fcmTokens: token } }
    );

    res.json({ success: true });
});


// get children parent wise ---------------- start


/**
 * ✅ Get all children of logged-in parent (FAST + CLEAN)
 * -
 *  parent login required
 * - returns children list with basic profile fields
 */
router.get(
    "/parent/children/v1",
    verifyUser("parent"),
    async (req: any, res: Response) => {
        try {

            const parentId = new mongoose.Types.ObjectId(req.user._id);

            const result = await UserModal.aggregate([
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
            console.log(data, 'data Parent Child')
            return res.status(200).json({
                success: true,
                parentId: data.parentId,
                children: data.children,
            });


        } catch (error) {
            console.log(error);
            return res.status(500).json({ success: false, message: "Server error" });
        }
    }
);


router.get(
    "/parent/children/:childId/v1",
    verifyUser("parent"),
    async (req: any, res: Response) => {
        try {
            const parentId = new mongoose.Types.ObjectId(req.user._id);
            const childId = new mongoose.Types.ObjectId(req.params.childId);

            const result = await UserModal.aggregate([
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
        } catch (error) {
            console.log(error);
            return res.status(500).json({
                success: false,
                message: "Server error",
            });
        }
    }
);
// get Single Child



//   Genrate FireBase Token  ------- end


// logout start

router.post("/logout", verifyUser(), async (req: any, res) => {
    try {
        const userId = req.user._id;
        const { deviceId } = req.body;

        if (!deviceId) {
            return res.status(400).json({ message: "deviceId required" });
        }

        const user = await UserModal.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const device = user.devices?.find(
            (d: any) => d.deviceId === deviceId
        );

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
            io.to(`parent:${user.parentId}`).emit("child-device-logout", {
                childId: user._id,
                deviceId,
                message: "Child device logged out"
            });
        }

        // ===================================
        // 🔥 PUSH NOTIFICATION (IMPORTANT)
        // ===================================
        if (user.role === "child" && user.parentId) {

            const parent = await UserModal.findById(user.parentId).select("fcmTokens");


            const notifyParent = () =>
                Promise.all([
                    Notification.create({
                        userId: user.parentId,
                        title: "Device Logged Out ⚠️",
                        body: `${user.name}'s device has been logged out. Live tracking has stopped.`,
                        data: {
                            type: "DEVICE_LOGOUT",
                            childId: user._id.toString(),
                            deviceId
                        },
                    }),
                    sendPush(
                        parent?.fcmTokens || [],
                        "Device Logged Out ⚠️",
                        `${user.name}'s device has been logged out. Live tracking has stopped.`,
                        {
                            type: "DEVICE_LOGOUT",
                            childId: user._id.toString(),
                            deviceId
                        }
                    ),
                ]);

            await notifyParent();
        }

        return res.json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Logout failed" });
    }
});
//logout end


export default router;
//   # combines all routes

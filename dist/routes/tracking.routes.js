"use strict";
// # live tracking, history, daily summary
// Send child location to parent phone
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_1 = __importDefault(require("../models/user"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const childmoment_1 = require("../utils/childmoment");
const index_1 = require("../socket/index"); // 👈 yaha se io import
const notificationService_1 = require("../services/notificationService");
const Notification_1 = __importDefault(require("../models/Notification"));
const router = (0, express_1.Router)();
/**
 * ✅ Child -> update live location
 * POST /api/location/v1/update-live
 */
const lastApiHitMap = new Map();
// /tracking/v1
router.post("/child/update-live", (0, authMiddleware_1.verifyUser)("child"), async (req, res) => {
    try {
        //  -------------------------------
        console.log(req.body, "req.body ======================");
        const childId = req.user._id;
        const { lat, lng, speed, heading, batteryLevel, gpsEnabled, event, accuracy, deviceId, deviceName, deviceType, platform } = req.body;
        // console.log(lat, lng, speed, accuracy)
        // api call time check  ---- --- start
        const now = Date.now();
        const lastTime = lastApiHitMap.get(childId);
        if (lastTime) {
            const diff = now - lastTime;
            console.log(`⏱️ API GAP for ${childId}: ${diff / 1000} sec`);
        }
        else {
            console.log(`🆕 First API all for ${childId}`);
        }
        console.log(`🚀 API HIT AT: ${new Date(now).toLocaleTimeString()}`);
        // update
        lastApiHitMap.set(childId, now);
        console.log("helo");
        // api call time check  ---- --- end
        // ✅ Validate lat/lng
        if (typeof lat !== "number" || typeof lng !== "number") {
            return res.status(400).json({ message: "lat/lng required" });
        }
        // ✅ Fetch child basic tracking fields
        const child = await user_1.default.findById(childId).select("_id parentId coordinates speed lastLocationAt movementStatus isMoving batteryLevel heading name devices");
        console.log("child ", child);
        if (!child) {
            return res.status(404).json({ message: "Child not found" });
        }
        console.log(child.parentId);
        if (!child.parentId) {
            return res
                .status(400)
                .json({ message: "Child not connected to parent" });
        }
        const sendError = (type, message) => {
            index_1.io.to(`parent:${child.parentId}`).emit("child-error", {
                childId,
                deviceId,
                type, // 🔥 important
                message,
                time: new Date()
            });
        };
        if (!deviceId) {
            sendError("DEVICE_NOT_FOUND", "Device not registered");
            return res.status(400).json({ message: "Device not registered" });
        }
        // if (deviceId) {
        // device find
        const device = child?.devices?.find((d) => d.deviceId === deviceId);
        if (!device) {
            sendError("DEVICE_NOT_FOUND", "Device not registered");
            return res.status(400).json({ message: "Device not registered" });
        }
        // if (device) {
        device.isTracking = true;
        // }
        // 🔥 tracking control
        // child?.devices?.forEach((d: any) => {
        //     d.isTracking = d.deviceId === deviceId;
        // });
        // }
        const prev = {
            lat: device.coordinates?.lat,
            lng: device.coordinates?.lng,
            speed: device.speed || 0,
        };
        const next = { lat, lng, speed: speed || 0 };
        const movement = (0, childmoment_1.getMovementStatus)({ prev, next });
        /**
         * ✅ Update latest location (DB source of truth)
         * Parent ko current info DB se bhi mil sakti hai
         */
        device.coordinates = { lat, lng };
        device.speed = speed || 0;
        device.heading = heading || 0;
        device.batteryLevel = batteryLevel ?? device.batteryLevel ?? 0;
        device.gpsEnabled = gpsEnabled;
        device.isMoving = movement.isMoving;
        device.movementStatus = movement.movementStatus;
        device.lastLocationAt = new Date();
        device.gpsEvent = event;
        if (typeof req.body.internetEnabled === "boolean") {
            device.internetEnabled = req.body.internetEnabled;
        }
        let trackingStatus = "ACTIVE";
        // 🔥 1. FLIGHT MODE (HIGHEST PRIORITY)
        if (gpsEnabled === false && req.body.internetEnabled === false) {
            if (device.trackingStatus !== "FLIGHT_MODE") {
                sendError("FLIGHT_MODE", "Child device is in flight mode (GPS & Internet off)");
            }
            trackingStatus = "FLIGHT_MODE";
        }
        // 🔴 2. GPS OFF
        else if (gpsEnabled === false) {
            if (device.trackingStatus !== "GPS_OFF") {
                sendError("GPS_OFF", "Child GPS is turned off");
            }
            trackingStatus = "GPS_OFF";
        }
        // 🟠 3. NO INTERNET
        else if (req.body.internetEnabled === false) {
            if (device.trackingStatus !== "NO_INTERNET") {
                sendError("NO_INTERNET", "Child has no internet connection");
            }
            trackingStatus = "NO_INTERNET";
        }
        // 🟡 4. BATTERY LOW
        else if (batteryLevel !== undefined && batteryLevel <= 5) {
            if (device.trackingStatus !== "BATTERY_LOW") {
                sendError("BATTERY_LOW", "Battery is critically low");
            }
            trackingStatus = "BATTERY_LOW";
        }
        // 🟣 5. NO SIGNAL
        else if (accuracy && accuracy > 100) {
            if (device.trackingStatus !== "NO_SIGNAL") {
                sendError("NO_SIGNAL", "Low GPS accuracy / no signal");
            }
            trackingStatus = "NO_SIGNAL";
        }
        device.trackingStatus = trackingStatus;
        child.lastActiveDeviceId = deviceId;
        child.lastLocation = { lat, lng };
        child.lastLocationTime = new Date();
        // child.lastOnlineAt = new Date();
        await child.save();
        // console.log(child, "child Check child detial send to backend")
        /**
         * ✅ Emit to parent dashboard (real-time)
         * Room: parent:<parentId>
         */
        index_1.io.to(`parent:${child.parentId.toString()}`).emit("child-live-update", {
            childId: child._id.toString(),
            parentId: child.parentId.toString(),
            deviceId,
            deviceName: device.deviceName,
            deviceType: device.deviceType,
            platform: device.platform,
            gpsEnabled: device.gpsEnabled,
            coordinates: device.coordinates,
            speed: device.speed,
            heading: device.heading,
            batteryLevel: device.batteryLevel,
            isMoving: device.isMoving,
            movementStatus: device.movementStatus,
            lastLocationAt: device.lastLocationAt,
            gpsEvent: device.gpsEvent,
            trackingStatus: device.trackingStatus,
        });
        //  if Gps of send Push notifciton  and store store in notification modal
        // console.log(child, "child")
        if (event === "GPS_STATUS_CHANGE") {
            const parent = await user_1.default.findById(child.parentId).select("fcmTokens");
            if (gpsEnabled === false) {
                // // 🔔 notify parent function (same as yours)
                const notifyParent = () => Promise.all([
                    Notification_1.default.create({
                        userId: child.parentId,
                        title: "GPS Turned Off 🚨",
                        body: `${child.name}'s GPS has been turned off. Live location is currently unavailable. Please contact them to enable it.`,
                        data: {
                            type: "GPS_OFF",
                            childId: child._id.toString(),
                        },
                    }),
                    (0, notificationService_1.sendPush)(parent?.fcmTokens || [], "GPS Turned Off 🚨", `${child.name}'s GPS has been turned off. Live location is currently unavailable. Please contact them to enable it.`, {
                        type: "GPS_OFF",
                        childId: child._id.toString(),
                    }),
                ]);
                await notifyParent();
            }
            if (gpsEnabled == true) {
                const notifyParent = () => Promise.all([
                    Notification_1.default.create({
                        userId: child.parentId,
                        title: "Location Services Enabled ✅",
                        body: `${child.name} has turned on location services. Live tracking is now active.`,
                        data: {
                            type: "GPS_ON",
                            childId: child._id.toString(),
                        },
                    }),
                    (0, notificationService_1.sendPush)(parent?.fcmTokens || [], "Location Services Enabled ✅", `${child.name} has turned on location services. Live tracking is now active.`, {
                        type: "GPS_ON",
                        childId: child._id.toString(),
                    }),
                ]);
                await notifyParent();
            }
        }
        return res.status(200).json({
            success: true,
            message: "Live location updated",
        });
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Server error" });
    }
});
// await User.findById(childId)
// get Single Child Data
exports.default = router;

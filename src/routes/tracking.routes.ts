// # live tracking, history, daily summary
// Send child location to parent phone

import { Router, Response } from "express";
import { Server } from "socket.io";
import User from "../models/user";
import { verifyUser } from "../middlewares/authMiddleware";
import { getMovementStatus } from "../utils/childmoment";
import { io } from "../socket/index"; // 👈 yaha se io import
import { sendPush } from "../services/notificationService";
import Notification from "../models/Notification";

const router = Router();

/**
 * ✅ Child live location body type
 */
type UpdateLiveBody = {
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
    batteryLevel?: number;
    gpsEnabled?: boolean;
    event?: string
};


/**
 * ✅ Child -> update live location
 * POST /api/location/v1/update-live
 */

// /tracking/v1
router.post(
    "/child/update-live",
    verifyUser("child"),
    async (req: any, res: Response) => {

        try {
            // console.log(req.body, "req.body ======================")

            const childId = req.user._id as string;
            const { lat, lng, speed, heading, batteryLevel, gpsEnabled, event } =
                req.body as UpdateLiveBody;

            { console.log(event, "event") }



            // ✅ Validate lat/lng
            if (typeof lat !== "number" || typeof lng !== "number") {
                return res.status(400).json({ message: "lat/lng required" });
            }

            // ✅ Fetch child basic tracking fields
            const child = await User.findById(childId).select(
                "_id parentId coordinates speed lastLocationAt movementStatus isMoving batteryLevel heading name"
            );
            // console.log(child, "child")

            if (!child) {
                return res.status(404).json({ message: "Child not found" });
            }

            if (!child.parentId) {
                return res
                    .status(400)
                    .json({ message: "Child not connected to parent" });
            }







            const prev = {
                lat: child.coordinates?.lat,
                lng: child.coordinates?.lng,
                speed: child.speed || 0,
            };

            const next = { lat, lng, speed: speed || 0 };

            const movement = getMovementStatus({ prev, next });

            /**
             * ✅ Update latest location (DB source of truth)
             * Parent ko current info DB se bhi mil sakti hai
             */
            // console.log(gpsEnabled, "gpsEnable")
            child.coordinates = { lat, lng };
            child.speed = speed || 0;
            child.heading = heading || 0;
            child.batteryLevel = batteryLevel ?? child.batteryLevel ?? 0;
            child.gpsEnabled = gpsEnabled;
            child.isMoving = movement.isMoving;
            child.movementStatus = movement.movementStatus;
            child.lastLocationAt = new Date();
            child.gpsEvent = event
            await child.save();
            // console.log(child, "child Check child detial send to backend")
            /**
             * ✅ Emit to parent dashboard (real-time)
             * Room: parent:<parentId>
             */
            io.to(`parent:${child.parentId.toString()}`).emit("child-live-update", {
                childId: child._id.toString(),
                parentId: child.parentId.toString(),
                gpsEnabled: child.gpsEnabled,
                coordinates: child.coordinates,
                speed: child.speed,
                heading: child.heading,
                batteryLevel: child.batteryLevel,
                isMoving: child.isMoving,
                movementStatus: child.movementStatus,
                lastLocationAt: child.lastLocationAt,
                gpsEvent: child.gpsEvent

            });



            //  if Gps of send Push notifciton  and store store in notification modal

            // console.log(child, "child")


            if (event === "GPS_STATUS_CHANGE") {

                const parent = await User.findById(child.parentId).select("fcmTokens");

                if (gpsEnabled === false) {

                    // // 🔔 notify parent function (same as yours)
                    const notifyParent = () =>
                        Promise.all([
                            Notification.create({
                                userId: child.parentId,
                                title: "GPS Turned Off 🚨",
                                body: `${child.name}'s GPS has been turned off. Live location is currently unavailable. Please contact them to enable it.`,
                                data: {
                                    type: "GPS_OFF",
                                    childId: child._id.toString(),
                                },
                            }),
                            sendPush(
                                parent?.fcmTokens || [],
                                "GPS Turned Off 🚨",
                                `${child.name}'s GPS has been turned off. Live location is currently unavailable. Please contact them to enable it.`,
                                {
                                    type: "GPS_OFF",
                                    childId: child._id.toString(),
                                }
                            ),
                        ]);
                    await notifyParent();
                }

                if (gpsEnabled == true) {
                    const notifyParent = () =>
                        Promise.all([
                            Notification.create({
                                userId: child.parentId,
                                title: "Location Services Enabled ✅",
                                body: `${child.name} has turned on location services. Live tracking is now active.`,
                                data: {
                                    type: "GPS_ON",
                                    childId: child._id.toString(),
                                },
                            }),
                            sendPush(
                                parent?.fcmTokens || [],
                                "Location Services Enabled ✅",
                                `${child.name} has turned on location services. Live tracking is now active.`,
                                {
                                    type: "GPS_ON",
                                    childId: child._id.toString(),
                                }
                            ),
                        ]);
                    await notifyParent();

                }
            }






            return res.status(200).json({
                success: true,
                message: "Live location updated",
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: "Server error" });
        }
    }
);





export default router

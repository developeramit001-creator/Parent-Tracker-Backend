// # live tracking, history, daily summary
// Send child location to parent phone

import { Router, Response } from "express";
import { Server } from "socket.io";
import User from "../models/user";
import { verifyUser } from "../middlewares/authMiddleware";
import { getMovementStatus } from "../utils/childmoment";
import { io } from "../socket/index"; // 👈 yaha se io import

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
            console.log(req.body, "req.body ======================")

            const childId = req.user._id as string;
            const { lat, lng, speed, heading, batteryLevel } =
                req.body as UpdateLiveBody;





            // ✅ Validate lat/lng
            if (typeof lat !== "number" || typeof lng !== "number") {
                return res.status(400).json({ message: "lat/lng required" });
            }

            // ✅ Fetch child basic tracking fields
            const child = await User.findById(childId).select(
                "_id parentId coordinates speed lastLocationAt movementStatus isMoving batteryLevel heading"
            );

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
            child.coordinates = { lat, lng };
            child.speed = speed || 0;
            child.heading = heading || 0;
            child.batteryLevel = batteryLevel ?? child.batteryLevel ?? 0;

            child.isMoving = movement.isMoving;
            child.movementStatus = movement.movementStatus;
            child.lastLocationAt = new Date();

            await child.save();
            // console.log(child, "child Check child detial send to backend")
            /**
             * ✅ Emit to parent dashboard (real-time)
             * Room: parent:<parentId>
             */
            io.to(`parent:${child.parentId.toString()}`).emit("child-live-update", {
                childId: child._id.toString(),
                parentId: child.parentId.toString(),

                coordinates: child.coordinates,
                speed: child.speed,
                heading: child.heading,
                batteryLevel: child.batteryLevel,

                isMoving: child.isMoving,
                movementStatus: child.movementStatus,
                lastLocationAt: child.lastLocationAt,
            });

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

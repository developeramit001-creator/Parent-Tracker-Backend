// routes/safeZone.ts

import { Router } from "express";
import SafeZone from "../models/SafeZone";
import { verifyUser } from "../middlewares/authMiddleware";

const router = Router();

// POST /api/safe-zone/crweate
router.post("/create", verifyUser("parent"), async (req: any, res) => {
    try {

        const userId = req.user._id;
        console.log(req.body, 'req.body')
        const { name, lat, lng, radius } = req.body;

        if (!name || !lat || !lng || !radius) {

            return res.status(400).json({ message: "All fields required" });
        }

        const zone = await SafeZone.create({
            userId,
            name,
            center: { lat, lng },
            radius
        });

        return res.json({
            success: true,
            data: zone
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;

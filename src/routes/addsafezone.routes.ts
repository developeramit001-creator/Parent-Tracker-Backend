// routes/safeZone.ts

import { Router } from "express";
import SafeZone from "../models/SafeZone";
import { verifyUser } from "../middlewares/authMiddleware";
import { getChildColor } from '../utils/genratecolor'

const router = Router();

// POST /api/safe-zone/crweate
router.post("/create", verifyUser("parent"), async (req: any, res) => {
    try {

        const ParentId = req.user._id;
        console.log(req.body, 'req.body')
        const { name, lat, lng, radius, childId } = req.body;
        console.log(req.body.childId, "req.body")

        if (!name || !lat || !lng || !radius) {

            return res.status(400).json({ message: "All fields required" });
        }
        const zoneColor = getChildColor(childId); // child ka color      // 28-03-2026
        const zone = await SafeZone.create({
            childId,
            ParentId,
            name,
            Zonecolor: zoneColor,
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

// get All safe zone according to child
router.get("/get/:childId", verifyUser("parent"), async (req, res) => {
    const { childId } = req.params;
    console.log('safezone get all child')

    const zones = await SafeZone.find({ childId });

    res.json({ success: true, data: zones });
});

//  edit safe zone

router.put("/:id", verifyUser("parent"), async (req, res) => {
    const { id } = req.params;
    const { name, radius, color } = req.body;

    const updated = await SafeZone.findByIdAndUpdate(
        id,
        { name, radius, color },
        { new: true }
    );

    res.json({ success: true, data: updated });
});
export default router;

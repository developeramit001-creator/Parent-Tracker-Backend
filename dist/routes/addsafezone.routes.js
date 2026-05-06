"use strict";
// routes/safeZone.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SafeZone_1 = __importDefault(require("../models/SafeZone"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const genratecolor_1 = require("../utils/genratecolor");
const router = (0, express_1.Router)();
// POST /api/safe-zone/crweate
router.post("/create", (0, authMiddleware_1.verifyUser)("parent"), async (req, res) => {
    try {
        const ParentId = req.user._id;
        console.log(req.body, 'req.body');
        const { name, lat, lng, radius, childId } = req.body;
        console.log(req.body.childId, "req.body");
        if (!name || !lat || !lng || !radius) {
            return res.status(400).json({ message: "All fields required" });
        }
        const zoneColor = (0, genratecolor_1.getChildColor)(childId); // child ka color      // 28-03-2026
        const zone = await SafeZone_1.default.create({
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
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error" });
    }
});
// get All safe zone according to child
router.get("/get/:childId", (0, authMiddleware_1.verifyUser)("parent"), async (req, res) => {
    const { childId } = req.params;
    console.log('safezone get all child');
    const zones = await SafeZone_1.default.find({ childId });
    res.json({ success: true, data: zones });
});
//  edit safe zone
router.put("/:id", (0, authMiddleware_1.verifyUser)("parent"), async (req, res) => {
    const { id } = req.params;
    const { name, radius, lat, lng } = req.body;
    console.log(req.body, "req.body");
    const updated = await SafeZone_1.default.findByIdAndUpdate(id, { name, radius, center: { lat, lng } }, { new: true });
    res.json({ success: true, data: updated });
});
exports.default = router;

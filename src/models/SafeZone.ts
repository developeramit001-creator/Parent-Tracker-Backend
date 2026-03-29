// src/models/SafeZone.ts

import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISafeZone extends Document {
    ParentId: Types.ObjectId;
    childId: Types.ObjectId; // 👈 IMPORTANT
    name: string;
    center: {
        lat: number;
        lng: number;
    };
    radius: number; // meters
    Zonecolor: string; // 👈 NEW (for UI)
}

const SafeZoneSchema = new Schema<ISafeZone>(
    {
        ParentId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        childId: {
            type: Schema.Types.ObjectId,
            ref: "Child",
            required: true,
            index: true
        },
        Zonecolor: {
            type: String,
            default: "#2563EB"
        },


        name: { type: String, required: true },

        center: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true }
        },

        radius: { type: Number, required: true }
    },
    { timestamps: true }
);

export default mongoose.model<ISafeZone>("SafeZone", SafeZoneSchema);

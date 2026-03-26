// src/models/SafeZone.ts

import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISafeZone extends Document {
    userId: Types.ObjectId;

    name: string;

    center: {
        lat: number;
        lng: number;
    };

    radius: number; // meters
}

const SafeZoneSchema = new Schema<ISafeZone>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
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

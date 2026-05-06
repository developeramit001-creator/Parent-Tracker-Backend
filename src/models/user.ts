// src/models/User.ts
import mongoose, { Document, Schema, Types } from "mongoose";

export type UserRole = "parent" | "child";
export type MovementStatus = "STOPPED" | "MOVING" | "RUNNING";

export interface IUser extends Document {
  _id: string;

  name: string;
  email: string;
  role: UserRole;

  parentId?: Types.ObjectId;
  children?: Types.ObjectId[];

  // ================================
  // 🟢 CHILD SUMMARY (ONLY 2 THINGS)
  // ================================
  lastActiveDeviceId?: string;   // 🔥 konsa device active hai
  lastLocation?: {
    lat?: number;
    lng?: number;
  };
  lastLocationTime?: Date;

  // ================================
  // 📱 DEVICES (REAL DATA 🔥)
  // ================================
  devices?: {
    deviceId: string;
    deviceName?: string;
    deviceType?: string;
    platform?: string;
    // status
    isOnline?: boolean;
    isTracking?: boolean;

    // timestamps
    lastSeen?: Date;
    lastLocationAt?: Date;

    // location
    coordinates?: {
      lat?: number;
      lng?: number;
    };

    // movement
    speed?: number;
    heading?: number;
    movementStatus?: MovementStatus;
    isMoving?: boolean;
    // system
    gpsEnabled?: boolean;
    internetEnabled?: boolean;
    batteryLevel?: number;

    gpsEvent?: string;
    trackingStatus?: string
  }[];

  fcmTokens?: string[];
  isBlocked?: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ["parent", "child"], required: true },

    parentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    children: [{ type: Schema.Types.ObjectId, ref: "User" }],

    // ================================
    // 🟢 CHILD SUMMARY
    // ================================
    lastActiveDeviceId: { type: String },

    lastLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },

    // ================================
    // 📱 DEVICES
    // ================================
    devices: [
      {
        deviceId: { type: String },
        deviceName: { type: String },
        deviceType: { type: String },
        platform: { type: String },


        isOnline: { type: Boolean, default: true }, // update only login and logout
        isTracking: { type: Boolean, default: false },

        lastSeen: { type: Date, default: Date.now }, //update only logout and login
        lastLocationAt: { type: Date },

        coordinates: {
          lat: { type: Number },
          lng: { type: Number },
        },

        speed: { type: Number },
        heading: { type: Number },

        movementStatus: {
          type: String,
          enum: ["STOPPED", "MOVING", "RUNNING"],
        },

        gpsEnabled: { type: Boolean, default: false },
        internetEnabled: { type: Boolean, default: false },

        batteryLevel: { type: Number },

        gpsEvent: { type: String },
        trackingStatus: { type: String },
      },
    ],

    fcmTokens: { type: [String], default: [] },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);

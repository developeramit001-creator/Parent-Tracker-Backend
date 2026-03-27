// src/models/User.ts
import mongoose, { Document, Schema, Types } from "mongoose";

export type UserRole = "parent" | "child";
export type MovementStatus = "STOPPED" | "MOVING" | "RUNNING";

/**
 * ✅ User document interface
 */
export interface IUser extends Document {
  _id: string;

  name: string;
  email: string;
  phone?: string;

  role: UserRole;

  avatarUrl?: string;
  gender?: string;

  // ✅ Parent-only
  inviteCode?: string;
  children?: Types.ObjectId[];

  // ✅ Child-only
  parentId?: Types.ObjectId;

  // ✅ Live tracking fields
  coordinates?: {
    lat?: number;
    lng?: number;
  };

  speed?: number; // meters/second
  heading?: number; // degrees
  batteryLevel?: number; // 0-100
  isMoving?: boolean;
  movementStatus?: MovementStatus;
  lastLocationAt?: Date;

  // ✅ Notifications
  fcmTokens?: string[];

  // ✅ Admin
  isBlocked?: boolean;
  gpsEnabled?: boolean;
  gpsEvent?: string;
}

const UserSchema = new Schema<IUser>(
  {
    // ✅ Basic info
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true },
    phone: { type: String },

    role: {
      type: String,
      enum: ["parent", "child"],
      required: true,
    },

    gender: { type: String },
    avatarUrl: { type: String },

    // ✅ Parent fields
    inviteCode: {
      type: String,
      unique: true,
      sparse: true, // allow null/undefined
    },

    children: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ✅ Child fields
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // ✅ Live tracking fields (child)
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },

    speed: { type: Number, }, // m/s
    heading: { type: Number, }, // degrees
    batteryLevel: { type: Number, }, // 0-100

    isMoving: { type: Boolean },

    movementStatus: {
      type: String,
      enum: ["STOPPED", "MOVING", "RUNNING"],

    },
    gpsEnabled: { type: Boolean },
    lastLocationAt: { type: Date },

    // ✅ Block + FCM
    isBlocked: { type: Boolean, default: false },

    fcmTokens: { type: [String], default: [] },
    gpsEvent: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);

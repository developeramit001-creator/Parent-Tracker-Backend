"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/User.ts
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ["parent", "child"], required: true },
    parentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        index: true,
    },
    children: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
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
}, { timestamps: true });
exports.default = mongoose_1.default.model("User", UserSchema);

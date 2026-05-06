"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.distanceMeters = distanceMeters;
exports.getMovementStatus = getMovementStatus;
function toRad(v) {
    return (v * Math.PI) / 180;
}
/**
 * ✅ Haversine formula
 * Returns distance in meters between 2 coordinates
 */
function distanceMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000; // earth radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}
/**
 * ✅ movementStatus rules:
 * - RUNNING if speed > 1.5 m/s
 * - MOVING if moved >= 12m OR speed > 0.3
 * - STOPPED otherwise
 */
function getMovementStatus({ prev, next, lastStatus, // 👈 ADD THIS
 }) {
    let moved = 0;
    if (typeof prev?.lat === "number" &&
        typeof prev?.lng === "number" &&
        typeof next?.lat === "number" &&
        typeof next?.lng === "number") {
        moved = distanceMeters(prev.lat, prev.lng, next.lat, next.lng);
    }
    const speed = Number(next?.speed || 0);
    // ✅ RUNNING
    if (speed > 1.5) {
        return { movementStatus: "RUNNING", isMoving: true, moved };
    }
    // ✅ MOVING (more strict)
    if (moved >= 20 || speed > 0.5) {
        return { movementStatus: "MOVING", isMoving: true, moved };
    }
    // ✅ STOPPING smoothing (IMPORTANT)
    if (lastStatus === "MOVING" && moved < 5 && speed < 0.2) {
        // 👈 sudden stop ignore karo
        return { movementStatus: "MOVING", isMoving: true, moved };
    }
    return { movementStatus: "STOPPED", isMoving: false, moved };
}

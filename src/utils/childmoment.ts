export type MovementStatus = "STOPPED" | "MOVING" | "RUNNING";

type LatLngPoint = {
    lat?: number;
    lng?: number;
    speed?: number; // meters/second
};

function toRad(v: number) {
    return (v * Math.PI) / 180;
}

/**
 * ✅ Haversine formula
 * Returns distance in meters between 2 coordinates
 */
export function distanceMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
) {
    const R = 6371000; // earth radius in meters

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) ** 2 +
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
export function getMovementStatus({
    prev,
    next,
    lastStatus, // 👈 ADD THIS
}: {
    prev?: LatLngPoint;
    next?: LatLngPoint;
    lastStatus?: MovementStatus;
}): { movementStatus: MovementStatus; isMoving: boolean; moved: number } {

    let moved = 0;

    if (
        typeof prev?.lat === "number" &&
        typeof prev?.lng === "number" &&
        typeof next?.lat === "number" &&
        typeof next?.lng === "number"
    ) {
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

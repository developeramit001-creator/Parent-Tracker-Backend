"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChildColor = getChildColor;
exports.getZoneShade = getZoneShade;
function getChildColor(childId) {
    let hash = 0;
    for (let i = 0; i < childId?.length; i++) {
        hash = childId?.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
}
function getZoneShade(baseColor, index) {
    const lightness = 40 + index * 10; // 40%, 50%, 60%
    return baseColor.replace(/(\d+)%\)$/, `${lightness}%)`);
}

/**
 * GPS Coordinate Validation Utilities
 * Prevents invalid GPS data from causing location jumping issues
 */

export interface GPSPoint {
    lat: number;
    lon: number;
    time?: Date;
}

/**
 * Check if GPS coordinates are valid
 * Rejects Null Island (0,0) and out-of-range values
 */
export function isValidGPSCoordinate(lat: number, lon: number): boolean {
    // Check for Null Island (0,0) - common GPS error when no fix
    if (lat === 0 && lon === 0) return false;

    // Check for null/undefined
    if (lat === null || lat === undefined || lon === null || lon === undefined) return false;

    // Check valid latitude range
    if (lat < -90 || lat > 90) return false;

    // Check valid longitude range
    if (lon < -180 || lon > 180) return false;

    return true;
}

/**
 * Check if jump between GPS points is reasonable
 * Rejects extreme jumps that indicate GPS corruption or teleportation
 */
export function isReasonableJump(
    lastPoint: GPSPoint,
    newPoint: GPSPoint,
    maxSpeedKmh: number = 200 // Max reasonable vehicle speed
): boolean {
    // If no previous point or no timestamps, can't validate
    if (!lastPoint || !newPoint.time || !lastPoint.time) return true;

    // Import haversine distance calculation
    const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const distance = haversineDistance(
        lastPoint.lat,
        lastPoint.lon,
        newPoint.lat,
        newPoint.lon
    );

    // Calculate time difference in hours
    const timeDiffHours = (newPoint.time.getTime() - lastPoint.time.getTime()) / (1000 * 60 * 60);

    // If time is zero or negative, can't calculate speed
    if (timeDiffHours <= 0) return true;

    // Calculate implied speed
    const impliedSpeed = distance / timeDiffHours;

    // Reject if speed exceeds maximum reasonable speed
    return impliedSpeed <= maxSpeedKmh;
}

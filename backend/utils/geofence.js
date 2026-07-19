/**
 * Haversine formula — calculates distance between two GPS coordinates in meters.
 * @param {number} lat1  - Latitude of point 1
 * @param {number} lon1  - Longitude of point 1
 * @param {number} lat2  - Latitude of point 2
 * @param {number} lon2  - Longitude of point 2
 * @returns {number}     - Distance in meters
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // meters
};

/**
 * Checks if the user's GPS is inside the authorized geofence.
 * @param {number} userLat        - User's latitude
 * @param {number} userLon        - User's longitude
 * @param {number} locationLat    - Authorized location latitude
 * @param {number} locationLon    - Authorized location longitude
 * @param {number} allowedRadius  - Allowed radius in meters
 * @returns {{ isInside: boolean, distance: number }}
 */
const checkGeofence = (userLat, userLon, locationLat, locationLon, allowedRadius) => {
  const distance = haversineDistance(userLat, userLon, locationLat, locationLon);
  return {
    isInside: distance <= allowedRadius,
    distance: Math.round(distance), // meters, rounded
  };
};

module.exports = { haversineDistance, checkGeofence };

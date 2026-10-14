import test from 'node:test';
import assert from 'node:assert/strict';

// Import formatters
import {
  formatUserForClient,
  formatLocationForClient,
  formatAttendanceForClient,
} from '../src/lib/supabase/types.ts';

test('Unit Tests: Schema & Business Rule Verification', async (t) => {
  // Test 1: formatUserForClient preserves Mongo legacy _id and camelCase fields
  await t.test('1. formatUserForClient compatibility mapping', () => {
    const rawProfile = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'user',
      department: 'IT',
      employee_id: 'EMP001',
      phone: '9876543210',
      is_active: true,
      profile_image: '',
      last_login: null,
      legacy_mongo_id: '507f1f77bcf86cd799439011',
      created_at: '2026-10-14T10:00:00Z',
      updated_at: '2026-10-14T10:00:00Z',
    };

    const formatted = formatUserForClient(rawProfile);
    assert.equal(formatted._id, rawProfile.id, 'Must map id to _id for Flutter UserModel');
    assert.equal(formatted.id, rawProfile.id);
    assert.equal(formatted.employeeId, 'EMP001', 'Must map employee_id to employeeId');
    assert.equal(formatted.isActive, true, 'Must map is_active to isActive');
    assert.equal(formatted.department, 'IT');
  });

  // Test 2: formatLocationForClient preserves locationName and radius
  await t.test('2. formatLocationForClient compatibility mapping', () => {
    const rawLocation = {
      id: 'l1b2c3d4-e5f6-7890-abcd-ef1234567890',
      location_name: 'Ahmedabad Office',
      latitude: 23.0805,
      longitude: 72.5186,
      radius: 150,
      description: 'Corporate HQ',
      is_active: true,
      created_by: null,
      legacy_mongo_id: '507f1f77bcf86cd799439022',
      created_at: '2026-10-14T10:00:00Z',
      updated_at: '2026-10-14T10:00:00Z',
      profiles: { name: 'Admin', email: 'admin@company.com' },
    };

    const formatted = formatLocationForClient(rawLocation);
    assert.equal(formatted._id, rawLocation.id, 'Must map id to _id for Flutter LocationModel');
    assert.equal(formatted.locationName, 'Ahmedabad Office', 'Must map location_name to locationName');
    assert.equal(formatted.latitude, 23.0805);
    assert.equal(formatted.longitude, 72.5186);
    assert.equal(formatted.radius, 150);
    assert.equal(formatted.isActive, true);
    assert.deepEqual(formatted.createdBy, { name: 'Admin', email: 'admin@company.com' });
  });

  // Test 3: formatAttendanceForClient preserves nested locationId object
  await t.test('3. formatAttendanceForClient nested locationId for Flutter', () => {
    const rawAttendance = {
      id: 'att-1234-5678',
      user_id: 'usr-1234',
      location_id: 'loc-1234',
      date: '2026-10-14',
      check_in_time: '2026-10-14T09:15:00Z',
      check_out_time: '2026-10-14T17:30:00Z',
      check_in_latitude: 23.0805,
      check_in_longitude: 72.5186,
      check_out_latitude: 23.0805,
      check_out_longitude: 72.5186,
      distance_at_check_in: 45,
      status: 'present',
      working_hours: 8.25,
      notes: '',
      legacy_mongo_id: null,
      created_at: '2026-10-14T09:15:00Z',
      updated_at: '2026-10-14T17:30:00Z',
    };

    const locationDetails = {
      location_name: 'Ahmedabad Office',
      latitude: 23.0805,
      longitude: 72.5186,
      radius: 150,
    };

    const userDetails = {
      name: 'John Employee',
      email: 'john@example.com',
      department: 'Tech',
      employee_id: 'EMP999',
    };

    const formatted = formatAttendanceForClient(rawAttendance, locationDetails, userDetails);
    assert.equal(formatted._id, 'att-1234-5678');
    assert.equal(formatted.locationId.locationName, 'Ahmedabad Office', 'Flutter expects locationId.locationName');
    assert.equal(formatted.userId.name, 'John Employee');
    assert.equal(formatted.workingHours, 8.25);
    assert.equal(formatted.distanceAtCheckIn, 45);
    assert.equal(formatted.status, 'present');
  });

  // Test 4: Pure Haversine formula calculation in JS matching Postgres calculate_distance
  await t.test('4. Haversine distance formula verification', () => {
    function haversine(lat1, lon1, lat2, lon2) {
      const R = 6371000;
      const toRad = deg => (deg * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c);
    }

    // Coordinates: Ahmedabad Ognaj Office (23.0805, 72.5186)
    // Same point -> 0m
    assert.equal(haversine(23.0805, 72.5186, 23.0805, 72.5186), 0);

    // 100 meters away approx
    const dist1 = haversine(23.0805, 72.5186, 23.0810, 72.5190);
    assert.ok(dist1 > 0 && dist1 < 200, `Expected distance ~70m, got ${dist1}m`);

    // Far away: Mumbai (~440km)
    const distMumbai = haversine(23.0805, 72.5186, 19.0760, 72.8777);
    assert.ok(distMumbai > 400000 && distMumbai < 500000, `Expected ~440km, got ${distMumbai}m`);
  });

  // Test 5: Late arrival rule verification (09:30 threshold in Asia/Kolkata)
  await t.test('5. Business rule: 09:30 late arrival evaluation', () => {
    function isLate(hours, minutes) {
      return hours > 9 || (hours === 9 && minutes > 30);
    }

    assert.equal(isLate(9, 15), false, '09:15 is on time');
    assert.equal(isLate(9, 30), false, '09:30 is on time');
    assert.equal(isLate(9, 31), true, '09:31 is late');
    assert.equal(isLate(10, 0), true, '10:00 is late');
    assert.equal(isLate(8, 45), false, '08:45 is on time');
  });

  // Test 6: Half-day rule verification (< 4.0 hours)
  await t.test('6. Business rule: Half-day calculation (< 4.0 hours)', () => {
    function calculateStatus(hoursWorked, originalStatus) {
      if (hoursWorked < 4.0) return 'half-day';
      return originalStatus;
    }

    assert.equal(calculateStatus(3.5, 'present'), 'half-day');
    assert.equal(calculateStatus(3.99, 'late'), 'half-day');
    assert.equal(calculateStatus(4.0, 'present'), 'present');
    assert.equal(calculateStatus(8.5, 'late'), 'late');
  });
});

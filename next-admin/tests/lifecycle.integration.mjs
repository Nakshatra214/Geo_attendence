import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'http://localhost:3000';
const SUPABASE_URL = 'https://aqlyeavxlxhwhcmfcyem.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbHllYXZ4bHhod2hjbWZjeWVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTk3MDY2NSwiZXhwIjoyMTA3NTQ2NjY1fQ.HpKih8Np41HXfsaU66crPYCce15d_cnKYFYpqtQj984';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function req(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, headers: res.headers, body: json };
}

test('End-to-End Employee Lifecycle & Business Rule Verification', async (t) => {
  const testEmail = `test_lifecycle_${Date.now()}@gmail.com`;
  const testPassword = 'LifecycleTest123!';
  let userToken = null;
  let userId = null;
  let locationId = null;

  const legacyMongoId = '657f' + Date.now().toString(16).padStart(12, '0') + 'abcdef12';
  assert.equal(legacyMongoId.length, 24, 'legacyMongoId must be 24 hex characters');

  // Setup: Create a temporary test office location
  const { data: testLoc, error: locErr } = await supabaseAdmin
    .from('locations')
    .insert({
      location_name: `Test Geofence Office ${Date.now()}`,
      latitude: 23.0805,
      longitude: 72.5186,
      radius: 200,
      description: 'Temporary Test Location',
      is_active: true,
      legacy_mongo_id: legacyMongoId,
    })
    .select()
    .single();

  assert.ok(!locErr, `Failed to setup test location: ${locErr?.message}`);
  locationId = testLoc.id;

  try {
    // 1. Employee Registration
    await t.test('1. Employee registers via POST /api/auth/register', async () => {
      const res = await req('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Lifecycle Tester',
          email: testEmail,
          password: testPassword,
          department: 'Quality Assurance',
          employeeId: 'QA001',
          phone: '9988776655',
        }),
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token, 'Must return JWT token');
      assert.equal(res.body.data.user.role, 'user', 'Must have default role user');
      assert.equal(res.body.data.user._id, res.body.data.user.id, 'Must include _id for Flutter');

      userToken = res.body.data.token;
      userId = res.body.data.user.id;
    });

    // 2. Profile Verification
    await t.test('2. Employee fetches own profile via GET /api/auth/me', async () => {
      const res = await req('/api/auth/me', {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.user.email, testEmail);
      assert.equal(res.body.data.user.department, 'Quality Assurance');
    });

    // 3. RBAC: Employee blocked from Admin endpoints
    await t.test('3. Employee token rejected from admin routes with 403', async () => {
      const resUsers = await req('/api/admin/users', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert.equal(resUsers.status, 403);
      assert.equal(resUsers.body.message, 'Admin access required.');

      const resCreateLoc = await req('/api/admin/location/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
          locationName: 'Unauthorized Office',
          latitude: 23.0,
          longitude: 72.0,
        }),
      });
      assert.equal(resCreateLoc.status, 403);

      const resAnalytics = await req('/api/admin/analytics', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert.equal(resAnalytics.status, 403);
    });

    // 4. Locations listing: Employee can view active locations
    await t.test('4. Employee can view active locations via GET /api/admin/locations', async () => {
      const res = await req('/api/admin/locations', {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const found = res.body.data.locations.find((l) => l.id === locationId);
      assert.ok(found, 'Employee must be able to list active locations');
      assert.equal(found._id, found.id, 'Must format location with _id for Flutter');
    });

    // 5. Geofence rejection: Attempt check-in outside radius
    await t.test('5. Check-in outside geofence boundary is rejected with 403', async () => {
      // Office is at (23.0805, 72.5186). Send coordinates ~50km away (23.50, 72.50)
      const res = await req('/api/attendance/checkin', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
          latitude: 23.50,
          longitude: 72.50,
          locationId: locationId,
        }),
      });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.ok(
        res.body.message.includes('Must be within 200m'),
        `Expected geofence rejection message, got: ${res.body.message}`
      );
    });

    // 6. Legacy Mongo ID resolution: check-in using 24-char hex legacy_mongo_id
    await t.test('6. Check-in successfully resolves legacy Mongo location ID and approves within radius', async () => {
      // Send legacy Mongo ID '657f1234567890abcdef1234' and coordinates right at the office
      const res = await req('/api/attendance/checkin', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
          latitude: 23.0805,
          longitude: 72.5186,
          locationId: legacyMongoId,
        }),
      });

      assert.equal(res.status, 201, `Check-in failed: ${JSON.stringify(res.body)}`);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.attendance._id);
      assert.equal(res.body.data.attendance.locationId.locationName, testLoc.location_name);
      assert.equal(res.body.data.attendance.distanceAtCheckIn, 0);
    });

    // 7. Duplicate daily check-in rejection
    await t.test('7. 2nd check-in on same day rejected with 409 Conflict', async () => {
      const res = await req('/api/attendance/checkin', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
          latitude: 23.0805,
          longitude: 72.5186,
          locationId: locationId,
        }),
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.message, 'Attendance already marked for today.');
    });

    // 8. Today status
    await t.test('8. GET /api/attendance/today returns active check-in record', async () => {
      const res = await req('/api/attendance/today', {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.attendance);
      assert.ok(res.body.data.attendance.checkInTime);
      assert.equal(res.body.data.attendance.checkOutTime, null);
    });

    // 9. Check-Out
    await t.test('9. POST /api/attendance/checkout marks checkout and half-day for < 4.0h', async () => {
      const res = await req('/api/attendance/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
          latitude: 23.0805,
          longitude: 72.5186,
        }),
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.attendance.checkOutTime);
      assert.equal(res.body.data.attendance.status, 'half-day', 'Should be half-day because worked < 4.0h');
    });

    // 10. Duplicate check-out rejection
    await t.test('10. 2nd checkout attempt rejected with 409 Conflict', async () => {
      const res = await req('/api/attendance/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.message, 'Already checked out for today.');
    });

    // 11. History endpoint
    await t.test('11. GET /api/attendance/history/:userId returns logs and summary', async () => {
      const res = await req(`/api/attendance/history/${userId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.records.length, 1);
      assert.equal(res.body.data.summary.totalDays, 1);
      assert.ok(res.body.data.summary.attendancePercentage);
    });

    // 12. Deactivated user blocked from check-in
    await t.test('12. Deactivated user blocked with 403', async () => {
      // Deactivate user in profiles
      const { data: deactData, error: deactErr } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: false })
        .eq('id', userId)
        .select();

      assert.ok(!deactErr, `Deactivate failed: ${deactErr?.message}`);
      assert.equal(deactData[0].is_active, false);

      const res = await req('/api/attendance/today', {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      assert.equal(res.status, 403, `Expected 403, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.ok(res.body.message.includes('Account is deactivated'));
    });
  } finally {
    // Teardown: Clean up test user & location
    if (userId) {
      await supabaseAdmin.from('attendances').delete().eq('user_id', userId);
      await supabaseAdmin.from('profiles').delete().eq('id', userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
    if (locationId) {
      await supabaseAdmin.from('locations').delete().eq('id', locationId);
    }
  }
});

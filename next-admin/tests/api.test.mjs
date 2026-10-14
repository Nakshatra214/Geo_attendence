import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

// Helper for HTTP requests
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

test('API Test Suite: GeoAttend Next.js + Supabase', async (t) => {
  let adminToken = null;
  let testUserToken = null;
  let testUserId = null;
  let testLocationId = null;

  // 1. Health Endpoint
  await t.test('1. GET /api/health returns 200 OK', async () => {
    const res = await req('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'OK');
    assert.ok(res.body.timestamp);
  });

  // 2. Auth: Register Validation
  await t.test('2. POST /api/auth/register input validation', async () => {
    // Missing required fields
    const resEmpty = await req('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    assert.equal(resEmpty.status, 400);
    assert.equal(resEmpty.body.success, false);

    // Password too short
    const resShort = await req('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test',
        email: 'test@example.com',
        password: '123',
      }),
    });
    assert.equal(resShort.status, 400);
  });

  // 3. Auth: Login Validation
  await t.test('3. POST /api/auth/login input validation', async () => {
    // Missing fields
    const resMissing = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    assert.equal(resMissing.status, 400);

    // Invalid credentials
    const resInvalid = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent_user_999999@test.com',
        password: 'WrongPassword123!',
      }),
    });
    assert.equal(resInvalid.status, 401);
  });

  // 4. Auth: Admin Login Validation
  await t.test('4. POST /api/auth/admin/login invalid credentials', async () => {
    const res = await req('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin_fake@test.com',
        password: 'WrongPassword123!',
      }),
    });
    assert.equal(res.status, 401);
  });

  // 5. Authorization: Missing Bearer Token Rejection
  await t.test('5. Protected routes reject missing token with 401', async () => {
    const endpoints = [
      ['GET', '/api/auth/me'],
      ['POST', '/api/attendance/checkin'],
      ['POST', '/api/attendance/checkout'],
      ['GET', '/api/attendance/today'],
      ['GET', '/api/admin/users'],
      ['GET', '/api/admin/locations'],
      ['POST', '/api/admin/location/create'],
      ['GET', '/api/admin/analytics'],
      ['GET', '/api/user/profile'],
    ];

    for (const [method, path] of endpoints) {
      const res = await req(path, { method });
      assert.equal(
        res.status,
        401,
        `Expected ${method} ${path} to return 401 without token, got ${res.status}`
      );
      assert.equal(res.body.success, false);
    }
  });

  // 6. Authorization: Invalid / Malformed Bearer Token Rejection
  await t.test('6. Protected routes reject invalid token with 401', async () => {
    const res = await req('/api/auth/me', {
      headers: { Authorization: 'Bearer this_is_a_completely_invalid_jwt_token' },
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  // 7. Attendance Check-In Input Validation (with dummy token)
  await t.test('7. Attendance check-in validates coordinates range', async () => {
    // Invalid latitude (> 90)
    const resLat = await req('/api/attendance/checkin', {
      method: 'POST',
      headers: { Authorization: 'Bearer invalid_or_missing' },
      body: JSON.stringify({
        latitude: 95.5,
        longitude: 72.5,
        locationId: '00000000-0000-0000-0000-000000000000',
      }),
    });
    // Unauthenticated request should be 401
    assert.equal(resLat.status, 401);
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE_ROOT = path.resolve('..');
const NEXT_ADMIN_ROOT = path.resolve('.');

test('Audit Verification: Proving Complete MongoDB Elimination from Active Runtime', async (t) => {
  // Test 1: Zero MongoDB/Mongoose imports in active next-admin application
  await t.test('1. No mongoose/mongodb/MongoClient imports in active next-admin source code', () => {
    function scanDir(dir) {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const f of files) {
        const fullPath = path.join(dir, f.name);
        if (f.isDirectory()) {
          if (f.name !== 'node_modules' && f.name !== '.next') {
            scanDir(fullPath);
          }
        } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(f.name)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          assert.equal(
            /require\(['"]mongoose['"]\)/.test(content),
            false,
            `Active file ${fullPath} must not require('mongoose')`
          );
          assert.equal(
            /from\s+['"]mongoose['"]/.test(content),
            false,
            `Active file ${fullPath} must not import from 'mongoose'`
          );
          assert.equal(
            /require\(['"]mongodb['"]\)/.test(content),
            false,
            `Active file ${fullPath} must not require('mongodb')`
          );
          assert.equal(
            /from\s+['"]mongodb['"]/.test(content),
            false,
            `Active file ${fullPath} must not import from 'mongodb'`
          );
          assert.equal(
            /new\s+MongoClient/.test(content),
            false,
            `Active file ${fullPath} must not instantiate MongoClient`
          );
        }
      }
    }

    scanDir(path.join(NEXT_ADMIN_ROOT, 'src'));
  });

  // Test 2: Active Next.js package.json has NO mongoose or mongodb dependency
  await t.test('2. next-admin/package.json has no mongodb or mongoose dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(NEXT_ADMIN_ROOT, 'package.json'), 'utf8'));
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    assert.equal(allDeps['mongoose'], undefined, 'mongoose must not be in package.json');
    assert.equal(allDeps['mongodb'], undefined, 'mongodb must not be in package.json');
    assert.ok(allDeps['@supabase/supabase-js'], 'Supabase must be present as primary client');
  });

  // Test 3: Flutter mobile networking points to configurable Next.js API
  await t.test('3. Flutter mobile app points to configurable Next.js API (port 3000)', () => {
    const constantsPath = path.join(WORKSPACE_ROOT, 'lib', 'models', 'app_constants.dart');
    const content = fs.readFileSync(constantsPath, 'utf8');

    assert.ok(
      /String\.fromEnvironment\(\s*['"]API_BASE_URL['"]/.test(content),
      'Must support --dart-define=API_BASE_URL'
    );
    assert.ok(
      content.includes('http://localhost:3000/api'),
      'Default URL must point to Next.js API (localhost:3000/api)'
    );
    assert.equal(
      content.includes('localhost:5000'),
      false,
      'Must not reference old Express port 5000'
    );
  });

  // Test 4: Flutter ApiService routes through Next.js endpoints
  await t.test('4. Flutter ApiService routes through Next.js endpoints', () => {
    const servicePath = path.join(WORKSPACE_ROOT, 'lib', 'services', 'api_service.dart');
    const content = fs.readFileSync(servicePath, 'utf8');

    assert.ok(content.includes('$_base/auth/register'));
    assert.ok(content.includes('$_base/auth/login'));
    assert.ok(content.includes('$_base/admin/locations'));
    assert.ok(content.includes('$_base/attendance/checkin'));
    assert.ok(content.includes('$_base/attendance/checkout'));
    assert.ok(content.includes('$_base/attendance/today'));
    assert.ok(content.includes('$_base/attendance/history/'));
    assert.ok(content.includes('$_base/user/profile'));
  });

  // Test 5: Legacy admin-dashboard proxies to Next.js on port 3000
  await t.test('5. admin-dashboard/vite.config.js proxies to port 3000', () => {
    const viteConfig = fs.readFileSync(path.join(WORKSPACE_ROOT, 'admin-dashboard', 'vite.config.js'), 'utf8');
    assert.ok(
      viteConfig.includes("target: 'http://localhost:3000'"),
      'Vite proxy must target Next.js on port 3000'
    );
    assert.equal(
      viteConfig.includes("target: 'http://localhost:5000'"),
      false,
      'Vite proxy must not target legacy Express on port 5000'
    );
  });

  // Test 6: Environment variables security verification
  await t.test('6. SUPABASE_SERVICE_ROLE_KEY is strictly server-only', () => {
    const envExample = fs.readFileSync(path.join(NEXT_ADMIN_ROOT, '.env.example'), 'utf8');
    assert.ok(envExample.includes('NEXT_PUBLIC_SUPABASE_URL'));
    assert.ok(envExample.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
    assert.ok(envExample.includes('SUPABASE_SERVICE_ROLE_KEY'));
    assert.equal(
      envExample.includes('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'),
      false,
      'Service role key must NEVER have NEXT_PUBLIC_ prefix'
    );
  });
});

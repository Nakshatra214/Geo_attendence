import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(projectRoot, '..');
const flutterWebDist = path.join(repoRoot, 'build', 'web');
const publicEmployeeDir = path.join(projectRoot, 'public', 'employee');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('[sync-flutter] Checking Flutter Web release assets...');

const employeeIndex = path.join(publicEmployeeDir, 'index.html');
const flutterDistIndex = path.join(flutterWebDist, 'index.html');

if (fs.existsSync(flutterDistIndex)) {
  const distStat = fs.statSync(flutterDistIndex);
  let shouldCopy = false;

  if (!fs.existsSync(employeeIndex)) {
    shouldCopy = true;
  } else {
    const publicStat = fs.statSync(employeeIndex);
    if (distStat.mtimeMs > publicStat.mtimeMs) {
      shouldCopy = true;
    }
  }

  if (shouldCopy) {
    console.log(`[sync-flutter] Syncing newer build from ${flutterWebDist} to ${publicEmployeeDir}...`);
    copyDirRecursive(flutterWebDist, publicEmployeeDir);
    console.log('[sync-flutter] Sync completed successfully.');
  } else {
    console.log('[sync-flutter] public/employee is already up to date with build/web.');
  }
} else if (fs.existsSync(employeeIndex)) {
  console.log('[sync-flutter] Using committed Flutter Web release bundle in public/employee.');
} else {
  console.warn('[sync-flutter] Warning: No Flutter Web build found in public/employee or ../build/web.');
}

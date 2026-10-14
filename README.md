# GeoAttend (AttendX) — Geofence Attendance Management System

This repository contains the complete GeoAttend (AttendX) attendance tracking ecosystem migrated to **Supabase Auth + PostgreSQL** and **Next.js 14**.

## Repository Structure

```
f:/Geo_attendence/
├── next-admin/            # ⭐ Current Target: Next.js 14 App Router Admin Dashboard & Supabase API Backend
│   ├── src/app/api/       # REST API Route Handlers replacing legacy Express backend
│   ├── src/app/           # Modern Dark-Mode Admin Dashboard UI (Dashboard, Locations, Users, Reports)
│   ├── tests/             # Automated test suite (unit, API, and end-to-end lifecycle)
│   └── README.md          # Setup, testing, and Vercel deployment instructions
│
├── lib/                   # Flutter Mobile Application (iOS & Android)
│   └── models/            # App constants with configurable API_BASE_URL
│
├── admin-dashboard/       # Legacy React + Vite Admin Dashboard (Preserved)
├── backend/               # Legacy Node.js + Express + MongoDB Backend (Preserved)
├── geoattend_schema.sql   # Supabase PostgreSQL schema, RLS, Haversine, and RPC definitions
├── geoattend_tests.sql    # Supabase PostgreSQL test queries
└── MIGRATION_AUDIT.md     # Architecture audit and migration blueprint
```

## Quick Start

### 1. Run Next.js Admin & Backend API
```bash
cd next-admin
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) for the Admin Dashboard.

### 2. Run Flutter Mobile Application
```bash
# Point to local Next.js server
flutter run --dart-define=API_BASE_URL=http://localhost:3000/api

# Or point to production Vercel deployment
flutter run --dart-define=API_BASE_URL=https://next-admin-xi-rouge.vercel.app/api
```

For complete documentation on deployment, tests, and environment configuration, refer to [next-admin/README.md](file:///f:/Geo_attendence/next-admin/README.md).

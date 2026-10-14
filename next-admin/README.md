# GeoAttend (AttendX) — Next.js Admin Dashboard & REST API

This repository contains the Next.js 14 (App Router) administration dashboard and full-featured backend API for the GeoAttend (AttendX) attendance tracking system, powered by **Supabase Auth + PostgreSQL**.

---

## 1. System Architecture

```mermaid
graph TD
    Flutter["Flutter Mobile App (iOS / Android)"] -->|Bearer JWT| NextAPI["Next.js API Routes (/api/*)"]
    AdminWeb["Admin Web Dashboard (Next.js)"] -->|Cookie / Bearer| NextAPI
    
    subgraph "Next.js Server Runtime"
        NextAPI -->|User-Scoped Client<br/>auth.uid() forward| SupabaseRPC["Supabase RPCs (rpc_check_in, rpc_check_out)"]
        NextAPI -->|Admin Client<br/>service_role (Server-Only)| SupabaseAuthAdmin["Supabase Auth Admin API (Ban / Unban)"]
        NextAPI -->|Admin Client<br/>service_role| SupabaseDB["PostgreSQL (profiles, locations, attendances)"]
    end
    
    subgraph "Supabase PostgreSQL 15"
        SupabaseRPC --> DBTrigger["Geofence Haversine Check<br/>Late Arrival (09:30 Asia/Kolkata)<br/>Half-Day (< 4.0h)"]
        DBTrigger --> SupabaseDB
    end
```

---

## 2. Key Migration Highlights

1. **Supabase Auth & RLS Integration**:
   - Zero exposure of `SUPABASE_SERVICE_ROLE_KEY` to browsers or mobile bundles.
   - Attendance RPCs (`rpc_check_in`, `rpc_check_out`) receive the authenticated user's access token directly, preserving `auth.uid()` identity in PostgreSQL.
   - Non-privileged registration defaults strictly to the `'user'` role.
   - User deactivation updates `profiles.is_active` via `admin_set_user_active` RPC and executes an Auth session ban via trusted server code with graceful partial-failure handling.

2. **Mobile & Legacy Compatibility**:
   - Seamless compatibility with the Flutter mobile application: returns legacy `_id` and nested objects (`locationId.locationName`, `userId.name`, etc.).
   - Transparent legacy location ID resolution: incoming 24-character hex Mongo IDs are resolved against `locations.legacy_mongo_id`.

3. **Preserved Business Rules**:
   - **One attendance record per user per UTC date** enforced at database constraint and RPC levels.
   - **Haversine geofence validation** on check-in within the location's configured radius (metres).
   - **Late-arrival rule**: check-in after 09:30 evaluated in `Asia/Kolkata` timezone marked as `late`.
   - **Half-day rule**: working hours under 4.0 hours on check-out automatically flagged as `half-day`.
   - **Check-out geofence**: check-out allows arbitrary coordinates without radius restriction (per specification).
   - **Role-Based Access Control**: only administrators may modify locations and user statuses.

---

## 3. Environment Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Populate the required environment variables:

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client & Server | Your Supabase project URL (e.g., `https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client & Server | Supabase anonymous / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-Only** | Privileged service-role key for Auth Admin operations. Never prefix with `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | Public | URL of the deployed Next.js application (default: `http://localhost:3000`) |

---

## 4. Local Development

### Prerequisites
- Node.js 18+ (tested with Node 22)
- npm or yarn

### Installation & Run

```bash
cd next-admin
npm install
npm run dev
```

The application will be running at [http://localhost:3000](http://localhost:3000).

- **Admin Dashboard**: [http://localhost:3000/login](http://localhost:3000/login)
- **API Health Check**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 5. Flutter Mobile App Setup

The Flutter application (`/lib`) communicates with the Next.js API using a configurable base URL defined in [lib/models/app_constants.dart](file:///f:/Geo_attendence/lib/models/app_constants.dart).

### Running Mobile App Against Local Next.js

1. **Android Emulator**:
   ```bash
   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api
   ```
2. **iOS Simulator**:
   ```bash
   flutter run --dart-define=API_BASE_URL=http://localhost:3000/api
   ```
3. **Physical Android / iOS Device**:
   Use your local LAN IP (e.g., `192.168.1.50`):
   ```bash
   flutter run --dart-define=API_BASE_URL=http://192.168.1.50:3000/api
   ```

### Running Mobile App Against Production (Vercel)

```bash
flutter run --dart-define=API_BASE_URL=https://next-admin-xi-rouge.vercel.app/api
```

---

## 6. Running Tests

The test suite validates schema compatibility, Haversine formulas, business rules, validation errors, and end-to-end employee lifecycles.

```bash
# 1. Run Unit Tests (Compatibility formatters, Haversine, 09:30 late rule, half-day rule)
node --experimental-strip-types tests/unit.test.mjs

# 2. Run API Validation Tests (Health check, 401 unauthenticated, coordinate ranges)
node tests/api.test.mjs

# 3. Run End-to-End Lifecycle Tests (Registration, Check-in, 409 Duplicate, Checkout, Deactivation)
# Note: Requires Next.js server running on localhost:3000
node tests/lifecycle.test.mjs
```

---

## 7. Production Deployment to Vercel (Unified Single Deployment)

This deployment serves both the **Next.js Admin Dashboard** and the **Flutter Web Employee Attendance Portal** under **ONE domain and ONE Vercel project**:

- **Next.js Admin Dashboard**: Hosted at `/` and `/login`
- **Employee Attendance Web Portal**: Hosted at `/employee` and `/employee/*`
- **Backend REST API**: Unchanged at `/api/*`

### Architecture & Build Process
1. Flutter Web is compiled with `--base-href "/employee/" --release` into `next-admin/public/employee/`.
2. Next.js serves static assets directly from `public/employee` without requiring the Flutter SDK on Vercel's build environment.
3. Next.js `rewrites()` in `next.config.mjs` provide SPA fallback for `/employee/*` so page refreshes and employee subpaths route directly to `index.html`.
4. `next-admin/scripts/sync-flutter.mjs` automatically synchronizes local Flutter builds into `public/employee` during `npm run prebuild`.

### Deployment Steps
1. **Push Code to GitHub**:
   ```bash
   git add .
   git commit -m "Deploy Next.js Admin + Flutter Employee Attendance Web portal"
   git push origin main
   ```
2. **Vercel Project Settings**:
   - **Root Directory**: `next-admin`
   - **Framework Preset**: `Next.js`
3. **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<your-anon-key>`
   - `SUPABASE_SERVICE_ROLE_KEY` = `<your-service-role-key>`
   - `NEXT_PUBLIC_APP_URL` = `https://next-admin-xi-rouge.vercel.app`

---

## 8. API Endpoint Reference

### Public & Auth
- `GET /api/health` — Service health check
- `POST /api/auth/register` — Employee registration
- `POST /api/auth/login` — Employee / Mobile login
- `POST /api/auth/admin/login` — Admin dashboard login (checks admin role)
- `GET /api/auth/me` — Authenticated profile lookup

### Attendance (Authenticated Employee)
- `POST /api/attendance/checkin` — Check-in with geofence validation
- `POST /api/attendance/checkout` — Check-out and working hours calculation
- `GET /api/attendance/today` — Current day attendance status
- `GET /api/attendance/history/[userId]` — Attendance history and statistics

### Admin Only
- `GET /api/admin/locations` — List office locations
- `POST /api/admin/location/create` — Create office location
- `PUT /api/admin/location/[id]` — Update office location
- `DELETE /api/admin/location/[id]` — Delete or deactivate office location
- `GET /api/admin/users` — List registered employees
- `PATCH /api/admin/users/[id]/toggle` — Activate / Deactivate employee
- `GET /api/admin/attendance/all` — Real-time attendance log
- `GET /api/admin/analytics` — Dashboard metrics & department breakdown
- `GET /api/admin/reports/export` — Export attendance report (.xlsx)

### Profile & Settings
- `GET /api/user/profile` — View current profile
- `PUT /api/user/profile` — Update name, phone, department, profile image
- `PUT /api/user/change-password` — Change password

# Comprehensive Migration Audit: GeoAttend (AttendX)

**Audit Date:** October 14, 2026  
**Auditor:** Antigravity Engineering Pair  
**Project Workspace:** `f:/Geo_attendence`  
**Target Architecture:**
- Supabase PostgreSQL (Database + Triggers + PostGIS / Haversine Functions)
- Supabase Auth (Identity, JWTs, Session Management)
- Next.js Admin Dashboard (React 18 / Next.js on Vercel)
- Existing Flutter Mobile App Preserved (Android / iOS)
- Vercel Deployment for Web / Dashboard & Serverless API Routes

---

## 1. Existing Architecture & Complete Feature Inventory

### 1.1 Architecture Overview

```
                                  +---------------------------+
                                  |   Flutter Mobile App      |
                                  |   (lib/ - Dart/Provider)  |
                                  +-------------+-------------+
                                                |
                                                | HTTP / REST (JWT Bearer)
                                                v
+-------------------------------+       +-------+-------+
|  Admin Dashboard Web App      | ----> | Node/Express  | <----> MongoDB (Mongoose)
|  (admin-dashboard/ - React 18)|       | Backend API   |        - users
+-------------------------------+       | (port 5000)   |        - attendances
                                        +---------------+        - locations
```

### 1.2 Component Breakdown

| Component | Directory / Source | Framework / Stack | Role & State |
| :--- | :--- | :--- | :--- |
| **Backend API** | `backend/` | Node.js v18+, Express 4.18, Mongoose 8.0, JWT, BcryptJS | REST API server handling authentication, geofence verification, attendance business rules, analytics, and Excel reports. |
| **Admin Web Dashboard** | `admin-dashboard/` | React 18.2, Vite 5.0, React Router 6.21, Recharts 2.10, Axios | Single-Page Application (SPA) for admins to manage users, configure geofences, view attendance logs, and generate reports. |
| **Mobile Application** | `lib/` (root) | Flutter 3.x, Dart 3.x, Provider, Geolocator, SharedPreferences | Mobile client for employees to check in/out within geofenced office zones, view personal attendance history, and see daily status. |
| **Standalone Prototype** | `mobile-ui-prototype/` | Vanilla HTML5, CSS3, JS, Service Worker (PWA) | Static/PWA prototype for testing UI layouts and unified portal client against `http://localhost:5000/api`. |

### 1.3 Complete Feature Inventory

#### A. Mobile Application Features (`lib/`)
1. **User Authentication**:
   - Registration with Full Name, Email, Password, Department, Employee ID, Phone ([login_screen.dart](file:///f:/Geo_attendence/lib/screens/login_screen.dart)).
   - Login with Email and Password, storing JWT token and User JSON into `SharedPreferences` ([auth_provider.dart](file:///f:/Geo_attendence/lib/providers/auth_provider.dart)).
   - Session auto-restore on launch.
   - Logout with confirmation modal.
2. **Geofenced Check-In**:
   - Live GPS location acquisition using `geolocator` with accuracy indicator ([home_screen.dart](file:///f:/Geo_attendence/lib/screens/home_screen.dart)).
   - Dropdown selection of active authorized office locations fetched from `/api/admin/locations`.
   - Submit check-in coordinates to `/api/attendance/checkin`.
   - Server-side geofence calculation; returns distance and approval or rejection.
   - Late status calculation based on 09:30 threshold.
3. **Check-Out**:
   - Real-time GPS coordinate capture on check-out to `/api/attendance/checkout`.
   - Automatic working hours computation.
   - Automatic half-day marking if total working hours < 4.0 hours.
4. **Today's Attendance Status Display**:
   - Status card reflecting Not Checked In, Checked In, or Completed.
   - Check-in and check-out timestamps, working hours duration.
5. **Attendance History**:
   - User attendance history list fetched from `/api/attendance/history/:userId` ([history_screen.dart](file:///f:/Geo_attendence/lib/screens/history_screen.dart)).
   - Attendance percentage and total days summary card.
   - Status badges with color coding (`present` = green, `late`/`half-day` = amber, `absent` = red).
6. **User Profile**:
   - View employee metadata (Name, Email, Employee ID, Department, Phone, Role) ([profile_screen.dart](file:///f:/Geo_attendence/lib/screens/profile_screen.dart)).

#### B. Admin Dashboard Features (`admin-dashboard/`)
1. **Admin Authentication**:
   - Dedicated admin login screen communicating with `/api/auth/admin/login` ([LoginPage.jsx](file:///f:/Geo_attendence/admin-dashboard/src/pages/LoginPage.jsx)).
   - LocalStorage session persistence (`adminToken`, `adminUser`).
   - Axios request interceptor with Bearer token injection and global 401 response redirect ([client.js](file:///f:/Geo_attendence/admin-dashboard/src/api/client.js)).
2. **Dashboard Analytics** ([DashboardPage.jsx](file:///f:/Geo_attendence/admin-dashboard/src/pages/DashboardPage.jsx)):
   - Key metric cards: Total Users, Today's Present, Total Records, Active Locations.
   - Area chart: 7-day attendance trend.
   - Pie chart: Attendance breakdown by status (`present`, `late`, `half-day`, `absent`).
   - Bar chart: Daily attendance distribution.
3. **Attendance Records Management** ([AttendancePage.jsx](file:///f:/Geo_attendence/admin-dashboard/src/pages/AttendancePage.jsx)):
   - Tabular log of all employee check-ins across the company.
   - Date filter with server-side query.
   - Display: Employee name/email/department, date, check-in time, check-out time, working hours, geofence location name, distance in meters, status badge.
   - Pagination (limit 30 records per page).
4. **Geofence Location Management** ([LocationsPage.jsx](file:///f:/Geo_attendence/admin-dashboard/src/pages/LocationsPage.jsx)):
   - View all geofence zones with latitude, longitude, allowed radius (meters), active status, and creator name.
   - Modal to create a new location with coordinate validation (radius 10m to 5000m).
   - Modal to edit an existing location.
   - Delete location with confirmation prompt.
5. **User Management** ([UsersPage.jsx](file:///f:/Geo_attendence/admin-dashboard/src/pages/UsersPage.jsx)):
   - Paginated list of registered employees (role: `'user'`).
   - Search by name or email with live debouncing/query params.
   - Toggle user account status (Activate / Deactivate via PATCH).
6. **Reports & Data Export** ([ReportsPage.jsx](file:///f:/Geo_attendence/admin-dashboard/src/pages/ReportsPage.jsx)):
   - Filter by Month (01–12) and Year.
   - Preview generated tabular report in browser.
   - Client-side CSV export (`Blob` download).
   - Server-side Excel export (`.xlsx` binary stream generated via SheetJS `xlsx`).

---

## 2. Actual Mongoose Collections, Fields, Relationships, Indexes & Validation Rules

Source files verified:
- [User.js](file:///f:/Geo_attendence/backend/models/User.js)
- [Attendance.js](file:///f:/Geo_attendence/backend/models/Attendance.js)
- [Location.js](file:///f:/Geo_attendence/backend/models/Location.js)

### 2.1 Collection: `users` (Model: `User`)

| Field Name | Mongoose Type | Required | Default | Validation / Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Auto | Generated | Primary Key | Mongo unique identifier |
| `name` | `String` | Yes | — | `trim: true`, `minlength: 2` | Full name of the user |
| `email` | `String` | Yes | — | `unique: true`, `lowercase: true`, `trim: true`, regex `/^\S+@\S+\.\S+$/` | Unique login email |
| `password` | `String` | Yes | — | `minlength: 6`, `select: false` | Bcrypt hashed password (12 salt rounds) |
| `role` | `String` | No | `'user'` | `enum: ['user', 'admin']` | User privilege level |
| `department` | `String` | No | `''` | `trim: true` | Organization department |
| `employeeId` | `String` | No | `''` | `trim: true` | Organization employee ID code |
| `phone` | `String` | No | `''` | `trim: true` | Phone number |
| `isActive` | `Boolean` | No | `true` | Boolean flag | Account status flag |
| `profileImage`| `String` | No | `''` | URL or base64 string | Profile picture reference |
| `lastLogin` | `Date` | No | `null` | Updated on successful login | Timestamp of most recent login |
| `createdAt` | `Date` | Auto | Now | Managed via `{ timestamps: true }` | Timestamp |
| `updatedAt` | `Date` | Auto | Now | Managed via `{ timestamps: true }` | Timestamp |

**Mongoose Hooks & Methods:**
- `pre('save')`: Hashes `password` using `bcrypt.genSalt(12)` if modified.
- `comparePassword(candidatePassword)`: Compares candidate string with bcrypt hash.
- `toJSON()`: Deletes `password` property before object serialization.

---

### 2.2 Collection: `locations` (Model: `Location`)

| Field Name | Mongoose Type | Required | Default | Validation / Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Auto | Generated | Primary Key | Mongo unique identifier |
| `locationName` | `String` | Yes | — | `trim: true`, `unique: true` | Unique zone name (e.g. "Ahmedabad Ognaj Office") |
| `latitude` | `Number` | Yes | — | `min: -90`, `max: 90` | Center GPS latitude coordinate |
| `longitude` | `Number` | Yes | — | `min: -180`, `max: 180` | Center GPS longitude coordinate |
| `radius` | `Number` | Yes | `100` | `min: 10`, `max: 5000` | Allowed geofence boundary in meters |
| `description` | `String` | No | `''` | `trim: true` | Optional zone description |
| `isActive` | `Boolean` | No | `true` | Boolean flag | Active/inactive toggle |
| `createdBy` | `ObjectId` | No | `null` | `ref: 'User'` | Reference to admin user who created location |
| `createdAt` | `Date` | Auto | Now | Managed via `{ timestamps: true }` | Timestamp |
| `updatedAt` | `Date` | Auto | Now | Managed via `{ timestamps: true }` | Timestamp |

**Indexes:**
- Unique index on `locationName`.

---

### 2.3 Collection: `attendances` (Model: `Attendance`)

| Field Name | Mongoose Type | Required | Default | Validation / Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Auto | Generated | Primary Key | Mongo unique identifier |
| `userId` | `ObjectId` | Yes | — | `ref: 'User'` | Foreign key reference to `users` |
| `locationId` | `ObjectId` | Yes | — | `ref: 'Location'` | Foreign key reference to `locations` |
| `date` | `String` | Yes | — | Format `"YYYY-MM-DD"` | ISO date string for duplicate checking |
| `checkInTime` | `Date` | No | `null` | Timestamp | Recorded check-in datetime |
| `checkOutTime` | `Date` | No | `null` | Timestamp | Recorded check-out datetime |
| `checkInLatitude` | `Number` | No | `null` | GPS Float | Latitude captured at check-in |
| `checkInLongitude`| `Number` | No | `null` | GPS Float | Longitude captured at check-in |
| `checkOutLatitude`| `Number` | No | `null` | GPS Float | Latitude captured at check-out |
| `checkOutLongitude`| `Number`| No | `null` | GPS Float | Longitude captured at check-out |
| `distanceAtCheckIn`| `Number`| No | `null` | Integer meters | Calculated distance from authorized location center |
| `status` | `String` | No | `'present'` | `enum: ['present', 'absent', 'late', 'half-day']` | Attendance status classification |
| `workingHours` | `Number` | No | `null` | Computed Float (2 decimals) | Total hours between check-in and check-out |
| `notes` | `String` | No | `''` | Freeform text | Optional notes |
| `createdAt` | `Date` | Auto | Now | Managed via `{ timestamps: true }` | Timestamp |
| `updatedAt` | `Date` | Auto | Now | Managed via `{ timestamps: true }` | Timestamp |

**Indexes & Rules:**
- Compound unique index: `{ userId: 1, date: 1 }` with `{ unique: true }`. Prevents multiple attendance records for the same user on the same calendar day.
- `pre('save')`: Auto-calculates `workingHours`:
  ```javascript
  if (this.checkInTime && this.checkOutTime) {
    const diff = this.checkOutTime - this.checkInTime;
    this.workingHours = parseFloat((diff / (1000 * 60 * 60)).toFixed(2));
  }
  ```

---

## 3. Authentication & Role / Permission Logic

Source files verified:
- [auth.js (middleware)](file:///f:/Geo_attendence/backend/middleware/auth.js)
- [authController.js](file:///f:/Geo_attendence/backend/controllers/authController.js)
- [adminController.js](file:///f:/Geo_attendence/backend/controllers/adminController.js)

### 3.1 Token & Session Architecture
- **Token Mechanism**: Standard JSON Web Token (JWT) signed with `process.env.JWT_SECRET`.
- **Token Expiry**: Configured via `process.env.JWT_EXPIRES_IN || '7d'`.
- **Payload**: Contains only `{ id: user._id }`.
- **Transmission**: Sent via HTTP Authorization header: `Authorization: Bearer <token>`.

### 3.2 Authentication Middleware (`protect`)
1. Checks for `req.headers.authorization` starting with `Bearer `. Returns `401 Unauthorized` if missing.
2. Decodes token using `jwt.verify(token, process.env.JWT_SECRET)`.
3. Queries `User.findById(decoded.id).select('-password')`. Returns `401 Unauthorized` if user no longer exists in DB.
4. Checks `if (!user.isActive)`. Returns `403 Forbidden` (`'Account is deactivated.'`).
5. Injects verified document into `req.user`.

### 3.3 Authorization Middleware (`adminOnly`)
1. Evaluates `req.user && req.user.role === 'admin'`.
2. Returns `403 Forbidden` (`'Admin access required.'`) if not an admin.

### 3.4 Role Separation & Vulnerabilities Found
- **Roles in System**: Only two roles exist: `'user'` and `'admin'`.
- **Admin Login Endpoint (`/api/auth/admin/login`)**: Specifically restricts login to accounts where `role === 'admin'`.
- **User Login Endpoint (`/api/auth/login`)**: Does not restrict by role; an admin account can also log in via this route.
- ⚠️ **Elevation-of-Privilege Security Finding in Current Code**: In [authController.js:32](file:///f:/Geo_attendence/backend/controllers/authController.js#L32), `register` takes `role: req.body.role || 'user'`. Any anonymous user can send `{ "role": "admin" }` in the public register payload and create an administrative account! During migration to Supabase Auth, role assignment must be strictly restricted to server triggers or service-role admin calls.

---

## 4. Exact Attendance, GPS, Geofence & Shift Behavior

Source files verified:
- [geofence.js](file:///f:/Geo_attendence/backend/utils/geofence.js)
- [attendanceController.js](file:///f:/Geo_attendence/backend/controllers/attendanceController.js)

### 4.1 Geofence Calculation Formula
The backend calculates distance using the spherical Haversine formula:
- Earth Radius: $R = 6,371,000\text{ meters}$
- Angles converted from degrees to radians: $\text{rad} = \text{deg} \times \frac{\pi}{180}$
- $$a = \sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1) \cdot \cos(\text{lat}_2) \cdot \sin^2\left(\frac{\Delta \text{lon}}{2}\right)$$
- $$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
- $$\text{distance} = R \cdot c$$ (rounded to nearest integer meter via `Math.round(distance)`)
- Authorized condition: $\text{distance} \le \text{allowedRadius}$

### 4.2 Check-In Pipeline (`POST /api/attendance/checkin`)
1. **Payload Required**: `latitude` (Number), `longitude` (Number), `locationId` (MongoDB ObjectId).
2. **Range Validation**: `|latitude| <= 90` and `|longitude| <= 180`. Returns `400 Bad Request` if invalid.
3. **Location Check**: Finds `Location.findById(locationId)`. Returns `404` if not found or if `!location.isActive`.
4. **Geofence Enforcement**: Executes `checkGeofence(...)`.
   - If `!isInside`, rejects immediately with `403 Forbidden`:
     `"You are ${distance}m away from "${location.locationName}". Must be within ${location.radius}m."`
5. **Duplicate Daily Check**:
   - Computes `today = new Date().toISOString().split('T')[0]` (UTC format `"YYYY-MM-DD"`).
   - Queries `Attendance.findOne({ userId, date: today })`.
   - If record exists, rejects with `409 Conflict` (`"Attendance already marked for today."`).
6. **Late Evaluation**:
   - Evaluates current time:
     `isLate = hours > 9 || (hours === 9 && mins > 30)` (i.e. strictly after **09:30 AM** server local time).
   - Status set to `'late'` if true, otherwise `'present'`.
7. **Record Created**: Records `checkInTime: now`, `checkInLatitude`, `checkInLongitude`, `distanceAtCheckIn: distance`. Populates location details.

### 4.3 Check-Out Pipeline (`POST /api/attendance/checkout`)
1. **Payload**: `latitude` (optional), `longitude` (optional).
2. **Eligibility Check**: Looks up `Attendance.findOne({ userId, date: today })`.
   - If not found: `404 Not Found` (`"No check-in found for today."`).
   - If `attendance.checkOutTime` is already set: `409 Conflict` (`"Already checked out for today."`).
3. **Checkout Geofencing**: ⚠️ **Notable Finding**: Check-out does **NOT** enforce geofence distance! Coordinates are saved as `checkOutLatitude` / `checkOutLongitude` if provided, but distance is not evaluated against any location.
4. **Duration & Half-Day Rule**:
   - `workingHours = parseFloat(((now - checkInTime) / (1000 * 60 * 60)).toFixed(2))`
   - **Half-Day Rule**: If `workingHours < 4.0`, status is automatically overridden to `'half-day'` (even if check-in was marked `'present'` or `'late'`).

### 4.4 Multiple Sessions & Shift Logic
- **Multiple Check-ins per Day**: **STRICTLY NOT ALLOWED**. Prevented both in software controller (`findOne({ userId, date })`) and database layer (`unique index { userId: 1, date: 1 }`).
- **Multiple Shifts**: **NOT IMPLEMENTED**. The system operates on a single fixed day window.
- **Night Shifts Across Midnight**: **NOT SUPPORTED**. The date string is locked to UTC `YYYY-MM-DD`. Any checkout past midnight UTC would look for a checkin on the *new* day and fail with 404.
- **Grace Period / Flexible Hours**: Hardcoded to 09:30 AM; no per-department or per-user shift configuration exists in the codebase.

---

## 5. Existing APIs & Caller Component Mapping

Every single route in the Express router and its callers:

| HTTP Method | Route Path | Auth Middleware | Express Handler | Called By Frontend Component(s) |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | None (Public) | `authController.register` | Flutter: [ApiService.register](file:///f:/Geo_attendence/lib/services/api_service.dart#L26) |
| `POST` | `/api/auth/login` | None (Public) | `authController.login` | Flutter: [ApiService.login](file:///f:/Geo_attendence/lib/services/api_service.dart#L42) |
| `POST` | `/api/auth/admin/login` | None (Public) | `authController.adminLogin` | Admin: [AuthContext.jsx:login](file:///f:/Geo_attendence/admin-dashboard/src/context/AuthContext.jsx#L27) |
| `GET` | `/api/auth/me` | `protect` | `authController.getMe` | *Unused in current frontends* (defined in backend) |
| `POST` | `/api/attendance/checkin` | `protect` | `attendanceController.checkIn` | Flutter: [ApiService.checkIn](file:///f:/Geo_attendence/lib/services/api_service.dart#L61) |
| `POST` | `/api/attendance/checkout` | `protect` | `attendanceController.checkOut` | Flutter: [ApiService.checkOut](file:///f:/Geo_attendence/lib/services/api_service.dart#L74) |
| `GET` | `/api/attendance/today` | `protect` | `attendanceController.getTodayStatus`| Flutter: [ApiService.getTodayStatus](file:///f:/Geo_attendence/lib/services/api_service.dart#L86) |
| `GET` | `/api/attendance/history/:userId` | `protect` | `attendanceController.getHistory` | Flutter: [ApiService.getHistory](file:///f:/Geo_attendence/lib/services/api_service.dart#L94) |
| `GET` | `/api/admin/users` | `protect`, `adminOnly` | `adminController.getAllUsers` | Admin: [UsersPage.jsx](file:///f:/Geo_attendence/admin-dashboard/src/pages/UsersPage.jsx#L15) |
| `PATCH` | `/api/admin/users/:id/toggle` | `protect`, `adminOnly` | `adminController.toggleUserStatus` | Admin: [UsersPage.jsx](file:///f:/Geo_attendence/admin-dashboard/src/pages/UsersPage.jsx#L25) |
| `POST` | `/api/admin/location/create` | `protect`, `adminOnly` | `adminController.createLocation` | Admin: [LocationsPage.jsx](file:///f:/Geo_attendence/admin-dashboard/src/pages/LocationsPage.jsx#L18) |
| `GET` | `/api/admin/locations` | `protect` *(No adminOnly!)* | `adminController.getLocations` | Flutter: [ApiService.getLocations](file:///f:/Geo_attendence/lib/services/api_service.dart#L52) & Admin: [LocationsPage.jsx](file:///f:/Geo_attendence/admin-dashboard/src/pages/LocationsPage.jsx#L94) |
| `PUT` | `/api/admin/location/:id` | `protect`, `adminOnly` | `adminController.updateLocation` | Admin: [LocationsPage.jsx](file:///f:/Geo_attendence/admin-dashboard/src/pages/LocationsPage.jsx#L15) |
| `DELETE` | `/api/admin/location/:id` | `protect`, `adminOnly` | `adminController.deleteLocation` | Admin: [LocationsPage.jsx](file:///f:/Geo_attendence/admin-dashboard/src/pages/LocationsPage.jsx#L105) |
| `GET` | `/api/admin/attendance/all` | `protect`, `adminOnly` | `adminController.getAllAttendance` | Admin: [AttendancePage.jsx](file:///f:/Geo_attendence/admin-dashboard/src/pages/AttendancePage.jsx#L21) |
| `GET` | `/api/admin/analytics` | `protect`, `adminOnly` | `adminController.getAnalytics` | Admin: [DashboardPage.jsx](file:///f:/Geo_attendence/admin-dashboard/src/pages/DashboardPage.jsx#L15) |
| `GET` | `/api/admin/reports/export` | `protect`, `adminOnly` | `adminController.exportReport` | Admin: [ReportsPage.jsx](file:///f:/Geo_attendence/admin-dashboard/src/pages/ReportsPage.jsx#L17) |
| `GET` | `/api/user/profile` | `protect` | `userController.getProfile` | Flutter: [ApiService.getProfile](file:///f:/Geo_attendence/lib/services/api_service.dart#L103) *(Defined in service, UI reads provider)* |
| `PUT` | `/api/user/profile` | `protect` | `userController.updateProfile` | Flutter: [ApiService.updateProfile](file:///f:/Geo_attendence/lib/services/api_service.dart#L111) *(Defined in service, not exposed in UI)* |
| `PUT` | `/api/user/change-password` | `protect` | `userController.changePassword` | *Unused in current frontends* (defined in backend) |
| `GET` | `/api/health` | None (Public) | Inline in `server.js` | Dev / healthcheck ping |

---

## 6. Data Migration Risks & Legacy ID Requirements

### 6.1 Critical Migration Risks

1. **MongoDB ObjectID (`_id`) vs. Supabase UUID (`id`)**:
   - The Flutter mobile app JSON model explicitly parses `_id`:
     ```dart
     id: json['_id'] ?? '',
     locationName: json['locationId']?['locationName'],
     ```
   - In `admin-dashboard`, React components use `loc._id`, `r._id`, `u._id` as table keys and route parameters (`/admin/location/${location._id}`, `/admin/users/${id}/toggle`).
   - **Risk**: Directly replacing `_id` with `id` in JSON responses will break the Flutter app deserialization and Admin Dashboard table keys.
   - **Mitigation Requirement**:
     - Store the original MongoDB 24-character hexadecimal `_id` in a column named `legacy_mongo_id VARCHAR(24)` on all PostgreSQL tables.
     - When building Next.js API compatibility routes or Supabase responses for Flutter, ensure response serializes `_id: record.id` (or maps `_id` to UUID string) to maintain 100% backward compatibility with the compiled mobile app!

2. **Supabase Auth vs. Legacy Custom Password Hashes**:
   - The existing MongoDB database stores bcrypt hashes (12 rounds) in `users.password`.
   - Supabase Auth manages users in its own internal `auth.users` schema using bcrypt or argon2.
   - **Risk**: Existing users cannot log in via Supabase Auth client SDKs unless passwords are either migrated into `auth.users` via the Supabase Admin API / SQL migration or users are forced to reset passwords.
   - **Recommendation**: Write a migration script using Supabase Admin Auth API (`supabase.auth.admin.createUser({ email, password_hash })`) or provide seamless credential migration.

3. **Time Zone & Date String Consistency**:
   - In MongoDB, `date` is a plain string `"YYYY-MM-DD"` generated via `toISOString().split('T')[0]`, which is **UTC**.
   - PostgreSQL has a native `DATE` type.
   - **Risk**: If server timezone shifts from UTC to local time (e.g. IST +05:30), dates could mismatch around midnight, causing false duplicate errors or wrong status.
   - **Mitigation**: Standardize on `DATE` type in PostgreSQL, with dates normalized to the organization's business timezone (e.g., `'Asia/Kolkata'`).

4. **Location Foreign Key Deletion Cascading**:
   - In MongoDB, if an admin calls `DELETE /api/admin/location/:id`, the location document is removed, leaving orphaned `locationId` ObjectIds in `attendances`.
   - In PostgreSQL, foreign keys require an explicit `ON DELETE` rule.
   - **Mitigation**: Use `ON DELETE RESTRICT` (prevent deleting locations that have attendance logs) or `ON DELETE SET NULL` with a soft-delete column `is_deleted` / `is_active = false`. In fact, `LocationsPage.jsx` allows deleting, so soft deletion (`is_active = false`) is much safer for historical attendance records!

---

## 7. Proposed PostgreSQL Table Requirements Grounded in Source Code

> [!NOTE]
> As requested, Claude will generate the exact executable SQL schema. Below are the verified functional specifications and column mappings derived directly from the source code.

### 7.1 Table: `profiles` (Linked to `auth.users`)

Replaces MongoDB `users` collection. In Supabase, core auth is handled in `auth.users`, and application metadata belongs in `public.profiles`.

```
profiles
├── id (UUID, PK, REFERENCES auth.users(id) ON DELETE CASCADE)
├── name (TEXT, NOT NULL, CHECK length >= 2)
├── email (TEXT, NOT NULL, UNIQUE)
├── role (TEXT, NOT NULL, DEFAULT 'user', CHECK role IN ('user', 'admin'))
├── department (TEXT, DEFAULT '')
├── employee_id (TEXT, DEFAULT '')
├── phone (TEXT, DEFAULT '')
├── is_active (BOOLEAN, NOT NULL, DEFAULT true)
├── profile_image (TEXT, DEFAULT '')
├── last_login (TIMESTAMPTZ)
├── legacy_mongo_id (VARCHAR(24), UNIQUE)
├── created_at (TIMESTAMPTZ, NOT NULL, DEFAULT now())
└── updated_at (TIMESTAMPTZ, NOT NULL, DEFAULT now())
```

### 7.2 Table: `locations`

Replaces MongoDB `locations` collection.

```
locations
├── id (UUID, PK, DEFAULT gen_random_uuid())
├── location_name (TEXT, NOT NULL, UNIQUE)
├── latitude (DOUBLE PRECISION, NOT NULL, CHECK latitude BETWEEN -90 AND 90)
├── longitude (DOUBLE PRECISION, NOT NULL, CHECK longitude BETWEEN -180 AND 180)
├── radius (DOUBLE PRECISION, NOT NULL, DEFAULT 100, CHECK radius BETWEEN 10 AND 5000)
├── description (TEXT, DEFAULT '')
├── is_active (BOOLEAN, NOT NULL, DEFAULT true)
├── created_by (UUID, REFERENCES profiles(id) ON DELETE SET NULL)
├── legacy_mongo_id (VARCHAR(24), UNIQUE)
├── created_at (TIMESTAMPTZ, NOT NULL, DEFAULT now())
└── updated_at (TIMESTAMPTZ, NOT NULL, DEFAULT now())
```

### 7.3 Table: `attendances`

Replaces MongoDB `attendances` collection.

```
attendances
├── id (UUID, PK, DEFAULT gen_random_uuid())
├── user_id (UUID, NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE)
├── location_id (UUID, NOT NULL, REFERENCES locations(id) ON DELETE RESTRICT)
├── date (DATE, NOT NULL)
├── check_in_time (TIMESTAMPTZ)
├── check_out_time (TIMESTAMPTZ)
├── check_in_latitude (DOUBLE PRECISION)
├── check_in_longitude (DOUBLE PRECISION)
├── check_out_latitude (DOUBLE PRECISION)
├── check_out_longitude (DOUBLE PRECISION)
├── distance_at_check_in (INTEGER)
├── status (TEXT, NOT NULL, DEFAULT 'present', CHECK status IN ('present', 'absent', 'late', 'half-day'))
├── working_hours (NUMERIC(4, 2))
├── notes (TEXT, DEFAULT '')
├── legacy_mongo_id (VARCHAR(24), UNIQUE)
├── created_at (TIMESTAMPTZ, NOT NULL, DEFAULT now())
└── updated_at (TIMESTAMPTZ, NOT NULL, DEFAULT now())

CONSTRAINT unique_user_daily_attendance UNIQUE (user_id, date)
```

### 7.4 Stored Procedures / Functions Needed in PostgreSQL
1. **Haversine Distance Calculator**:
   - A SQL or PL/pgSQL function `calculate_distance(lat1, lon1, lat2, lon2)` returning distance in meters, mimicking [geofence.js](file:///f:/Geo_attendence/backend/utils/geofence.js).
2. **Atomic Check-In Function (`rpc_check_in`)**:
   - Executes geofence validation, checks active status of location, verifies single check-in per day, evaluates late time (09:30 AM), and inserts attendance record in a single transaction.
3. **Atomic Check-Out Function (`rpc_check_out`)**:
   - Validates today's record exists, verifies not already checked out, computes `working_hours`, sets `half-day` if < 4.0h, and updates record.

---

## 8. Security & Row-Level Security (RLS) Requirements

When moving to Supabase, client applications (Flutter & Next.js) may interact with Supabase either directly or via API routes. RLS policies must strictly mirror existing Express middleware rules.

### 8.1 Table: `profiles`
- **Enable RLS**: `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`
- **SELECT**:
  - `admin` role can view all profiles: `(auth.jwt() ->> 'role' = 'admin')` or via admin function.
  - Normal users can view their own profile: `auth.uid() = id`.
- **INSERT**:
  - Automatically triggered upon `auth.users` creation (via Supabase trigger function `handle_new_user`).
  - Users cannot directly insert arbitrary roles.
- **UPDATE**:
  - Normal users can update non-sensitive fields (`name`, `department`, `phone`, `profile_image`) on their own row (`auth.uid() = id`).
  - `role` and `is_active` modifications restricted to `admin` only.
- **DELETE**:
  - Admins only (or disabled entirely; soft delete via `is_active = false`).

### 8.2 Table: `locations`
- **Enable RLS**: `ALTER TABLE locations ENABLE ROW LEVEL SECURITY;`
- **SELECT**:
  - Authenticated users (`auth.role() = 'authenticated'`) can select active locations (`is_active = true`).
  - Admins can select all locations.
- **INSERT / UPDATE / DELETE**:
  - Restricted strictly to admins (`auth.jwt() ->> 'role' = 'admin'`).

### 8.3 Table: `attendances`
- **Enable RLS**: `ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;`
- **SELECT**:
  - Normal users can select only their own records: `user_id = auth.uid()`.
  - Admins can select all records across the organization.
- **INSERT**:
  - ⚠️ **CRITICAL SECURITY NOTE**: Do **NOT** allow direct client `INSERT` with arbitrary coordinates into `attendances` table! If client has direct insert access, a malicious employee can bypass GPS geofencing with mock coordinates.
  - Check-in must be executed through a PostgreSQL `SECURITY DEFINER` RPC function (`rpc_check_in`) or a Next.js / Serverless API route that evaluates the geofence math before writing.
- **UPDATE**:
  - Controlled check-out update via RPC or API route.
  - Admin overrides permitted.

---

## 9. Deployment Dependencies & Environment Variables

### 9.1 Environment Variable Audit

> *Note: Secret values are completely redacted in compliance with security guidelines.*

#### Current System Environment Variables:
```env
# Backend (backend/.env)
PORT=5000
MONGODB_URI=mongodb://...
JWT_SECRET=...
JWT_EXPIRES_IN=7d
NODE_ENV=development

# Admin Dashboard
# Hardcoded to proxy '/api' -> http://localhost:5000 in vite.config.js

# Flutter App
# Hardcoded AppConstants.baseUrl = 'http://localhost:5000/api' in lib/models/app_constants.dart
```

#### Target Architecture Environment Variables:

**Next.js Admin Dashboard (Vercel)**:
```env
# Public Supabase Client
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...

# Server-side Supabase Service Role (for Admin API routes)
SUPABASE_SERVICE_ROLE_KEY=ey...

# Base App Config
NEXT_PUBLIC_APP_URL=https://<admin-domain>.vercel.app
```

**Flutter Mobile App (`lib/models/app_constants.dart`)**:
```dart
// Environment-configurable API Base or Supabase URL
static const String baseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://<api-domain>.vercel.app/api',
);
```

### 9.2 Package & Library Audit

| Current Component | Current Libraries | Status in Target Architecture |
| :--- | :--- | :--- |
| `backend` | `express`, `cors`, `dotenv` | Replaced by Next.js Route Handlers (`app/api/...`) or retained as Express on serverless. |
| `backend` | `mongoose` | Removed; replaced by `@supabase/supabase-js` or direct PostgreSQL client (`postgres` / `pg`). |
| `backend` | `jsonwebtoken`, `bcryptjs` | Handled by Supabase Auth (GoTrue). |
| `backend` | `xlsx` | Preserved in Next.js API route for Excel export. |
| `backend` | `pdfkit` | ⚠️ **Unused in codebase**: Declared in `package.json`, never imported in any controller. Can be omitted. |
| `backend` | `express-validator` | ⚠️ **Unused in codebase**: Declared in `package.json`, never imported. Can be omitted. |
| `admin-dashboard` | `vite`, `react-router-dom` | Replaced by Next.js 14/15 App Router (`app/dashboard/...`). |
| `admin-dashboard` | `recharts`, `react-hot-toast` | Compatible and preserved in Next.js (`'use client'` components). |
| `lib` (Flutter) | `http`, `provider`, `geolocator`| Preserved. |
| `lib` (Flutter) | `flutter_secure_storage` | Declared in `pubspec.yaml` but currently unused (app uses `shared_preferences`). Can be adopted for secure token storage. |
| `lib` (Flutter) | `google_maps_flutter` | Declared in `pubspec.yaml` but no Map widget is currently rendered. Preserved for future map view. |

---

## 10. Phased Migration Checklist & Acceptance Tests

### Phase 1: Database & Schema Provisioning (Supabase)
- [ ] Receive and review Claude's PostgreSQL SQL schema.
- [ ] Execute schema creation in Supabase SQL editor:
  - `profiles`, `locations`, `attendances` tables.
  - Foreign key constraints, unique indexes, check constraints.
  - `updated_at` triggers and auto-timestamp functions.
- [ ] Implement Haversine geofence calculation function in PostgreSQL.
- [ ] Implement `rpc_check_in` and `rpc_check_out` stored procedures.
- [ ] Enable and verify Row Level Security (RLS) policies.

### Phase 2: Data Extraction & Migration (MongoDB $\rightarrow$ Supabase)
- [ ] Create extraction script to export MongoDB collections to JSON/CSV with `_id` mapped to `legacy_mongo_id`.
- [ ] Migrate admin and user accounts into Supabase `auth.users` and `public.profiles`.
- [ ] Migrate locations with lat/long and allowed radius.
- [ ] Migrate historical attendance records, preserving dates, check-in/out timestamps, and working hours.
- [ ] Validate record counts: MongoDB count == Supabase count.

### Phase 3: Next.js Admin Dashboard Implementation (Vercel)
- [ ] Scaffold Next.js project with App Router and Tailwind CSS / custom design system matching current dark theme.
- [ ] Implement Supabase Auth SSR middleware and Admin Role protection.
- [ ] Port pages:
  - `DashboardPage` (Stats, 7-day AreaChart, Status PieChart).
  - `AttendancePage` (Table, Date filtering, Pagination).
  - `LocationsPage` (CRUD modal for geofences).
  - `UsersPage` (User directory, search, status toggle).
  - `ReportsPage` (Month/Year filtering, CSV download, XLSX export).
- [ ] Implement REST API compatibility routes under `/api/*` for the Flutter app.

### Phase 4: Flutter Mobile App Verification & Preserved Compatibility
- [ ] Update `AppConstants.baseUrl` to target the deployed Vercel/Supabase API domain.
- [ ] Verify JSON serialization matches `_id`, `locationId` nested object, and date formats.
- [ ] Test on Android and iOS devices/emulators.

---

### Acceptance Tests

| Test ID | Scenario | Expected Result | Verified Source Rule |
| :--- | :--- | :--- | :--- |
| **AT-01** | User registers via mobile app | Record created in `profiles` (and Supabase Auth), default role `'user'`, JWT returned. | `authController.register` |
| **AT-02** | User attempts registration with duplicate email | HTTP 409 Conflict returned; registration rejected. | `User.email` unique index |
| **AT-03** | Admin logs into admin dashboard | Login succeeds, token stored, redirected to Dashboard. | `authController.adminLogin` |
| **AT-04** | Non-admin attempts login to admin dashboard | HTTP 401 Unauthorized (`'Admin account not found'`). | `adminController` query `{ role: 'admin' }` |
| **AT-05** | Employee checks in within geofence radius | HTTP 201 Created; status `'present'` (if before 09:30) or `'late'` (if after 09:30). | `attendanceController.checkIn` |
| **AT-06** | Employee checks in outside geofence radius | HTTP 403 Forbidden with exact distance in message. Record not created. | `checkGeofence` rule |
| **AT-07** | Employee attempts 2nd check-in on same day | HTTP 409 Conflict (`'Attendance already marked for today'`). | `unique (user_id, date)` |
| **AT-08** | Employee checks out with > 4.0h working time | Check-out timestamp saved, `workingHours` accurately calculated, status remains `'present'` or `'late'`. | `attendanceController.checkOut` |
| **AT-09** | Employee checks out with < 4.0h working time | Status automatically converted to `'half-day'`. | `attendanceController.checkOut:117` |
| **AT-10** | Admin toggles employee status | User `isActive` flips to `false`; deactivated user immediately blocked from logging in. | `auth.js:25` & `adminController.toggleUserStatus` |
| **AT-11** | Admin exports Excel report for specific month | Valid `.xlsx` binary spreadsheet downloaded with all employee records for selected month. | `adminController.exportReport` |
| **AT-12** | Deactivated user attempts check-in | HTTP 403 Forbidden (`'Account is deactivated'`). | `auth.js` middleware |

---
*End of Audit Report.*

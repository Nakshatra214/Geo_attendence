# Legacy Express + MongoDB Backend — Preserved for Reference

> [!IMPORTANT]
> **This backend is preserved for reference only.**
> The active application backend has been completely migrated to **Supabase Auth + PostgreSQL** using Next.js 14 Route Handlers in **`next-admin/src/app/api/`**.

## Key Notes
1. The active GeoAttend (AttendX) system no longer requires MongoDB, `mongoose`, or this Express server.
2. The mobile Flutter application and admin dashboard connect directly to the Next.js API running on `http://localhost:3000/api` (or production Vercel URL).
3. Do not run `npm start` in this folder for production or active testing.

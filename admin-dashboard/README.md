# Legacy Admin Dashboard (React + Vite) — Preserved for Reference

> [!NOTE]
> **This application is preserved for reference.**
> The active, production-ready Admin Dashboard and Backend API has been migrated to **`next-admin/`** (powered by Next.js 14 App Router, Supabase Auth, and PostgreSQL).

## Compatibility & Proxy
If this Vite application is launched for testing (`npm run dev`), its proxy in `vite.config.js` forwards all `/api/*` calls to the **migrated Supabase-backed Next.js application** on `http://localhost:3000`.

## Active Dashboard
Please use `next-admin/`:
```bash
cd ../next-admin
npm install
npm run dev
```
Accessible at: [http://localhost:3000](http://localhost:3000)

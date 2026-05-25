# PGC College Management System — Complete Setup Guide

> **Purpose**: Step-by-step instructions to set up this entire project (Web Frontend, Mobile App, PHP Backend) on **any new laptop** with a **new Supabase PostgreSQL database**, without breaking or disturbing the database schema.

----

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Step 1: Create New Supabase Project](#2-step-1-create-new-supabase-project)
3. [Step 2: Run the Database Schema](#3-step-2-run-the-database-schema-critical)
4. [Step 3: Get Database Connection String](#4-step-3-get-database-connection-string)
5. [Step 4: Clone the Project](#5-step-4-clone-the-project)
6. [Step 5: Configure Environment Variables](#6-step-5-configure-environment-variables)
7. [Step 6: Setup PHP Backend](#7-step-6-setup-php-backend)
8. [Step 7: Setup Socket Bridge](#8-step-7-setup-socket-bridge)
9. [Step 8: Setup Web Frontend](#9-step-8-setup-web-frontend)
10. [Step 9: Setup Mobile App](#10-step-9-setup-mobile-app)
11. [Step 10: Verify Everything Works](#11-step-10-verify-everything-works)
12. [Troubleshooting](#12-troubleshooting)
13. [Important Warnings](#13-important-warnings)

---

## 1. Prerequisites

Install the following on the new laptop **before** starting:

| Software | Version | Download Link |
|----------|---------|---------------|
| **Git** | Latest | https://git-scm.com/download/win |
| **Node.js** | 18+ LTS | https://nodejs.org/ |
| **PHP** | 8.1+ | https://windows.php.net/download/ (VS16 x64 Non Thread Safe ZIP) |
| **Composer** | Latest | https://getcomposer.org/download/ (Composer-Setup.exe) |
| **VS Code** | Latest | https://code.visualstudio.com/ |

### PHP Setup on Windows (Important!)

1. Download **VS16 x64 Non Thread Safe** ZIP from https://windows.php.net/download/
2. Extract to `C:\php`
3. Rename `php.ini-development` → `php.ini`
4. Open `php.ini` and uncomment these lines (remove `;` at start):
   ```ini
   extension_dir = "ext"
   extension=curl
   extension=mbstring
   extension=openssl
   extension=pdo_pgsql
   extension=pgsql
   extension=fileinfo
   ```
5. Add `C:\php` to your Windows System **PATH**:
   - Search "Edit the system environment variables"
   - Click **Environment Variables** → under **System Variables** find `Path` → **Edit** → **New** → `C:\php` → **OK**
6. Restart terminal / VS Code
7. Verify: open PowerShell and run:
   ```powershell
   php -v
   composer -v
   ```

---

## 2. Step 1: Create New Supabase Project

1. Go to https://supabase.com/ and sign in with your friend's account.
2. Click **New Project**.
3. Choose an organization, enter a project name (e.g., `pgc-cms-new`), and set a strong database password.
4. Choose the **closest region** to your location for lowest latency.
5. Click **Create New Project** and wait (~2 minutes).

> **DO NOT create tables manually via the Table Editor.** The schema will be created via SQL script in the next step.

---

## 3. Step 2: Run the Database Schema (CRITICAL)

This is the **most important step**. The PHP backend does **NOT** auto-create tables. If tables don't exist, the API will crash.

1. In your Supabase dashboard, go to the **SQL Editor** (left sidebar).
2. Click **New Query**.
3. Open the file `database_schema.sql` from the project folder (or copy its entire contents).
4. Paste the SQL into the editor.
5. Click **Run**.
6. You should see green checkmarks for all 14 `CREATE TABLE` and index statements.

### What this script does:
- Creates all **14 tables** (users, user_roles, students, teachers, departments, courses, attendance, timetables, fees, complaints, notifications, degrees, fyp_groups, fyp_submissions)
- Sets up **Primary Keys** (UUID type), **Foreign Keys**, **Unique constraints**, **CHECK constraints**
- Creates all **performance indexes**
- Uses `IF NOT EXISTS` so running it again is safe (won't break anything)

### Verify tables exist:
In the SQL Editor, run:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
```
You should see all 14 table names.

---

## 4. Step 3: Get Database Connection String

1. In Supabase dashboard, go to **Project Settings** (gear icon at bottom left).
2. Click **Database**.
3. Under **Connection string**, select **URI**.
4. Copy the connection string. It looks like:
   ```
   postgresql://postgres.xxxxxxxxxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```
5. Save this somewhere — you need it in the `.env` file.

---

## 5. Step 4: Clone the Project

Open PowerShell / Terminal in the folder where you want the project:

```powershell
git clone https://github.com/Mahnoor-Akhtar/PGC_CLIENT_FINAL.git
cd PGC_CLIENT_FINAL
```

---

## 6. Step 5: Configure Environment Variables

### A. Backend PHP (`backend-php/.env`)

Create a new file `backend-php/.env`:

```env
JWT_SECRET=your_super_secure_random_string_here_change_this
DATABASE_URL=postgresql://postgres.xxxxxxxxxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

Replace `DATABASE_URL` with the connection string from Step 3.

### B. Backend Node (`backend/.env`)

Create a new file `backend/.env`:

```env
SOCKET_PORT=5001
```

### C. Frontend (`frontend/.env`)

Create a new file `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

If the PHP backend will run on a different IP (e.g., for mobile testing), use the PC's WiFi IP:
```env
VITE_API_URL=http://192.168.x.x:5000
```

### D. Mobile App (`MobileApp/src/services/api.ts`)

Edit `MobileApp/src/services/api.ts` and change the `API_URL` to your backend IP:

```typescript
const API_URL = 'http://192.168.x.x:5000'; // Your new laptop's WiFi IP
```

> To find your WiFi IP on Windows: open PowerShell → `ipconfig` → look for "Wireless LAN adapter" → IPv4 Address.

---

## 7. Step 6: Setup PHP Backend

Open PowerShell in `backend-php` folder:

```powershell
cd backend-php
composer install
```

This downloads Slim 4, Eloquent ORM, JWT library, Guzzle, and other dependencies into `vendor/`.

### Test Database Connection

```powershell
php check_teachers.php
```

If it prints a teacher count or "0 teachers found", your database connection is working.

### Start the PHP Server

```powershell
php -S localhost:5000 -t public
```

You should see: `Development server started on localhost:5000`

### Test the API

Open browser → `http://localhost:5000/health`

You should see:
```json
{"status":"healthy","timestamp":"..."}
```

---

## 8. Step 7: Setup Socket Bridge

Open a **second** PowerShell window in the `backend` folder:

```powershell
cd backend
npm install
node socket_bridge.js
```

You should see: `Socket Bridge Server is running on port 5001`

> Keep BOTH terminals running (PHP on 5000, Bridge on 5001).

---

## 9. Step 8: Setup Web Frontend

Open a **third** PowerShell window in the `frontend` folder:

```powershell
cd frontend
npm install
npm run dev
```

This installs React, Vite, TanStack, Tailwind, shadcn/ui, etc.

The dev server starts on `http://localhost:5173`

Open browser → `http://localhost:5173`

You should see the login page.

---

## 10. Step 9: Setup Mobile App

Open a **fourth** PowerShell window in the `MobileApp` folder:

```powershell
cd MobileApp
npm install
npx expo start
```

This installs Expo, React Native, Navigation, TanStack Query, etc.

A QR code appears. Scan it with the **Expo Go** app on your phone (download from Play Store / App Store).

> **Important**: Your phone must be on the **same WiFi network** as the laptop. The `API_URL` in `services/api.ts` must point to the laptop's WiFi IP.

---

## 11. Step 10: Verify Everything Works

### Test Checklist

| Test | How |
|------|-----|
| ✅ Backend running | `http://localhost:5000/health` returns JSON |
| ✅ Bridge running | `http://localhost:5001/health` returns `bridge healthy` |
| ✅ Frontend loads | `http://localhost:5173` shows login page |
| ✅ Register works | Create an account on the web → check Supabase Table Editor → `users` table should have new row |
| ✅ Login works | Login → redirects to Dashboard |
| ✅ CRUD works | Add a department → it appears in the list |
| ✅ Mobile connects | Expo Go app loads the login screen |
| ✅ Mobile login works | Login on phone → Dashboard appears |

---

## 12. Troubleshooting

### Problem: `php` or `composer` command not found
**Fix**: Check Step 1. `C:\php` must be in System PATH. Restart terminal after adding.

### Problem: `composer install` fails with memory error
**Fix**: Run `php -d memory_limit=-1 C:\php\composer.phar install`

### Problem: PHP server says "Connection refused" to Supabase
**Fix**: Check `DATABASE_URL` in `backend-php/.env`. Make sure:
- Password is correct (no special characters unescaped)
- Port is `5432`
- Hostname is exactly as shown in Supabase dashboard
- If password has `@` or `#`, URL-encode them: `@` → `%40`, `#` → `%23`

### Problem: Frontend shows "Cannot connect to backend"
**Fix**: Ensure PHP server is running on port 5000. Check `frontend/.env` has correct `VITE_API_URL`.

### Problem: Mobile app cannot login
**Fix**: Check `MobileApp/src/services/api.ts` → `API_URL` must be the laptop's **WiFi IP**, not `localhost`. Phone and laptop must be on same WiFi.

### Problem: "Table not found" or "relation does not exist" errors
**Fix**: You skipped Step 2! Go to Supabase SQL Editor and run `database_schema.sql`. Restart PHP server after.

### Problem: File upload fails
**Fix**: Create `backend-php/public/uploads/` folder. PHP needs write permissions. On Windows, this is automatic.

---

## 13. Important Warnings

### ⚠️ WARNING 1: NEVER let PHP "auto-create" the schema
The PHP backend uses Eloquent ORM but has **NO migration system** configured. It expects tables to already exist. If you run the backend before creating tables, it will crash with "relation does not exist" errors.

**Always run `database_schema.sql` FIRST.**

### ⚠️ WARNING 2: Do NOT modify the schema manually
Do NOT add/remove columns via Supabase Table Editor or SQL unless you also update the PHP Models (`backend-php/src/Models/*.php`). The `$fillable` array in each model lists the exact columns it expects. Mismatch = crashes.

### ⚠️ WARNING 3: Running `create_indexes.php` is safe
The index creation script uses `IF NOT EXISTS`, so running it multiple times won't break anything. Run it after Step 2:
```powershell
cd backend-php
php create_indexes.php
```

### ⚠️ WARNING 4: `.env` files are local
`.env` files contain secrets (database password, JWT secret). They are **gitignored** and will NOT be pushed to GitHub. Each laptop needs its own `.env` files.

### ⚠️ WARNING 5: UUID Primary Keys
All tables use **UUID** (not auto-increment integers) for primary keys. This is handled automatically by `BaseModel.php`. Do NOT change columns to `SERIAL` or `BIGSERIAL`.

### ⚠️ WARNING 6: Socket Bridge MUST be running
Without the bridge (port 5001), real-time notifications won't work, but the rest of the app will function normally. It is optional for basic setup.

---

## Quick Reference: File Locations

| File | Purpose |
|------|---------|
| `database_schema.sql` | Run this in Supabase SQL Editor FIRST |
| `backend-php/.env` | Database URL + JWT secret |
| `backend-php/public/index.php` | Main API entry point |
| `backend-php/src/Models/` | All 14 Eloquent models |
| `backend/.env` | Socket Bridge port config |
| `backend/socket_bridge.js` | Real-time notification bridge |
| `frontend/.env` | API base URL for web |
| `frontend/src/integrations/mern/client.ts` | Web API client |
| `MobileApp/src/services/api.ts` | Mobile API client + backend IP |

---

## One-Page Summary for Your Friend

1. Install Git, Node.js, PHP 8.1+, Composer
2. Create new Supabase project → copy `DATABASE_URL`
3. Run `database_schema.sql` in Supabase SQL Editor
4. Clone repo → create `.env` files (backend-php, backend, frontend)
5. `cd backend-php && composer install && php -S localhost:5000 -t public`
6. `cd backend && npm install && node socket_bridge.js`
7. `cd frontend && npm install && npm run dev`
8. `cd MobileApp && npm install && npx expo start`
9. Done! Open `localhost:5173` in browser and Expo Go on phone.

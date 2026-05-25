# FIX: Data Not Saving/Fetching on New System

## Problem
- App loads fine but data doesn't persist
- Sometimes stores, sometimes doesn't
- Works perfectly on original machine

## Most Likely Cause: Supabase RLS (Row Level Security)

Supabase now enables **RLS by default** on all new tables. Without policies, your PHP backend cannot read or write data even with correct credentials.

---

## Quick Fix (Run in Supabase SQL Editor)

Since your PHP backend already handles ALL authentication via JWT, you need to disable RLS on all tables so the backend can access them freely.

Run this SQL in your new Supabase project's **SQL Editor**:

```sql
-- Disable RLS on all CMS tables (PHP backend handles auth, not Supabase Auth)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE degrees DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE timetables DISABLE ROW LEVEL SECURITY;
ALTER TABLE fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE complaints DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE fyp_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE fyp_submissions DISABLE ROW LEVEL SECURITY;
```

After running this, **restart your PHP server** (`Ctrl+C` then `php -S localhost:5000 -t public`) and test again.

---

## Diagnostic Checklist (Check Each One)

### 1. Is RLS the problem?

In Supabase SQL Editor, run:
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
```

If any table appears in results → **RLS is ON** and blocking your backend.

### 2. Is your frontend hitting the RIGHT backend?

Open browser DevTools (F12) → **Network** tab → click a button that fetches data (e.g., Students page).

Look at the request URL. It should show:
```
http://localhost:5000/api/data/students
```

If it shows an old IP or `localhost:3000` etc. → your `.env` file is wrong.

### 3. Is the PHP backend connecting to the RIGHT database?

Open `backend-php/.env` and verify:
```env
DATABASE_URL=postgresql://postgres.xxxxxxxxxx:PASSWORD@aws-0-xxxxx.pooler.supabase.com:5432/postgres
JWT_SECRET=some_random_string
```

**Common mistakes:**
- Using YOUR old Supabase URL instead of the NEW one
- Password has special characters (`@`, `#`, `!`) that need URL encoding
- Missing `.env` file entirely (backend falls back to local defaults: `localhost:5432`, `postgres/postgres`)

### 4. Check backend error log

The PHP built-in server prints errors to the terminal. Look for:
```
SQLSTATE[42501]: insufficient_privilege
SQLSTATE[42P01]: undefined_table
SQLSTATE[08006]: connection_failed
```

If you see `insufficient_privilege` → **RLS is blocking you.**
If you see `connection_failed` → **DATABASE_URL is wrong.**
If you see `undefined_table` → **Schema was never created.**

### 5. Test with curl / browser

Open browser and go to:
```
http://localhost:5000/api/data/departments
```

- If you see `[]` or a JSON array → GET works
- If you see `401` → JWT/auth issue
- If you see `500` or connection error → backend or database issue

### 6. Test POST manually

Use this curl command in PowerShell to test if storing works:

```powershell
curl -X POST http://localhost:5000/api/data/departments `
  -H "Content-Type: application/json" `
  -d '{"name":"Test Dept","code":"TEST-101"}'
```

- If you get back the created record → POST works
- If you get `500` or empty response → database write is failing

---

## If None of the Above Work

### Check 7: JWT Secret Mismatch

If you registered on the old system, your token was signed with the OLD `JWT_SECRET`. The new system has a DIFFERENT `JWT_SECRET` in `.env`. Your old token will fail validation.

**Fix**: Log out and register a NEW account on the new system. The new account will get a token signed with the new secret.

### Check 8: Firewall / Port Issues

Make sure Windows Firewall isn't blocking port 5000:
```powershell
# Run as Administrator
netsh advfirewall firewall add rule name="PGC Backend" dir=in action=allow protocol=TCP localport=5000
```

### Check 9: Schema Mismatch

Compare the new database schema with the original. Run this on BOTH databases:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'students' 
ORDER BY ordinal_position;
```

If column names or types differ → the `database_schema.sql` file wasn't run, or a different version was run.

---

## Summary Table

| Symptom | Most Likely Cause | Fix |
|---------|-----------------|-----|
| App loads but empty lists | RLS blocking reads | Disable RLS on all tables |
| App loads but "Add" fails silently | RLS blocking writes | Disable RLS on all tables |
| `401 Unauthorized` on every request | Wrong JWT_SECRET | Log out, re-register with new secret |
| `500 Server Error` | Wrong DATABASE_URL or schema missing | Check `.env`, re-run `database_schema.sql` |
| `Connection refused` | PHP server not running | `php -S localhost:5000 -t public` |
| Works on web but not mobile | Mobile `API_URL` points to old IP | Update `MobileApp/src/services/api.ts` |

---

## After Fixing: Re-test Order

1. Run the RLS disable SQL above
2. Restart PHP server
3. Register a NEW account (don't use old token)
4. Add a department
5. Refresh the page — department should still be there
6. If yes → everything is now connected properly

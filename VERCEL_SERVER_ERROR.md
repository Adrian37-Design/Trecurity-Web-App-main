# Debugging Server Error on Vercel

## Current Error
**"Login Failed - Server Error"**

This means the backend API (`/api/auth/login`) is crashing.

## Most Likely Cause: Database Issue

### Problem
SQLite (`dev.db` file) doesn't work properly on Vercel because:
- Vercel's filesystem is **read-only**
- Database files can't persist between deployments
- SQLite can't write to the database

### How to Confirm
**Check Vercel Function Logs:**
1. Go to Vercel Dashboard
2. Your Project → Deployments → Latest
3. Click "Functions" tab
4. Look for errors like:
   - `SQLITE_READONLY`
   - `ENOENT: no such file`
   - `Database is locked`
   - `attempt to write a readonly database`

---

## Quick Fixes

### Option 1: Check Environment Variables (Quick Check)

Make sure these are set in Vercel:

1. **Vercel Dashboard → Settings → Environment Variables**
2. **Required Variables:**
   ```
   DATABASE_URL=file:./prisma/dev.db
   NUXT_PUBLIC_JWT_APP_TOKEN_SECRET=your_secret_from_.env
   NUXT_JWT_CONTROLLER_TOKEN_SECRET=your_secret_from_.env
   NUXT_PUBLIC_JWT_OTP_TOKEN_SECRET=your_secret_from_.env
   NODE_ENV=production
   ```

3. **Add them if missing**
4. **Redeploy** (Deployments → Click ⋮ → Redeploy)

### Option 2: Use Vercel Postgres (Recommended)

**Setup (5 minutes):**

1. **Vercel Dashboard → Storage → Create Database**
2. **Select Postgres** (free tier available)
3. **Copy DATABASE_URL** from Vercel
4. **Add to Environment Variables**
5. **Run migration locally:**
   ```powershell
   # Update .env with Vercel Postgres URL
   DATABASE_URL=postgresql://...
   
   # Run migration
   npx prisma migrate deploy
   ```
6. **Create your user in production database:**
   ```powershell
   # Run this script to create admin user
   # (I can help create this script)
   ```

### Option 3: Quick Test with Neon DB (Free PostgreSQL)

1. Go to https://neon.tech
2. Create free account
3. Create database
4. Copy connection string
5. Add to Vercel env vars as `DATABASE_URL`
6. Run `npx prisma migrate deploy`

---

## What You Need To Do Now

**Please check:**

1. **Vercel Function Logs** - what's the actual error?
   - Dashboard → Deployments → Functions tab
   - Screenshot or copy the error

2. **Environment Variables** - are they set?
   - Settings → Environment Variables
   - Tell me which ones are missing

3. **Choose database solution:**
   - Quick: Add env vars and hope SQLite works (unlikely)
   - Better: Set up Vercel Postgres (5 min)
   - Alternative: Use Neon DB (free PostgreSQL, 5 min)

Tell me what you see in the logs and I'll help fix it! 🔧

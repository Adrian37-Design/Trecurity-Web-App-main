# Debugging Vercel Deployment Login Issue

## Issue
Sign-in button clicks but doesn't redirect to OTP page - just reverts button state.

## Likely Causes

### 1. **Check Browser Console (F12)**
Look for errors like:
- `Failed to fetch`
- `500 Internal Server Error`
- `401 Unauthorized`
- CORS errors

### 2. **Check Vercel Logs**
1. Go to Vercel Dashboard
2. Click your project
3. Go to "Logs" or "Functions" tab
4. Look for errors when you click sign-in

### 3. **Environment Variables Missing**
Vercel needs these variables set:

**Required:**
```
DATABASE_URL=file:./prisma/dev.db
NUXT_PUBLIC_JWT_APP_TOKEN_SECRET=your_secret
NUXT_JWT_CONTROLLER_TOKEN_SECRET=your_controller_secret
NODE_ENV=production
```

**To add them:**
1. Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Add each variable
4. Redeploy

### 4. **Database Issue**
SQLite might not work on Vercel due to read-only filesystem.

**Quick Fix:**
Add this to your environment variables:
```
DATABASE_URL=file:./prisma/dev.db
```

**Better Fix:**
Use Vercel Postgres (free tier):
1. Storage → Create Database
2. Copy DATABASE_URL
3. Add to environment variables

## Quick Debugging Steps

### Step 1: Check What's Deployed
Visit: `https://your-app.vercel.app/api/health` (if you have a health endpoint)

### Step 2: Check Browser Console
1. Open deployed app
2. Press F12
3. Go to "Console" tab
4. Try sign-in again
5. **Tell me what errors you see**

### Step 3: Check Vercel Function Logs
1. Vercel Dashboard → Your Project
2. Deployments → Latest Deployment
3. Functions tab or Logs tab
4. **Look for errors around login time**

## Common Fixes

### Fix 1: Missing Environment Variables
```powershell
# Get your current env vars
cat .env

# Then add them to Vercel Dashboard
# Settings → Environment Variables
```

### Fix 2: Database Not Accessible
The `dev.db` file might not be in the deployment.

Check `vercel.json` or create one:
```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "nuxtjs"
}
```

### Fix 3: API Routes Not Working
Check if API is accessible:
Visit: `https://your-app.vercel.app/api/auth/login` (POST)

---

## What I Need From You

**To help debug, please tell me:**

1. **What URL are you accessing?**
   (Your Vercel deployment URL)

2. **What errors show in browser console (F12)?**
   (Screenshot or copy the error text)

3. **Did you add environment variables to Vercel?**
   (Go to Settings → Environment Variables)

4. **What do Vercel logs show?**
   (Dashboard → Deployments → Functions/Logs)

This will help me pinpoint the exact issue! 🔍

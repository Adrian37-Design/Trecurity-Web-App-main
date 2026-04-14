# Setting Up Production Database (Neon PostgreSQL)

## Why We Need This
- SQLite doesn't work on Vercel (read-only filesystem)
- Proper database = permanent deployment
- Free tier available
- Works with Vercel and Cloudflare Tunnel

## Step-by-Step Setup (10 minutes)

### 1. Create Neon Account
1. Go to: https://neon.tech
2. Sign up (free - no credit card required)
3. Create new project: "Trecurity"

### 2. Get Database Connection String
1. After project creation, you'll see a connection string
2. It looks like: `postgresql://user:password@host/database`
3. **Copy it!**

### 3. Update Local Environment
```powershell
# In your .env file, replace DATABASE_URL:
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
```

### 4. Run Database Migration
```powershell
npx prisma migrate deploy
```

### 5. Create Admin User
```powershell
npx ts-node seed.ts
```

### 6. Update Vercel Environment Variable
1. Vercel Dashboard → Settings → Environment Variables
2. Find `DATABASE_URL`
3. Update value to your Neon connection string
4. Click Save

### 7. Redeploy on Vercel
1. Deployments → Latest → ⋮ → Redeploy
2. Wait 1-2 minutes

### 8. Test Login
- Go to: https://trecurity.vercel.app
- Login: test@example.com / testpass123
- Should work!

---

## Alternative: Quick Commands

```powershell
# 1. Update .env with Neon URL
# DATABASE_URL="postgresql://..."

# 2. Run migration
npx prisma migrate deploy

# 3. Create test user
npx ts-node seed.ts

# 4. Update Vercel and redeploy
```

---

## Benefits
✅ Permanent data storage
✅ Works on Vercel
✅ Much faster than SQLite
✅ Production-ready
✅ Free tier: 0.5GB storage, 1 project

---

## Next Steps
1. Create Neon account
2. Copy connection string
3. Tell me when ready, and I'll help with migration!

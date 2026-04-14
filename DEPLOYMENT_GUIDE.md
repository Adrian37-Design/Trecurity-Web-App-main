# Contabo Production Deployment Guide

## ⚠️ CRITICAL: Create Backup First

### Step 1: SSH into Contabo Server

```bash
ssh root@your-contabo-server-ip
```

### Step 2: Create Database Backup

```bash
# Navigate to app directory
cd /path/to/trecurity-app

# Create backup directory
mkdir -p /root/backups

# Create backup (replace with your actual database name and user)
pg_dump -U postgres -F c -b -v -f /root/backups/trecurity_backup_$(date +%Y%m%d_%H%M%S).sql trecurity

# Verify backup was created
ls -lh /root/backups/
```

**Write down the backup file name!** You'll need it if rollback is required.

---

## Step 3: Push Code to GitHub

On your **local machine** (Windows):

```powershell
cd C:\Users\Takudzwa\Projects\Eugene\Trecurity-Web-App-main

# Add production remote (only needed first time)
git remote add production https://github.com/NetroZim/Trecurity-Web-App.git

# Push all commits
git push production main
```

If you get an error about divergent histories:
```powershell
git push production main --force
```

---

## Step 4: Deploy on Contabo Server

SSH into server (if not already connected):

```bash
ssh root@your-contabo-server-ip
cd /path/to/trecurity-app
```

### Pull Latest Code

```bash
# Stash any local changes (if any)
git stash

# Pull from GitHub
git pull origin main

# Or if you need to force:
git fetch origin
git reset --hard origin/main
```

### Install Dependencies

```bash
npm install
```

### Generate Prisma Client

```bash
npx prisma generate
```

---

## Step 5: Database Migration

### Create and Apply Migration

```bash
# This creates the migration and applies it
npx prisma migrate deploy
```

If you get errors, you may need to create the migration first:

```bash
npx prisma migrate dev --name add_multi_company_support
```

### Run Data Migration Script

This populates the new Many-to-Many relations from legacy data:

```bash
npx tsx scripts/force-sync-companies.ts
```

You shouldsee output like:
```
✅ Updated 4 users with company associations
```

### Verify Migration

```bash
# Check a specific user
npx tsx scripts/debug-specific-user.ts
```

---

## Step 6: Restart Application

The restart command depends on how your app is running:

### If using PM2:
```bash
pm2 restart trecurity
pm2 logs trecurity --lines 50
```

### If using systemd:
```bash
systemctl restart trecurity
systemctl status trecurity
journalctl -u trecurity -n 50 --no-pager
```

### If running manually:
```bash
# Kill existing process
pkill -f "node.*nuxt"

# Start in background
nohup npm run start &

# Or start in production mode
nohup node .output/server/index.mjs &
```

---

## Step 7: Verification

### Check Application Status

```bash
# Test if server is responding
curl http://localhost:3000/

# Check logs
pm2 logs trecurity
# or
tail -f /path/to/logs/app.log
```

### Browser Testing

1. Navigate to your production URL
2. Log in with a user account
3. **Check for Company Switcher dropdown** in the navbar
4. Click on the dropdown - you should see available companies
5. Switch between companies and verify page reloads correctly
6. **Verify vehicle data still displays** for selected company

### Database Verification

```bash
# Connect to database
psql -U postgres -d trecurity

# Check user-company associations
SELECT 
    u.email,
    u.approval_level,
    COUNT(DISTINCT cm.company_id) as managed_count,
    COUNT(DISTINCT cj.company_id) as joined_count
FROM "User" u
LEFT JOIN "_companies_managed" cm ON cm.user_id = u.id
LEFT JOIN "_companies_joined" cj ON cj.user_id = u.id
GROUP BY u.id, u.email, u.approval_level;

# Exit psql
\q
```

---

## Rollback (If Needed)

### Option 1: Restore Database Only

```bash
# Stop application
pm2 stop trecurity

# Restore from backup
pg_restore -U postgres -d trecurity -v /root/backups/trecurity_backup_TIMESTAMP.sql

# Restart application
pm2 restart trecurity
```

### Option 2: Revert Code and Database

```bash
# Revert code
git revert HEAD~20..HEAD
git push origin main --force

# Restore database (as above)

# Restart app
pm2 restart trecurity
```

---

## Troubleshooting

### Build Errors

```bash
# Clear cache and rebuild
rm -rf .output node_modules .nuxt
npm install
npm run build
```

### Database Connection Errors

Check `.env` file has correct `DATABASE_URL`:
```bash
cat .env | grep DATABASE_URL
```

### Migration Errors

If migration fails with "relation already exists":
```bash
# Mark migration as applied without running it
npx prisma migrate resolve --applied add_multi_company_support
```

---

## Post-Deployment Checklist

- [ ] Application is running without errors
- [ ] Users can log in successfully
- [ ] Company switcher appears for multi-company users
- [ ] Company switching works correctly
- [ ] Vehicle monitoring data displays correctly
- [ ] Real-time updates still working
- [ ] Create a NEW backup of the updated database
- [ ] Monitor logs for next 24 hours

---

## Support Commands

### Check Running Processes
```bash
ps aux | grep node
```

### Check Port Usage
```bash
netstat -tulpn | grep :3000
```

### View Last 100 Lines of Logs
```bash
pm2 logs trecurity --lines 100
```

### Database Stats
```bash
psql -U postgres -d trecurity -c "SELECT COUNT(*) FROM \"User\";"
psql -U postgres -d trecurity -c "SELECT COUNT(*) FROM \"Company\";"
```

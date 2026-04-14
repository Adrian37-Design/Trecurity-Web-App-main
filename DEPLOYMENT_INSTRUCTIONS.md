# Trecurity Deployment Guide for Contabo Server

This guide provides step-by-step instructions for deploying the Trecurity web application to your Contabo server.

---

## Prerequisites

- Contabo server with Ubuntu/Debian OS
- SSH access to the server (root or sudo user)
- Domain `trecurity.com` DNS pointing to server IP
- MySQL database credentials: `root` / `AP4e5ES2KHV3`

---

## Deployment Options

Choose one of the following deployment methods:

### Option A: Fresh Server Setup (Recommended for new servers)
### Option B: Existing Server with Dependencies Already Installed

---

## Option A: Fresh Server Setup

### Step 1: Upload Files to Server

On your **local machine**, upload the project files to the Contabo server:

```bash
# Using SCP
scp -r "C:\Users\Takudzwa\Projects\Eugene\Trecurity-Web-App-main-main\Trecurity-Web-App-main-main" root@173.212.196.228:/var/www/trecurity
```

### Step 2: SSH into Server

```bash
ssh root@173.212.196.228
```

### Step 3: Run Server Setup Script

This script installs Node.js, PM2, MySQL, Nginx, and configures the firewall.

```bash
cd /var/www/trecurity
chmod +x server-setup.sh
sudo bash server-setup.sh
```

**What this does:**
- Updates system packages
- Installs Node.js v20 LTS
- Installs PM2 globally
- Installs and configures MySQL
- Installs Nginx
- Configures firewall (UFW)
- Creates application directory

### Step 4: Run Deployment Script

```bash
cd /var/www/trecurity
chmod +x deploy.sh pre-deploy-checklist.sh
bash deploy.sh
```

**What this does:**
- Checks prerequisites
- Installs npm dependencies
- Generates Prisma client
- Runs database migrations
- Builds the Nuxt application
- Starts the app with PM2

### Step 5: Configure Nginx Reverse Proxy

```bash
# Copy Nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/trecurity
sudo ln -s /etc/nginx/sites-available/trecurity /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# If test passes, restart Nginx
sudo systemctl restart nginx
```

### Step 6: Install SSL Certificate (HTTPS)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d trecurity.com -d www.trecurity.com

# Follow the prompts and agree to terms
```

Certbot will automatically configure SSL in your Nginx config.

---

## Option B: Existing Server with Dependencies

If your server already has Node.js, PM2, MySQL, and Nginx installed:

### Step 1: Upload Files

```bash
scp -r "C:\Users\Takudzwa\Projects\Eugene\Trecurity-Web-App-main-main\Trecurity-Web-App-main-main" root@YOUR_SERVER_IP:/var/www/trecurity
```

### Step 2: SSH and Deploy

```bash
ssh root@YOUR_SERVER_IP
cd /var/www/trecurity
chmod +x deploy.sh pre-deploy-checklist.sh
bash deploy.sh
```

### Step 3: Configure Nginx (if not already done)

Follow Step 5 and 6 from Option A.

---

## Verification

### 1. Check Application Status

```bash
pm2 status
pm2 logs Trecurity --lines 50
```

Expected output: `Trecurity` process should show `online` status.

### 2. Test Local Connectivity

```bash
curl http://localhost:3000/
```

Should return HTML content.

### 3. Test External Access

Open your browser and navigate to:
- `http://YOUR_SERVER_IP:3000` (if firewall allows)
- `https://trecurity.com` (if Nginx and SSL configured)

### 4. Verify Database

```bash
mysql -u root -p
# Enter password: AP4e5ES2KHV3

USE trecurity;
SHOW TABLES;
exit;
```

Should show Prisma tables created by migrations.

---

## Common PM2 Commands

```bash
# View logs
pm2 logs Trecurity

# View logs (last 100 lines)
pm2 logs Trecurity --lines 100

# Restart application
pm2 restart Trecurity

# Stop application
pm2 stop Trecurity

# Delete process from PM2
pm2 delete Trecurity

# Monitor resources
pm2 monit

# Save PM2 process list
pm2 save

# List all processes
pm2 list
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check detailed logs
pm2 logs Trecurity --err --lines 100

# Common issues:
# 1. Database connection - verify DATABASE_URL in .env.production
# 2. Missing environment variables - check ecosystem.config.cjs
# 3. Port already in use - check with: netstat -tulpn | grep :3000
```

### Database Connection Errors

```bash
# Test MySQL connection
mysql -u root -p -h localhost

# Verify database exists
mysql -u root -p -e "SHOW DATABASES;"

# Check Prisma migrations
npx prisma migrate status
```

### Nginx Errors

```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# View Nginx error logs
sudo tail -f /var/log/nginx/trecurity-error.log
```

### Port 3000 Already in Use

```bash
# Find process using port
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Restart application
pm2 restart Trecurity
```

---

## Environment Variables Reference

All environment variables are configured in:
- `ecosystem.config.cjs` (PM2 configuration)
- `.env.production` (backup/build-time variables)

| Variable | Value | Purpose |
|----------|-------|---------|
| DATABASE_URL | mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity | Database connection |
| NUXT_JWT_APP_TOKEN_SECRET | TrecuritySuperSecretKey2026_Secure! | JWT signing for app tokens |
| NUXT_JWT_CONTROLLER_TOKEN_SECRET | TrecuritySuperSecretKey2026_Secure! | JWT signing for controller tokens |
| NUXT_PUBLIC_SITE_URL | https://trecurity.com | Public site URL |
| NUXT_RECAPTCHA_SERVER_SITE_KEY | 6LfB-UMsAAAAAGyOaN-OEH4SuoJ2mwiJeAq_7uaK | reCAPTCHA server key |
| SMTP_USERNAME | info@trecurity.com | Email sender address |
| SMTP_PASSWORD | %Gj6R8sKAdKXqeE | Email password |

---

## Updating the Application

When you need to deploy updates:

```bash
# SSH into server
ssh root@YOUR_SERVER_IP
cd /var/www/trecurity

# Pull latest code (if using Git)
git pull origin main

# OR upload new files via SCP/rsync
# Then run deployment script
bash deploy.sh
```

---

## Rollback Procedure

If deployment fails:

```bash
# Stop current process
pm2 stop Trecurity

# Restore from backup (if you created one)
# OR revert to previous Git commit
git reset --hard HEAD~1

# Rebuild and restart
npm run build
pm2 restart Trecurity
```

---

## Monitoring & Logs

### Real-time Monitoring

```bash
pm2 monit
```

### Application Logs

```bash
# Follow logs in real-time
pm2 logs Trecurity --raw

# View last 200 lines
pm2 logs Trecurity --lines 200 --nostream
```

### System Resources

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top
```

---

## Security Checklist

- [ ] UFW firewall is enabled and configured
- [ ] SSL certificate is installed and valid
- [ ] MySQL is not accessible from outside (only localhost)
- [ ] Strong passwords are set for all services
- [ ] SSH key authentication is enabled (optional but recommended)
- [ ] Regular backups are configured
- [ ] PM2 is set to start on boot: `pm2 startup`

---

## Support

For issues or questions:
1. Check application logs: `pm2 logs Trecurity`
2. Check Nginx logs: `/var/log/nginx/trecurity-error.log`
3. Verify environment variables in `ecosystem.config.cjs`
4. Ensure database is accessible: `mysql -u root -p`

---

## Quick Reference

| Task | Command |
|------|---------|
| Deploy application | `bash deploy.sh` |
| Check status | `pm2 status` |
| View logs | `pm2 logs Trecurity` |
| Restart app | `pm2 restart Trecurity` |
| Stop app | `pm2 stop Trecurity` |
| Monitor resources | `pm2 monit` |
| Test Nginx | `sudo nginx -t` |
| Restart Nginx | `sudo systemctl restart nginx` |
| Check database | `mysql -u root -p` |

---

**Deployment Complete!** 🎉

Your Trecurity application should now be running at `https://trecurity.com`
